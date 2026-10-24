import pytest

from tests.conftest import bearer, sign_up

ONBOARDING = "/api/v1/providers/me/onboarding"
SKILLS = "/api/v1/providers/me/skills"
SETUP = "/api/v1/providers/me/service-setup"

THREE_SKILLS = [
    {"skill_id": "plumbing-tap-leak", "proficiency": "expert", "years_experience": 6},
    {"skill_id": "plumbing-pipe", "proficiency": "intermediate"},
    {"skill_id": "electrical-wiring", "proficiency": "beginner"},
]
SERVICE_SETUP = {
    "availability": [
        {"day": 0, "start": "09:00", "end": "18:00"},
        {"day": 5, "start": "10:00", "end": "14:00"},
    ],
    "service_area": {"latitude": 12.9352, "longitude": 77.6245, "pincode": "560034", "area_name": "Koramangala"},
    "radius_km": 10,
}


@pytest.fixture
def provider_token(client, email_client) -> str:
    return sign_up(client, email_client, role="provider", email="ravi@example.com", phone="9123456780")["access_token"]


def test_catalog_is_public_and_grouped(client):
    response = client.get("/api/v1/catalog/skills")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "public, max-age=300"
    plumbing = response.json()[0]
    assert plumbing["id"] == "plumbing"
    assert [skill["id"] for skill in plumbing["skills"]] == ["plumbing-tap-leak", "plumbing-pipe", "plumbing-tank"]


def test_full_onboarding(client, provider_token):
    headers = bearer(provider_token)
    initial = client.get(ONBOARDING, headers=headers).json()
    assert initial == {"status": "skills", "skills": [], "availability": [], "service_area": None}

    after_skills = client.put(SKILLS, json={"skills": THREE_SKILLS}, headers=headers)
    assert after_skills.status_code == 200
    assert after_skills.json()["status"] == "service_setup"
    assert client.get("/api/v1/auth/me", headers=headers).json()["onboarding_status"] == "service_setup"

    done = client.put(SETUP, json=SERVICE_SETUP, headers=headers)
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "complete"
    assert body["availability"] == [
        {"day": 0, "start": "09:00:00", "end": "18:00:00"},
        {"day": 5, "start": "10:00:00", "end": "14:00:00"},
    ]
    assert body["service_area"] == {
        "latitude": 12.9352, "longitude": 77.6245, "pincode": "560034", "area_name": "Koramangala", "radius_km": 10,
    }
    skill = next(item for item in body["skills"] if item["skill_id"] == "plumbing-tap-leak")
    assert skill == {
        "skill_id": "plumbing-tap-leak", "skill_name": "Tap & leak repair", "category_id": "plumbing",
        "proficiency": "expert", "years_experience": 6,
    }


def test_editing_skills_after_completion_keeps_status(client, provider_token):
    headers = bearer(provider_token)
    client.put(SKILLS, json={"skills": THREE_SKILLS}, headers=headers)
    client.put(SETUP, json=SERVICE_SETUP, headers=headers)

    # Keeps one existing skill (with a new level) and swaps the others.
    updated = [
        {"skill_id": "plumbing-tap-leak", "proficiency": "intermediate"},
        {"skill_id": "plumbing-tank", "proficiency": "expert"},
        {"skill_id": "electrical-wiring", "proficiency": "expert"},
    ]
    response = client.put(SKILLS, json={"skills": updated}, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "complete"
    assert {item["skill_id"]: item["proficiency"] for item in body["skills"]} == {
        "plumbing-tap-leak": "intermediate", "plumbing-tank": "expert", "electrical-wiring": "expert",
    }


def test_service_setup_needs_skills_first(client, provider_token):
    response = client.put(SETUP, json=SERVICE_SETUP, headers=bearer(provider_token))
    assert response.status_code == 409


@pytest.mark.parametrize("skills", [
    THREE_SKILLS[:2],
    THREE_SKILLS[:2] + [THREE_SKILLS[0]],
    THREE_SKILLS[:2] + [{"skill_id": "plumbing-tank", "proficiency": "guru"}],
])
def test_invalid_skill_lists(client, provider_token, skills):
    assert client.put(SKILLS, json={"skills": skills}, headers=bearer(provider_token)).status_code == 422


def test_unknown_skill(client, provider_token):
    skills = THREE_SKILLS[:2] + [{"skill_id": "rocket-science", "proficiency": "expert"}]
    response = client.put(SKILLS, json={"skills": skills}, headers=bearer(provider_token))
    assert response.status_code == 422
    assert response.json()["detail"] == "Unknown skill: rocket-science"


@pytest.mark.parametrize("change", [
    {"availability": [{"day": 0, "start": "18:00", "end": "09:00"}]},
    {"availability": [{"day": 0, "start": "09:00", "end": "18:00"}, {"day": 0, "start": "10:00", "end": "12:00"}]},
    {"availability": [{"day": 7, "start": "09:00", "end": "18:00"}]},
    {"availability": []},
    {"radius_km": 0},
    {"radius_km": 51},
    {"service_area": {"latitude": 12.9, "pincode": "560034", "area_name": "Koramangala"}},
    {"service_area": {"pincode": "060034", "area_name": "Koramangala"}},
    {"service_area": {"pincode": "560034", "area_name": " "}},
])
def test_invalid_service_setup(client, provider_token, change):
    headers = bearer(provider_token)
    client.put(SKILLS, json={"skills": THREE_SKILLS}, headers=headers)
    assert client.put(SETUP, json=SERVICE_SETUP | change, headers=headers).status_code == 422


def test_pincode_without_location_is_allowed(client, provider_token):
    headers = bearer(provider_token)
    client.put(SKILLS, json={"skills": THREE_SKILLS}, headers=headers)
    payload = SERVICE_SETUP | {"service_area": {"pincode": "560034", "area_name": "Koramangala"}}
    response = client.put(SETUP, json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["service_area"]["latitude"] is None


def test_only_providers_can_onboard(client, email_client):
    customer_token = sign_up(client, email_client)["access_token"]
    assert client.get(ONBOARDING, headers=bearer(customer_token)).status_code == 403
    assert client.get(ONBOARDING).status_code == 401
