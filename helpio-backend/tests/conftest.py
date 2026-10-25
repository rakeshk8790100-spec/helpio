from collections.abc import Iterator
from datetime import timedelta
from itertools import count

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.modules.providers.model  # noqa: F401  (registers provider tables)
from app.core.database import Base
from app.core.dependencies import get_db
from app.main import app
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.model import AuthOtp
from app.modules.auth.service import AuthService
from app.modules.catalog.model import CatalogCategory, CatalogSkill


class FakeEmailClient:
    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    def send_otp(self, *, to_email: str, otp: str, purpose: str, expires_minutes: int) -> None:
        self.sent.append({"to": to_email, "otp": otp, "purpose": purpose})

    def last_code(self, email: str) -> str:
        return next(item["otp"] for item in reversed(self.sent) if item["to"] == email)


class FakeGoogleVerifier:
    def __init__(self) -> None:
        self.tokens: dict[str, dict[str, object]] = {}

    def verify(self, id_token: str) -> dict[str, object]:
        if id_token not in self.tokens:
            raise ValueError("bad token")
        return self.tokens[id_token]


@pytest.fixture
def engine() -> Iterator[Engine]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([
            CatalogCategory(id="plumbing", name="Plumbing", icon="wrench", sort_order=1),
            CatalogCategory(id="electrical", name="Electrical", icon="zap", sort_order=2),
            CatalogSkill(id="plumbing-tap-leak", category_id="plumbing", name="Tap & leak repair", sort_order=1),
            CatalogSkill(id="plumbing-pipe", category_id="plumbing", name="Pipe fitting", sort_order=2),
            CatalogSkill(id="plumbing-tank", category_id="plumbing", name="Water tank cleaning", sort_order=3),
            CatalogSkill(id="electrical-wiring", category_id="electrical", name="Wiring", sort_order=1),
        ])
        db.commit()
    yield engine
    engine.dispose()


@pytest.fixture
def email_client() -> FakeEmailClient:
    return FakeEmailClient()


@pytest.fixture
def google() -> FakeGoogleVerifier:
    return FakeGoogleVerifier()


@pytest.fixture
def client(engine: Engine, email_client: FakeEmailClient, google: FakeGoogleVerifier) -> Iterator[TestClient]:
    session_factory = sessionmaker(engine)

    def override_db() -> Iterator[Session]:
        with session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    # Predictable codes (100000, 100001, ...) so "000000" is always wrong.
    codes = count(100_000)
    app.dependency_overrides[get_auth_service] = lambda: AuthService(
        email_client=email_client, google_token_verifier=google, otp_factory=lambda: str(next(codes))
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def rewind_otps(engine: Engine):
    """Move every issued code into the past, to step over resend cooldowns and expiry."""

    def rewind(seconds: int) -> None:
        with Session(engine) as db:
            for otp in db.query(AuthOtp):
                otp.created_at -= timedelta(seconds=seconds)
                otp.expires_at -= timedelta(seconds=seconds)
            db.commit()

    return rewind


PASSWORD = "s3cret-pass"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def sign_up(
    client: TestClient, *, role: str = "customer", email: str = "asha@example.com",
    phone: str = "9876543210", name: str = "Asha Kumar", password: str = PASSWORD,
) -> dict:
    """Register an account; sign-up signs the user straight in and returns the session."""
    response = client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "phone": phone, "role": role, "password": password},
    )
    assert response.status_code == 201, response.text
    return response.json()
