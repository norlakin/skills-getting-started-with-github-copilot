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
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to avoid duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participants = details.participants || [];

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

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

            const nameSpan = document.createElement('span');
            nameSpan.className = 'participant-name';
            nameSpan.textContent = name || (typeof p === 'string' ? p : '');

            li.appendChild(avatarDiv);
            li.appendChild(nameSpan);
            ul.appendChild(li);
          });
        }

        participantsSection.appendChild(participantsHeading);
        participantsSection.appendChild(ul);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
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
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
