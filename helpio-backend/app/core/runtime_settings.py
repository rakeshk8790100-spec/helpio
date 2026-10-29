"""
Settings the owner changes in the admin console without a redeploy: third-party keys, a few app values and the
approval switches. A value saved in the console overrides the same setting from .env (secrets are encrypted with
SETTINGS_ENCRYPTION_KEY); everything else (database, auth secret, CORS, the owner's email) stays in .env only.

`runtime_settings()` is what integrations read. Each process keeps the merged settings and re-reads the saved values
when they change: `get_db` asks at most every REFRESH_SECONDS with one tiny query, and saving refreshes at once.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Annotated, Literal

from cryptography.fernet import Fernet, InvalidToken
from pydantic import SecretStr, TypeAdapter
from sqlalchemy import Boolean, ForeignKey, String, Text, Uuid, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.config import Settings, get_settings
from app.core.database import Base, UtcDateTime, utc_now

logger = logging.getLogger(__name__)

REFRESH_SECONDS = 15

Kind = Literal["text", "secret", "int", "bool"]


@dataclass(frozen=True)
class SettingField:
    # The Settings attribute (and the .env name, upper-cased)
    key: str
    # razorpay | cloudinary | email | google | app | approvals
    group: str
    label: str
    kind: Kind = "text"
    help: str = ""


FIELDS: tuple[SettingField, ...] = (
    SettingField("razorpay_key_id", "razorpay", "Key ID", help="Razorpay Dashboard > Account & Settings > API Keys"),
    SettingField("razorpay_key_secret", "razorpay", "Key secret", "secret"),
    SettingField("razorpay_webhook_secret", "razorpay", "Webhook secret", "secret", "The secret typed when adding the webhook"),
    SettingField("cloudinary_cloud_name", "cloudinary", "Cloud name", help="The badge on the API Keys page"),
    SettingField("cloudinary_upload_preset", "cloudinary", "Upload preset", help="An unsigned preset for job photos"),
    SettingField("cloudinary_api_key", "cloudinary", "API key"),
    SettingField("cloudinary_api_secret", "cloudinary", "API secret", "secret"),
    SettingField("brevo_smtp_login", "email", "SMTP login", help="Brevo > SMTP & API"),
    SettingField("brevo_smtp_key", "email", "SMTP key", "secret"),
    SettingField("brevo_from_email", "email", "From address", help="A sender verified in Brevo"),
    SettingField("google_client_id", "google", "OAuth web client ID", help="Google Cloud > Credentials"),
    SettingField("app_web_url", "app", "Web app address", help="Used in email links and payment returns"),
    SettingField("payment_link_expiry_minutes", "app", "Payment link lifetime (minutes)", "int", "16 to 43200"),
    SettingField("overdue_check_seconds", "app", "Late-update check (seconds)", "int", "0 turns it off"),
    SettingField("require_customer_approval", "approvals", "Approve new customers before they can log in", "bool"),
    SettingField("require_provider_approval", "approvals", "Verify new providers before they can quote", "bool"),
    SettingField("notify_new_signups", "approvals", "Email the owner about sign-ups waiting for approval", "bool"),
)
FIELD_BY_KEY = {item.key: item for item in FIELDS}


class SettingsKeyMissingError(Exception):
    """Secrets can't be saved without SETTINGS_ENCRYPTION_KEY."""


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    # Fernet ciphertext for secrets, plain text otherwise
    value: Mapped[str] = mapped_column(Text, nullable=False)
    is_secret: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)
    updated_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )


# ----- Encryption -----


def _fernet() -> Fernet | None:
    key = get_settings().settings_encryption_key.get_secret_value().strip()
    return Fernet(key.encode()) if key else None


def can_store_secrets() -> bool:
    try:
        return _fernet() is not None
    except ValueError:
        logger.error("SETTINGS_ENCRYPTION_KEY is not a valid Fernet key")
        return False


def encrypt(value: str) -> str:
    fernet = _fernet() if can_store_secrets() else None
    if fernet is None:
        raise SettingsKeyMissingError
    return fernet.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    fernet = _fernet() if can_store_secrets() else None
    if fernet is None:
        raise InvalidToken
    return fernet.decrypt(value.encode()).decode()


# ----- Values -----


def normalize(item: SettingField, value: str) -> str:
    """Validate a value typed in the console against the setting's own rules; returns how it's stored."""
    model_field = Settings.model_fields[item.key]
    annotation = Annotated[model_field.annotation, *model_field.metadata] if model_field.metadata else model_field.annotation
    checked = TypeAdapter(annotation).validate_python(value.strip())
    if isinstance(checked, SecretStr):
        return checked.get_secret_value()
    if isinstance(checked, bool):
        return "true" if checked else "false"
    return str(checked)


def env_value(item: SettingField) -> object:
    """The value from .env (or the default)."""
    return getattr(get_settings(), item.key)


def _typed(item: SettingField, value: str) -> object:
    if item.kind == "secret":
        return SecretStr(value)
    if item.kind == "int":
        return int(value)
    if item.kind == "bool":
        return value == "true"
    return value


@dataclass
class _Store:
    settings: Settings | None = None
    # Saved values, decrypted
    overrides: dict[str, str] = field(default_factory=dict)
    # Saved keys whose ciphertext can't be read (lost or changed encryption key)
    unreadable: set[str] = field(default_factory=set)
    version: tuple | None = None
    checked_at: float = 0.0


_store = _Store()


def runtime_settings() -> Settings:
    """The .env settings with the console's saved values applied."""
    return _store.settings or get_settings()


def overrides() -> dict[str, str]:
    """The saved values in force, decrypted (for the console's view)."""
    return dict(_store.overrides)


def unreadable() -> set[str]:
    return set(_store.unreadable)


def refresh_runtime_settings(db: Session, *, force: bool = False) -> None:
    """Re-read the saved values when they changed. Never fails a request: on error the last values stay."""
    now = time.monotonic()
    if not force and _store.settings is not None and now - _store.checked_at < REFRESH_SECONDS:
        return
    _store.checked_at = now
    try:
        version = tuple(db.execute(select(func.max(AppSetting.updated_at), func.count()).select_from(AppSetting)).one())
        if not force and _store.settings is not None and version == _store.version:
            return
        rows = db.scalars(select(AppSetting)).all()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Could not read saved settings; keeping the current ones")
        return
    saved: dict[str, str] = {}
    broken: set[str] = set()
    for row in rows:
        item = FIELD_BY_KEY.get(row.key)
        if item is None:
            continue
        try:
            saved[row.key] = decrypt(row.value) if row.is_secret else row.value
        except InvalidToken:
            broken.add(row.key)
            logger.error("Saved setting %s can't be decrypted (SETTINGS_ENCRYPTION_KEY changed?); using .env", row.key)
    _store.settings = get_settings().model_copy(update={key: _typed(FIELD_BY_KEY[key], value) for key, value in saved.items()})
    _store.overrides, _store.unreadable, _store.version = saved, broken, version


def reset_runtime_settings() -> None:
    """Forget the cache (tests, or after the .env changed)."""
    global _store
    _store = _Store()
