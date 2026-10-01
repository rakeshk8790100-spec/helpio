"""Environment-based database configuration."""
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)

    db_host: str = ""
    db_port: int = Field(default=5432, ge=1, le=65535)
    db_name: str = "postgres"
    db_user: str = ""
    db_password: SecretStr = SecretStr("")
    db_sslmode: Literal["require", "verify-ca", "verify-full"] = "require"
    db_sslrootcert: str = ""
    auth_secret_key: SecretStr = SecretStr("change-me-in-env")
    brevo_smtp_login: str = ""
    brevo_smtp_key: SecretStr = SecretStr("")
    brevo_from_email: str = ""
    google_client_id: str = ""

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
            "postgresql+psycopg", username=self.db_user,
            password=self.db_password.get_secret_value(), host=self.db_host,
            port=self.db_port, database=self.db_name,
        )


@lru_cache
def get_settings() -> Settings:
    environment = os.getenv("APP_ENV", "dev")
    if environment not in {"dev", "prod"}:
        raise ValueError("APP_ENV must be dev or prod")
    return Settings(_env_file=ROOT / f".env.{environment}", _env_file_encoding="utf-8")




