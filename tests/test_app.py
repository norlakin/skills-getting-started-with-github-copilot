import pytest
from fastapi.testclient import TestClient
from src.app import app, activities
import copy

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory activities dict before/after each test so tests are isolated."""
    original = copy.deepcopy(activities)
    try:
        yield
    finally:
        activities.clear()
        activities.update(copy.deepcopy(original))


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_duplicate():
    email = "tester@mergington.edu"

    # Sign up should succeed
    r = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Duplicate signup should fail
    r2 = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r2.status_code == 400


def test_unregister_participant():
    email = "tester2@mergington.edu"

    # Ensure participant can be added
    r = client.post(f"/activities/Tennis%20Club/signup?email={email}")
    assert r.status_code == 200

    # Now remove them
    r2 = client.delete(f"/activities/Tennis%20Club/participants?email={email}")
    assert r2.status_code == 200
    assert "Removed" in r2.json().get("message", "")

    # Removing again should return 404
    r3 = client.delete(f"/activities/Tennis%20Club/participants?email={email}")
    assert r3.status_code == 404


def test_signup_nonexistent_activity():
    r = client.post("/activities/NoSuchActivity/signup?email=foo@bar.com")
    assert r.status_code == 404


def test_root_redirect():
    # Root should redirect to the static index and the static file should be served
    r = client.get("/", follow_redirects=True)
    assert r.status_code == 200
    assert "Mergington High School" in r.text


def test_unregister_nonexistent_activity():
    # Attempting to remove a participant from a missing activity should 404
    r = client.delete("/activities/NonexistentActivity/participants?email=foo@bar.com")
    assert r.status_code == 404
