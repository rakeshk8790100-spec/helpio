from sqlalchemy.orm import Session

from app.modules.auth.service import AuthService
from tests.conftest import bearer, sign_up

START = "/api/v1/auth/otp/start"
REGISTER = "/api/v1/auth/register"
VERIFY = "/api/v1/auth/verify-otp"
RESEND = "/api/v1/auth/otp/resend"
ME = "/api/v1/auth/me"
LOGIN = "/api/v1/auth/login"


def test_new_customer_signs_up_with_email_code(client, email_client):
    response = client.post(START, json={"email": "Asha@Example.com", "role": "customer"})
    assert response.json() == {"next": "details"}
    assert email_client.sent == []

    session = sign_up(client, email_client, email="asha@example.com")

    assert email_client.sent[0]["purpose"] == "signup"
    assert session["token_type"] == "bearer"
    assert session["user"] | {"id": None} == {
        "id": None, "email": "asha@example.com", "name": "Asha Kumar", "phone": "+919876543210",
        "role": "customer", "avatar_url": None, "onboarding_status": None,
    }
    me = client.get(ME, headers=bearer(session["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "asha@example.com"


def test_returning_customer_logs_in_with_a_new_code(client, email_client):
    sign_up(client, email_client)

    response = client.post(START, json={"email": "asha@example.com", "role": "customer"})
    assert response.json() == {"next": "otp"}
    assert email_client.sent[-1]["purpose"] == "login"

    response = client.post(VERIFY, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "purpose": "login",
    })
    assert response.status_code == 200
    assert response.json()["user"]["name"] == "Asha Kumar"


def test_provider_sign_up_starts_onboarding(client, email_client):
    session = sign_up(client, email_client, role="provider", email="ravi@example.com", phone="9123456780")
    assert session["user"]["role"] == "provider"
    assert session["user"]["onboarding_status"] == "skills"


def test_email_of_other_role_is_rejected(client, email_client):
    sign_up(client, email_client, role="provider", email="ravi@example.com")

    response = client.post(START, json={"email": "ravi@example.com", "role": "customer"})
    assert response.status_code == 409
    assert response.json()["detail"] == "This email is registered as a professional account"


def test_verified_email_cannot_register_again(client, email_client):
    sign_up(client, email_client)
    response = client.post(REGISTER, json={
        "name": "Someone", "email": "asha@example.com", "phone": "9000000000", "role": "customer",
    })
    assert response.status_code == 409


def test_abandoned_sign_up_can_be_retried_after_cooldown(client, email_client, rewind_otps):
    body = {"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "customer"}
    assert client.post(REGISTER, json=body).status_code == 202

    too_soon = client.post(REGISTER, json=body | {"role": "provider"})
    assert too_soon.status_code == 429
    assert 1 <= int(too_soon.headers["Retry-After"]) <= 60

    rewind_otps(61)
    assert client.post(REGISTER, json=body | {"name": "Asha K", "role": "provider"}).status_code == 202
    # Issuing a new code retires the old one.
    old_code = email_client.sent[0]["otp"]
    assert client.post(VERIFY, json={"email": "asha@example.com", "otp": old_code, "purpose": "signup"}).status_code == 400
    session = client.post(VERIFY, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "purpose": "signup",
    }).json()
    assert session["user"]["name"] == "Asha K"
    assert session["user"]["role"] == "provider"


def test_phone_of_verified_account_is_taken(client, email_client):
    sign_up(client, email_client, phone="9876543210")
    response = client.post(REGISTER, json={
        "name": "Other", "email": "other@example.com", "phone": "9876543210", "role": "customer",
    })
    assert response.status_code == 409
    assert "mobile number" in response.json()["detail"]


def test_phone_is_released_from_unverified_sign_up(client, email_client):
    abandoned = {"name": "First", "email": "first@example.com", "phone": "9876543210", "role": "customer"}
    assert client.post(REGISTER, json=abandoned).status_code == 202

    session = sign_up(client, email_client, email="second@example.com", phone="9876543210")
    assert session["user"]["phone"] == "+919876543210"


def test_five_wrong_codes_kill_the_code(client, email_client):
    client.post(REGISTER, json={"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "customer"})
    code = email_client.last_code("asha@example.com")

    statuses = [
        client.post(VERIFY, json={"email": "asha@example.com", "otp": "000000", "purpose": "signup"}).status_code
        for _ in range(5)
    ]
    assert statuses == [400, 400, 400, 400, 429]
    response = client.post(VERIFY, json={"email": "asha@example.com", "otp": code, "purpose": "signup"})
    assert response.status_code == 400


def test_expired_code_is_rejected(client, email_client, rewind_otps):
    client.post(REGISTER, json={"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "customer"})
    rewind_otps(11 * 60)
    response = client.post(VERIFY, json={
        "email": "asha@example.com", "otp": email_client.last_code("asha@example.com"), "purpose": "signup",
    })
    assert response.status_code == 400


def test_hourly_code_limit(client, email_client, rewind_otps):
    sign_up(client, email_client)  # the sign-up code is counted separately from login codes
    for _ in range(5):
        rewind_otps(61)
        assert client.post(START, json={"email": "asha@example.com", "role": "customer"}).status_code == 200
    rewind_otps(61)
    limited = client.post(START, json={"email": "asha@example.com", "role": "customer"})
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) > 60


def test_resend_never_reveals_accounts(client, email_client, rewind_otps):
    response = client.post(RESEND, json={"email": "nobody@example.com", "purpose": "login"})
    assert response.status_code == 202
    assert email_client.sent == []

    client.post(REGISTER, json={"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "customer"})
    rewind_otps(61)
    assert client.post(RESEND, json={"email": "asha@example.com", "purpose": "login"}).status_code == 202
    assert len(email_client.sent) == 1  # unverified accounts only get signup codes
    assert client.post(RESEND, json={"email": "asha@example.com", "purpose": "signup"}).status_code == 202
    assert len(email_client.sent) == 2


def test_failed_email_rolls_back_sign_up(client, email_client):
    def broken_send(**_: object) -> None:
        raise RuntimeError("smtp down")

    email_client.send_otp = broken_send
    body = {"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "customer"}
    response = client.post(REGISTER, json=body)
    assert response.status_code == 503
    assert client.post(START, json={"email": "asha@example.com", "role": "customer"}).json() == {"next": "details"}


def test_invalid_input_is_rejected(client):
    bad_phone = {"name": "Asha", "email": "asha@example.com", "phone": "12345", "role": "customer"}
    assert client.post(REGISTER, json=bad_phone).status_code == 422
    admin = {"name": "Asha", "email": "asha@example.com", "phone": "9876543210", "role": "admin"}
    assert client.post(REGISTER, json=admin).status_code == 422
    assert client.post(START, json={"email": "not-an-email", "role": "customer"}).status_code == 422


def test_google_creates_customer_and_phone_is_added_later(client, google):
    google.tokens["good"] = {
        "sub": "g-1", "email": "Meera@Gmail.com", "email_verified": True,
        "name": "Meera Iyer", "picture": "https://example.com/meera.png",
    }
    session = client.post("/api/v1/auth/google", json={"id_token": "good"}).json()
    assert session["user"]["email"] == "meera@gmail.com"
    assert session["user"]["name"] == "Meera Iyer"
    assert session["user"]["phone"] is None

    response = client.patch(ME, json={"phone": "9988776655"}, headers=bearer(session["access_token"]))
    assert response.status_code == 200
    assert response.json()["phone"] == "+919988776655"
    assert client.patch(ME, json={}, headers=bearer(session["access_token"])).status_code == 422

    again = client.post("/api/v1/auth/google", json={"id_token": "good"}).json()
    assert again["user"]["id"] == session["user"]["id"]


def test_google_rejects_bad_tokens_and_provider_emails(client, email_client, google):
    assert client.post("/api/v1/auth/google", json={"id_token": "forged"}).status_code == 401

    sign_up(client, email_client, role="provider", email="ravi@example.com")
    google.tokens["ravi"] = {"sub": "g-2", "email": "ravi@example.com", "email_verified": True}
    response = client.post("/api/v1/auth/google", json={"id_token": "ravi"})
    assert response.status_code == 409


def test_logout_revokes_the_token(client, email_client):
    token = sign_up(client, email_client)["access_token"]
    assert client.post("/api/v1/auth/logout", headers=bearer(token)).status_code == 200
    assert client.get(ME, headers=bearer(token)).status_code == 401
    assert client.get(ME).status_code == 401


def test_admin_logs_in_with_password(client, email_client, engine):
    sign_up(client, email_client)
    assert client.post("/api/v1/auth/signup", json={}).status_code == 404

    with Session(engine) as db:
        AuthService(email_client=email_client).create_admin(
            db, email="admin@helpio.in", password="s3cret-pass", name="Admin"
        )
    response = client.post(LOGIN, json={"email": "admin@helpio.in", "password": "s3cret-pass"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"
    # Signed up with a code only: there is no password to match
    customer = client.post(LOGIN, json={"email": "asha@example.com", "password": "anything"})
    assert customer.status_code == 401


def _register(client, *, role="customer", email="asha@example.com", phone="9876543210", password="s3cret-pass"):
    payload = {"name": "Asha Kumar", "email": email, "phone": phone, "role": role, "password": password}
    response = client.post(REGISTER, json=payload)
    assert response.status_code == 202, response.text


def _verify_signup(client, email_client, email="asha@example.com"):
    response = client.post(VERIFY, json={"email": email, "otp": email_client.last_code(email), "purpose": "signup"})
    assert response.status_code == 200, response.text


def test_customer_with_password_logs_in_after_verifying_email(client, email_client):
    _register(client)
    unverified = client.post(LOGIN, json={"email": "asha@example.com", "password": "s3cret-pass"})
    assert unverified.status_code == 401

    _verify_signup(client, email_client)
    response = client.post(LOGIN, json={"email": "Asha@Example.com", "password": "s3cret-pass"})
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "customer"

    wrong = client.post(LOGIN, json={"email": "asha@example.com", "password": "not-my-pass"})
    assert wrong.status_code == 401


def test_short_password_is_rejected(client):
    payload = {"name": "Asha Kumar", "email": "asha@example.com", "phone": "9876543210", "role": "customer"}
    assert client.post(REGISTER, json=payload | {"password": "short"}).status_code == 422


def test_providers_cannot_log_in_with_password(client, email_client):
    _register(client, role="provider", email="ravi@example.com", phone="9123456780")
    _verify_signup(client, email_client, email="ravi@example.com")
    response = client.post(LOGIN, json={"email": "ravi@example.com", "password": "s3cret-pass"})
    assert response.status_code == 401
