import pytest
from sqlalchemy.orm import Session

from app.modules.auth.model import AuthUser
from app.modules.auth.service import AuthService
from tests.conftest import PASSWORD, bearer, sign_up

REGISTER = "/api/v1/auth/register"
LOGIN = "/api/v1/auth/login"
GOOGLE = "/api/v1/auth/google"
FORGOT = "/api/v1/auth/forgot-password"
RESET = "/api/v1/auth/reset-password"
ME = "/api/v1/auth/me"
NEW_PASSWORD = "n3w-secret-pass"


def _signup_body(**changes: str) -> dict[str, str]:
    body = {"name": "Asha Kumar", "email": "asha@example.com", "phone": "9876543210", "role": "customer",
            "password": PASSWORD}
    return body | changes


def _login(client, *, email="asha@example.com", password=PASSWORD, role: str | None = "customer"):
    body = {"email": email, "password": password}
    if role is not None:
        body["role"] = role
    return client.post(LOGIN, json=body)


def _reset(client, email_client, *, email="asha@example.com", new_password=NEW_PASSWORD):
    assert client.post(FORGOT, json={"email": email}).status_code == 202
    return client.post(RESET, json={"email": email, "otp": email_client.last_code(email), "new_password": new_password})


# ── Sign-up ──────────────────────────────────────────────────────────────────


def test_customer_sign_up_signs_in_without_an_email_code(client, email_client):
    session = sign_up(client, email="Asha@Example.com")

    assert session["token_type"] == "bearer"
    assert session["user"] | {"id": None} == {
        "id": None, "email": "asha@example.com", "name": "Asha Kumar", "phone": "+919876543210",
        "role": "customer", "avatar_url": None, "onboarding_status": None,
        "favorite_skill_ids": [], "favorites_prompt_open": True,
    }
    me = client.get(ME, headers=bearer(session["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "asha@example.com"
    assert email_client.sent == []


def test_provider_sign_up_starts_onboarding(client):
    session = sign_up(client, role="provider", email="ravi@example.com", phone="9123456780")
    assert session["user"]["role"] == "provider"
    assert session["user"]["onboarding_status"] == "skills"


def test_email_can_only_be_registered_once(client):
    sign_up(client)
    response = client.post(REGISTER, json=_signup_body(phone="9000000000", role="provider", password="other-pass"))
    assert response.status_code == 409
    # The existing account is untouched
    assert _login(client).status_code == 200


def test_mobile_number_can_only_be_registered_once(client):
    sign_up(client, phone="9876543210")
    response = client.post(REGISTER, json=_signup_body(email="other@example.com"))
    assert response.status_code == 409
    assert "mobile number" in response.json()["detail"]


def test_sign_up_needs_a_password_of_at_least_8_characters(client):
    without_password = _signup_body()
    del without_password["password"]
    assert client.post(REGISTER, json=without_password).status_code == 422
    assert client.post(REGISTER, json=_signup_body(password="short")).status_code == 422


def test_invalid_sign_up_input_is_rejected(client):
    assert client.post(REGISTER, json=_signup_body(phone="12345")).status_code == 422
    assert client.post(REGISTER, json=_signup_body(role="admin")).status_code == 422
    assert client.post(REGISTER, json=_signup_body(email="not-an-email")).status_code == 422


def test_email_code_login_is_gone(client):
    for path in ("/api/v1/auth/otp/start", "/api/v1/auth/verify-otp", "/api/v1/auth/otp/resend"):
        assert client.post(path, json={}).status_code == 404


# ── Log in ───────────────────────────────────────────────────────────────────


def test_customers_and_providers_log_in_with_their_password(client):
    sign_up(client)
    sign_up(client, role="provider", email="ravi@example.com", phone="9123456780")

    customer = _login(client, email="Asha@Example.com")
    assert customer.status_code == 200
    assert customer.json()["user"]["role"] == "customer"

    provider = _login(client, email="ravi@example.com", role="provider")
    assert provider.status_code == 200
    assert provider.json()["user"]["onboarding_status"] == "skills"
    assert client.get(ME, headers=bearer(provider.json()["access_token"])).status_code == 200


def test_wrong_password_or_unknown_email_is_rejected(client):
    sign_up(client)
    assert _login(client, password="not-my-pass").status_code == 401
    assert _login(client, email="nobody@example.com").status_code == 401


def test_other_role_is_sent_to_its_own_login(client):
    sign_up(client, role="provider", email="ravi@example.com", phone="9123456780")
    sign_up(client)

    on_customer_page = _login(client, email="ravi@example.com", role="customer")
    assert on_customer_page.status_code == 409
    assert "professional" in on_customer_page.json()["detail"]
    assert _login(client, role="provider").status_code == 409
    # Without the right password nothing about the account is revealed
    assert _login(client, email="ravi@example.com", password="not-my-pass", role="customer").status_code == 401


def test_disabled_account_cannot_log_in(client, engine):
    sign_up(client)
    with Session(engine) as db:
        db.query(AuthUser).filter_by(email="asha@example.com").one().is_active = False
        db.commit()
    assert _login(client).status_code == 403


def test_admin_logs_in_without_a_role(client, email_client, engine):
    with Session(engine) as db:
        AuthService(email_client=email_client).create_admin(db, email="admin@helpio.in", password=PASSWORD, name="Admin")

    response = _login(client, email="admin@helpio.in", role=None)
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"
    assert client.post("/api/v1/auth/signup", json={}).status_code == 404


# ── Google ───────────────────────────────────────────────────────────────────


def test_google_creates_customer_and_phone_is_added_later(client, google):
    google.tokens["good"] = {
        "sub": "g-1", "email": "Meera@Gmail.com", "email_verified": True,
        "name": "Meera Iyer", "picture": "https://example.com/meera.png",
    }
    session = client.post(GOOGLE, json={"id_token": "good"}).json()
    assert session["user"]["email"] == "meera@gmail.com"
    assert session["user"]["name"] == "Meera Iyer"
    assert session["user"]["phone"] is None

    response = client.patch(ME, json={"phone": "9988776655"}, headers=bearer(session["access_token"]))
    assert response.status_code == 200
    assert response.json()["phone"] == "+919988776655"
    assert client.patch(ME, json={}, headers=bearer(session["access_token"])).status_code == 422

    again = client.post(GOOGLE, json={"id_token": "good"}).json()
    assert again["user"]["id"] == session["user"]["id"]


def test_google_cannot_take_a_registered_mobile_number(client, google):
    sign_up(client, phone="9876543210")
    google.tokens["meera"] = {"sub": "g-1", "email": "meera@gmail.com", "email_verified": True}
    token = client.post(GOOGLE, json={"id_token": "meera"}).json()["access_token"]

    response = client.patch(ME, json={"phone": "9876543210"}, headers=bearer(token))
    assert response.status_code == 409


def test_google_rejects_bad_tokens_and_provider_emails(client, google):
    assert client.post(GOOGLE, json={"id_token": "forged"}).status_code == 401

    sign_up(client, role="provider", email="ravi@example.com", phone="9123456780")
    google.tokens["ravi"] = {"sub": "g-2", "email": "ravi@example.com", "email_verified": True}
    assert client.post(GOOGLE, json={"id_token": "ravi"}).status_code == 409


def test_google_takes_back_an_email_someone_else_registered(client, google):
    squatter = sign_up(client, email="meera@gmail.com")
    google.tokens["meera"] = {"sub": "g-3", "email": "meera@gmail.com", "email_verified": True, "name": "Meera Iyer"}

    owner = client.post(GOOGLE, json={"id_token": "meera"})
    assert owner.status_code == 200
    assert client.get(ME, headers=bearer(owner.json()["access_token"])).status_code == 200
    # The unproven password and every session created with it stop working
    assert _login(client, email="meera@gmail.com").status_code == 401
    assert client.get(ME, headers=bearer(squatter["access_token"])).status_code == 401


def test_google_keeps_the_password_of_a_proven_email(client, email_client, google):
    sign_up(client, email="meera@gmail.com")
    assert _reset(client, email_client, email="meera@gmail.com").status_code == 200
    google.tokens["meera"] = {"sub": "g-3", "email": "meera@gmail.com", "email_verified": True}

    assert client.post(GOOGLE, json={"id_token": "meera"}).status_code == 200
    assert _login(client, email="meera@gmail.com", password=NEW_PASSWORD).status_code == 200


# ── Forgot password ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("role", ["customer", "provider"])
def test_reset_sets_a_new_password_and_signs_out_old_sessions(client, email_client, role):
    old = sign_up(client, role=role)

    assert client.post(FORGOT, json={"email": "Asha@Example.com"}).status_code == 202
    assert email_client.sent[-1]["purpose"] == "password_reset"
    response = client.post(RESET, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "new_password": NEW_PASSWORD,
    })
    assert response.status_code == 200

    assert client.get(ME, headers=bearer(old["access_token"])).status_code == 401
    assert _login(client, role=role).status_code == 401
    fresh = _login(client, password=NEW_PASSWORD, role=role)
    assert fresh.status_code == 200
    assert client.get(ME, headers=bearer(fresh.json()["access_token"])).status_code == 200


def test_forgot_password_never_reveals_accounts(client, email_client, rewind_otps):
    assert client.post(FORGOT, json={"email": "nobody@example.com"}).status_code == 202
    assert email_client.sent == []

    sign_up(client)
    assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 202
    # A repeat inside the 60-second cooldown answers the same way but sends nothing
    assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 202
    assert len(email_client.sent) == 1

    rewind_otps(61)
    assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 202
    assert len(email_client.sent) == 2


def test_at_most_five_reset_codes_an_hour(client, email_client, rewind_otps):
    sign_up(client)
    for _ in range(6):
        assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 202
        rewind_otps(61)
    assert len(email_client.sent) == 5


def test_new_reset_code_retires_the_previous_one(client, email_client, rewind_otps):
    sign_up(client)
    client.post(FORGOT, json={"email": "asha@example.com"})
    first_code = email_client.last_code("asha@example.com")
    rewind_otps(61)
    client.post(FORGOT, json={"email": "asha@example.com"})

    stale = {"email": "asha@example.com", "otp": first_code, "new_password": NEW_PASSWORD}
    assert client.post(RESET, json=stale).status_code == 400


def test_five_wrong_reset_codes_kill_the_code(client, email_client):
    sign_up(client)
    client.post(FORGOT, json={"email": "asha@example.com"})
    code = email_client.last_code("asha@example.com")

    wrong = {"email": "asha@example.com", "otp": "000000", "new_password": NEW_PASSWORD}
    assert [client.post(RESET, json=wrong).status_code for _ in range(5)] == [400, 400, 400, 400, 429]
    assert client.post(RESET, json=wrong | {"otp": code}).status_code == 400
    assert _login(client).status_code == 200


def test_expired_reset_code_is_rejected(client, email_client, rewind_otps):
    sign_up(client)
    client.post(FORGOT, json={"email": "asha@example.com"})
    rewind_otps(11 * 60)

    response = client.post(RESET, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "new_password": NEW_PASSWORD,
    })
    assert response.status_code == 400


def test_reset_needs_a_valid_new_password(client, email_client):
    sign_up(client)
    client.post(FORGOT, json={"email": "asha@example.com"})
    response = client.post(RESET, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "new_password": "short",
    })
    assert response.status_code == 422


def test_failed_reset_email_reports_503_and_saves_nothing(client, email_client):
    sign_up(client)
    working_send = email_client.send_otp

    def broken_send(**_: object) -> None:
        raise RuntimeError("smtp down")

    email_client.send_otp = broken_send
    assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 503

    # The failed code wasn't stored, so no cooldown blocks an immediate retry
    email_client.send_otp = working_send
    assert client.post(FORGOT, json={"email": "asha@example.com"}).status_code == 202
    assert len(email_client.sent) == 1


# ── Session ──────────────────────────────────────────────────────────────────


def test_logout_revokes_the_token(client):
    token = sign_up(client)["access_token"]
    assert client.post("/api/v1/auth/logout", headers=bearer(token)).status_code == 200
    assert client.get(ME, headers=bearer(token)).status_code == 401
    assert client.get(ME).status_code == 401
