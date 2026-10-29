"""Live checks of each outside service with the settings in force: the console's Test buttons and the status page."""
from __future__ import annotations

import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

import httpx
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import utc_now
from app.core.exceptions import AppError
from app.core.runtime_settings import runtime_settings
from app.integrations.cloudinary import CloudinaryStorage
from app.integrations.email import BrevoOtpEmailClient
from app.integrations.payment import RazorpayGateway

GOOGLE_CLIENT_ID = re.compile(r"^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$")
GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs"
# The status page reuses a result this long, so polling it doesn't hammer the services
CACHE_SECONDS = 30


@dataclass(frozen=True)
class Check:
    name: str
    label: str
    configured: bool
    # None: set up, but it can't be checked from here
    ok: bool | None
    message: str
    latency_ms: int | None
    checked_at: datetime


def _missing(name: str, label: str, message: str) -> Check:
    return Check(name, label, False, False, message, None, utc_now())


def _timed(name: str, label: str, run: Callable[[], str]) -> Check:
    started = time.perf_counter()
    try:
        message, ok = run(), True
    except AppError as error:
        message, ok = error.detail, False
    except RuntimeError as error:
        message, ok = str(error), False
    except httpx.HTTPError as error:
        message, ok = f"Can't be reached ({type(error).__name__})", False
    return Check(name, label, True, ok, message, round((time.perf_counter() - started) * 1000), utc_now())


def check_database(db: Session) -> Check:
    def run() -> str:
        try:
            db.execute(text("SELECT 1"))
        except SQLAlchemyError as error:
            db.rollback()
            raise RuntimeError(f"Query failed ({type(error).__name__})") from error
        return "Connected"

    return _timed("database", "Database", run)


def check_razorpay() -> Check:
    settings = runtime_settings()
    key_id = settings.razorpay_key_id.strip()
    if not (key_id and settings.razorpay_key_secret.get_secret_value()):
        return _missing("razorpay", "Razorpay", "Add the key ID and key secret to take payments")

    def run() -> str:
        RazorpayGateway().ping()
        mode = "test mode" if key_id.startswith("rzp_test_") else "live mode"
        webhook = "webhook secret set" if settings.razorpay_webhook_secret.get_secret_value() else "no webhook secret yet"
        return f"Keys accepted ({mode}, {webhook})"

    return _timed("razorpay", "Razorpay", run)


def check_cloudinary() -> Check:
    settings = runtime_settings()
    signed = bool(settings.cloudinary_api_key.strip() and settings.cloudinary_api_secret.get_secret_value())
    if not settings.cloudinary_cloud_name.strip() or not (settings.cloudinary_upload_preset.strip() or signed):
        return _missing("cloudinary", "Cloudinary", "Add the cloud name and an upload preset (or API key and secret)")
    if not signed:
        return Check(
            "cloudinary", "Cloudinary", True, None,
            "Unsigned uploads are set up. Add the API key and secret to test them and to delete photos.", None, utc_now(),
        )

    def run() -> str:
        CloudinaryStorage().ping()
        return "API key accepted"

    return _timed("cloudinary", "Cloudinary", run)


def check_email() -> Check:
    env = get_settings()
    if env.app_env == "dev" and env.auth_dev_email_console:
        return Check("email", "Email (Brevo)", True, True, "Development: emails print to the server log", None, utc_now())
    settings = runtime_settings()
    if not (settings.brevo_smtp_login.strip() and settings.brevo_smtp_key.get_secret_value() and settings.brevo_from_email.strip()):
        return _missing("email", "Email (Brevo)", "Add the SMTP login, key and from address to send codes and emails")

    def run() -> str:
        BrevoOtpEmailClient().check()
        return f"SMTP login accepted, sending as {settings.brevo_from_email}"

    return _timed("email", "Email (Brevo)", run)


def check_google() -> Check:
    client_id = runtime_settings().google_client_id.strip()
    if not client_id:
        return _missing("google", "Google sign-in", "Add the OAuth client ID to offer Continue with Google")
    if not GOOGLE_CLIENT_ID.match(client_id):
        return Check(
            "google", "Google sign-in", True, False,
            "That doesn't look like a web client ID (…apps.googleusercontent.com)", None, utc_now(),
        )

    def run() -> str:
        httpx.get(GOOGLE_CERTS, timeout=5).raise_for_status()
        return "Client ID looks right and Google is reachable"

    return _timed("google", "Google sign-in", run)


CHECKS: dict[str, Callable[[], Check]] = {
    "razorpay": check_razorpay,
    "cloudinary": check_cloudinary,
    "email": check_email,
    "google": check_google,
}

_cache: dict[str, Check] = {}


def run_check(name: str) -> Check:
    """A fresh check (the Test button); the status page then reuses it."""
    _cache[name] = CHECKS[name]()
    return _cache[name]


def cached_check(name: str) -> Check:
    hit = _cache.get(name)
    if hit is not None and (utc_now() - hit.checked_at).total_seconds() < CACHE_SECONDS:
        return hit
    return run_check(name)


def forget(name: str) -> None:
    """After a setting changed, the next look checks again."""
    _cache.pop(name, None)
