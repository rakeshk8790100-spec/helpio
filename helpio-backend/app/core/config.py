"""Environment-based application settings."""
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SECRET_KEY = "change-me-in-env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)

    app_env: Literal["dev", "prod"] = "dev"

    db_host: str = ""
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_name: str = "postgres"
    db_user: str = ""
    db_password: SecretStr = SecretStr("")
    db_sslmode: Literal["require", "verify-ca", "verify-full"] = "require"
    db_sslrootcert: str = ""

    auth_secret_key: SecretStr = SecretStr(DEFAULT_SECRET_KEY)
    # 30 days: sign-in is by emailed code, so short sessions would mean an email per visit.
    auth_token_minutes: int = Field(default=43_200, ge=5, le=525_600)
    # Dev only: print OTP emails to the server log instead of sending them.
    auth_dev_email_console: bool = False

    brevo_smtp_login: str = ""
    brevo_smtp_key: SecretStr = SecretStr("")
    brevo_from_email: str = ""
    google_client_id: str = ""
    # Seconds between checks for late progress updates; 0 turns the check off
    overdue_check_seconds: int = Field(default=60, ge=0)
    # The web app's address, for links in notification emails, e.g. "https://app.helpio.in"
    app_web_url: str = ""

    # Cloudinary stores job photos and videos; only their URLs are saved in the database.
    cloudinary_cloud_name: str = ""
    # Unsigned upload preset: uploads then need only the cloud name, not an API key with create permission.
    cloudinary_upload_preset: str = ""
    cloudinary_api_key: str = ""
    # Server-only: never send this to the browser.
    cloudinary_api_secret: SecretStr = SecretStr("")

    # Razorpay takes the customer's payment once all four stages are approved. The secrets are server-only.
    razorpay_key_id: str = ""
    razorpay_key_secret: SecretStr = SecretStr("")
    # Typed when adding the webhook in the Razorpay dashboard; webhooks are refused while it's empty
    razorpay_webhook_secret: SecretStr = SecretStr("")
    # How long a payment link stays open; Razorpay needs at least 15 minutes
    payment_link_expiry_minutes: int = Field(default=1440, ge=16, le=30 * 24 * 60)

    # Comma-separated browser origins allowed to call the API, e.g. "https://app.helpio.in".
    cors_origins: str = ""

    @model_validator(mode="after")
    def check_production_safety(self) -> "Settings":
        if self.app_env == "prod":
            if self.auth_secret_key.get_secret_value() == DEFAULT_SECRET_KEY:
                raise ValueError("Set AUTH_SECRET_KEY in production")
            if self.auth_dev_email_console:
                raise ValueError("AUTH_DEV_EMAIL_CONSOLE must be off in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def database_url(self) -> URL:
        missing = [name for name, value in {
            "DB_HOST": self.db_host,
            "DB_USER": self.db_user,
            "DB_PASSWORD": self.db_password.get_secret_value(),
        }.items() if not value.strip()]
        if missing:
            raise ValueError("Configure " + ", ".join(missing) + " using Supabase > Connect")
        # URL.create accepts the raw password, including reserved URI characters.
        return URL.create(
            "postgresql+pg8000", username=self.db_user,
            password=self.db_password.get_secret_value(), host=self.db_host,
            port=self.db_port, database=self.db_name,
        )


@lru_cache
def get_settings() -> Settings:
    environment = os.getenv("APP_ENV", "dev")
    if environment not in {"dev", "prod"}:
        raise ValueError("APP_ENV must be dev or prod")
    return Settings(_env_file=ROOT / f".env.{environment}", _env_file_encoding="utf-8")
