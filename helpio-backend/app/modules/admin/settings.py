"""The owner's settings page: third-party keys (secrets encrypted), a few app values and the approval switches."""
from pydantic import SecretStr, ValidationError
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.core.runtime_settings import (
    FIELD_BY_KEY,
    FIELDS,
    AppSetting,
    SettingField,
    SettingsKeyMissingError,
    can_store_secrets,
    encrypt,
    env_value,
    normalize,
    overrides,
    refresh_runtime_settings,
    unreadable,
)
from app.modules.admin import audit, checks
from app.modules.admin.audit import AuditAction, RequestInfo
from app.modules.admin.exceptions import InvalidSettingError, SecretsLockedError, UnknownCheckError, UnknownSettingError
from app.modules.admin.schema import (
    CheckResponse,
    SettingFieldResponse,
    SettingGroupResponse,
    SettingsResponse,
)
from app.modules.auth.model import AuthUser

GROUPS = (
    ("razorpay", "Razorpay", "Customers pay the hired quote on Razorpay's page (UPI or netbanking)."),
    ("cloudinary", "Cloudinary", "Job photos and videos, and profile photos."),
    ("email", "Email (Brevo)", "Log-in codes and notification emails."),
    ("google", "Google sign-in", "Continue with Google for customers."),
    ("ai", "AI job assistant", "Claude turns a customer's one line into a job post. Without a key, Helpio matches keywords."),
    ("app", "App", "Links in emails, payment links and the late-update check."),
    ("approvals", "Approvals", "Who waits for an admin after signing up."),
)


def mask(secret: str) -> str:
    """Enough to recognise a key, never enough to use it."""
    return "••••" + secret[-4:] if len(secret) > 8 else "••••"


def as_text(value: object) -> str:
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def to_check(check: checks.Check) -> CheckResponse:
    return CheckResponse(
        name=check.name, label=check.label, configured=check.configured, ok=check.ok, message=check.message,
        latency_ms=check.latency_ms, checked_at=check.checked_at,
    )


class SettingsService:
    def view(self) -> SettingsResponse:
        saved, broken = overrides(), unreadable()

        def field(item: SettingField) -> SettingFieldResponse:
            raw = saved[item.key] if item.key in saved else as_text(env_value(item))
            source = "panel" if item.key in saved else ("env" if raw.strip() else "missing")
            secret = item.kind == "secret"
            return SettingFieldResponse(
                key=item.key, label=item.label, help=item.help, kind=item.kind,
                value=(mask(raw) if raw else None) if secret else raw, source=source, unreadable=item.key in broken,
            )

        return SettingsResponse(
            groups=[
                SettingGroupResponse(
                    id=group, title=title, description=description, testable=group in checks.CHECKS,
                    fields=[field(item) for item in FIELDS if item.group == group],
                )
                for group, title, description in GROUPS
            ],
            can_store_secrets=can_store_secrets(),
        )

    def update(
        self, db: Session, owner: AuthUser, changes: dict[str, str | None], request: RequestInfo
    ) -> SettingsResponse:
        unknown = [key for key in changes if key not in FIELD_BY_KEY]
        if unknown:
            raise UnknownSettingError(unknown)
        saved_keys: list[str] = []
        reset_keys: list[str] = []
        for key, value in changes.items():
            item = FIELD_BY_KEY[key]
            row = db.get(AppSetting, key)
            if value is None:
                # Back to the .env value
                if row is not None:
                    db.delete(row)
                    reset_keys.append(key)
                continue
            try:
                stored = normalize(item, value)
            except ValidationError as error:
                raise InvalidSettingError(item.label, error.errors()[0]["msg"]) from error
            if item.kind == "secret":
                if not stored:
                    raise InvalidSettingError(item.label, "can't be empty; reset it to use the .env value instead")
                try:
                    stored = encrypt(stored)
                except SettingsKeyMissingError as error:
                    raise SecretsLockedError from error
            if row is None:
                row = AppSetting(key=key)
                db.add(row)
            # Set every time, so other server processes see the change
            row.value, row.is_secret, row.updated_by, row.updated_at = stored, item.kind == "secret", owner.id, utc_now()
            saved_keys.append(key)
        if saved_keys or reset_keys:
            names = [FIELD_BY_KEY[key].label for key in saved_keys + reset_keys]
            audit.record(
                db, action=AuditAction.SETTINGS_UPDATED, admin=owner, target_type="settings",
                summary="Changed settings: " + ", ".join(names), request=request,
                # Which settings only: values (even masked) are never logged
                saved=saved_keys, reset=reset_keys,
            )
        db.commit()
        refresh_runtime_settings(db, force=True)
        for group in {FIELD_BY_KEY[key].group for key in changes}:
            checks.forget(group)
        return self.view()

    def test(self, group: str) -> CheckResponse:
        if group not in checks.CHECKS:
            raise UnknownCheckError
        return to_check(checks.run_check(group))
