document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML to prevent XSS
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([activityName, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participants = details.participants || [];

        activityCard.innerHTML = `
          <h4>${escapeHtml(activityName)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
        `;

        // Mark activity name on the card for easy lookup
        activityCard.dataset.activityName = activityName;

        // Small inline spinner (hidden by default)
        const spinnerWrapper = document.createElement('div');
        spinnerWrapper.className = 'activity-spinner hidden';
        spinnerWrapper.innerHTML = '<div class="spinner" aria-hidden="true"></div>';
        activityCard.appendChild(spinnerWrapper);

        // Subtle overlay shown while the card is loading (hidden by default)
        const overlay = document.createElement('div');
        overlay.className = 'activity-overlay hidden';
        activityCard.appendChild(overlay);

        // Create participants section with avatars
        const participantsSection = document.createElement('div');
        participantsSection.className = 'participants-section';

        const participantsHeading = document.createElement('h5');
        participantsHeading.textContent = 'Participants';

        const ul = document.createElement('ul');
        ul.className = 'participants-list';

        // Helpers for initials and avatar color
        function getInitials(text) {
          if (!text) return '';
          const parts = text.trim().split(/\s+/);
          const first = parts[0] || '';
          const last = parts.length > 1 ? parts[parts.length - 1] : '';
          const initials = (first[0] || '') + (last[0] || first[1] || '');
          return initials.toUpperCase();
        }

        function getAvatarColor(text) {
          const colors = ['#ffd54f','#ff8a65','#4fc3f7','#aed581','#ba68c8','#90a4ae','#ffb74d'];
          let h = 0;
          for (let i = 0; i < text.length; i++) h = (h << 5) - h + text.charCodeAt(i);
          return colors[Math.abs(h) % colors.length];
        }

        if (participants.length === 0) {
          const li = document.createElement('li');
          li.className = 'no-participants';
          li.textContent = 'No participants yet';
          ul.appendChild(li);
        } else {
          participants.forEach(p => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            let name = '';
            let avatarUrl = '';
            if (typeof p === 'string') {
              name = p;
            } else if (p && typeof p === 'object') {
              name = p.name || p.email || '';
              avatarUrl = p.avatar || p.avatar_url || '';
            }

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';

            const safeAvatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
            if (
              safeAvatarUrl &&
              (safeAvatarUrl.startsWith('http://') || safeAvatarUrl.startsWith('https://') || safeAvatarUrl.startsWith('data:image/'))
            ) {
              const img = document.createElement('img');
              img.src = safeAvatarUrl;
              img.alt = escapeHtml(name) || 'avatar';
              avatarDiv.appendChild(img);
            } else {
              const initials = getInitials(name || (typeof p === 'string' ? p : '')) || '?';
              const span = document.createElement('span');
              span.className = 'avatar-initials';
              span.textContent = initials;
              avatarDiv.style.backgroundColor = getAvatarColor(name || '');
              avatarDiv.appendChild(span);
            }

            // Build left side (avatar + name)
            const leftGroup = document.createElement('div');
            leftGroup.style.display = 'flex';
            leftGroup.style.alignItems = 'center';
            leftGroup.style.gap = '10px';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'participant-name';
            nameSpan.textContent = name || (typeof p === 'string' ? p : '');

            leftGroup.appendChild(avatarDiv);
            leftGroup.appendChild(nameSpan);

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'participant-delete';
            deleteBtn.setAttribute('aria-label', `Unregister ${typeof p === 'string' ? p : (p.email || p.name || '')}`);
            deleteBtn.title = `Unregister ${typeof p === 'string' ? p : (p.email || p.name || '')}`;
            deleteBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

            deleteBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              const participantEmail = typeof p === 'string' ? p : (p.email || p.name || '');
              if (!participantEmail) {
                messageDiv.textContent = 'Cannot determine participant email';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
                return;
              }

              if (!confirm(`Remove ${participantEmail} from ${activityName}?`)) return;

              try {
                // Show spinner and overlay on this activity card
                const activityCard = li.closest('.activity-card');
                const activitySpinner = activityCard && activityCard.querySelector('.activity-spinner');
                const activityOverlay = activityCard && activityCard.querySelector('.activity-overlay');
                if (activitySpinner) activitySpinner.classList.remove('hidden');
                if (activityOverlay) activityOverlay.classList.remove('hidden');

                const res = await fetch(
                  `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(participantEmail)}`,
                  { method: 'DELETE', cache: 'no-store' }
                );

                if (res.ok) {
                  // Refresh activities to reflect changes
                  await fetchActivities();
                  messageDiv.textContent = `${participantEmail} removed from ${activityName}`;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 3000);
                } else {
                  const json = await res.json().catch(() => ({}));
                  // Hide spinner and overlay on failure (card remains until refreshed)
                  if (activitySpinner) activitySpinner.classList.add('hidden');
                  if (activityOverlay) activityOverlay.classList.add('hidden');
                  messageDiv.textContent = json.detail || json.message || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 3000);
                }
              } catch (err) {
                console.error('Error removing participant:', err);
                // Hide spinner and overlay on error
                const activityCard = li.closest('.activity-card');
                const activitySpinner = activityCard && activityCard.querySelector('.activity-spinner');
                const activityOverlay = activityCard && activityCard.querySelector('.activity-overlay');
                if (activitySpinner) activitySpinner.classList.add('hidden');
                if (activityOverlay) activityOverlay.classList.add('hidden');

                messageDiv.textContent = 'Failed to remove participant. Please try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
              }
            });

            li.appendChild(leftGroup);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
          });
        }

        participantsSection.appendChild(participantsHeading);
        participantsSection.appendChild(ul);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = activityName;
        option.textContent = activityName;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          cache: "no-store"
        }
      );

      const result = await response.json();

      // Find the activity card and show spinner + overlay while signing up
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const activityCard = Array.from(document.querySelectorAll('.activity-card')).find(c => c.dataset.activityName === activity);
      const activitySpinner = activityCard && activityCard.querySelector('.activity-spinner');
      const activityOverlay = activityCard && activityCard.querySelector('.activity-overlay');
      if (activitySpinner) activitySpinner.classList.remove('hidden');
      if (activityOverlay) activityOverlay.classList.remove('hidden');
      if (submitBtn) submitBtn.disabled = true;

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh list to show new participant
        fetchActivities();
      } else {
        // Hide spinner/overlay and re-enable submit
        if (activitySpinner) activitySpinner.classList.add('hidden');
        if (activityOverlay) activityOverlay.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      // Hide spinner/overlay and re-enable submit on error
      const activityCard = Array.from(document.querySelectorAll('.activity-card')).find(c => c.dataset.activityName === activity);
      const activitySpinner = activityCard && activityCard.querySelector('.activity-spinner');
      const activityOverlay = activityCard && activityCard.querySelector('.activity-overlay');
      if (activitySpinner) activitySpinner.classList.add('hidden');
      if (activityOverlay) activityOverlay.classList.add('hidden');
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;

      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
