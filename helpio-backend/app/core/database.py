"""A shared, bounded SQLAlchemy pool for Supabase Postgres, plus shared column types."""
from datetime import datetime, timezone
from enum import StrEnum
from functools import lru_cache

from sqlalchemy import DateTime, Enum, create_engine, text
from sqlalchemy.engine import Dialect, Engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UtcDateTime(TypeDecorator[datetime]):
    """Timezone-aware UTC datetimes on every backend (SQLite drops tzinfo on read)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Naive datetimes are not allowed; use utc_now()")
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def str_enum(enum_cls: type[StrEnum]) -> Enum:
    """Store a StrEnum by value in a varchar column; the SQL migration owns the CHECK constraint."""
    return Enum(enum_cls, native_enum=False, values_callable=lambda members: [member.value for member in members])


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    connect_args = {
        "sslmode": settings.db_sslmode,
        "connect_timeout": 10,
        "prepare_threshold": None,
        "options": "-c statement_timeout=10000",
    }
    if settings.db_sslrootcert:
        connect_args["sslrootcert"] = settings.db_sslrootcert
    return create_engine(
        settings.database_url(), connect_args=connect_args,
        pool_pre_ping=True, pool_size=3, max_overflow=2,
        pool_timeout=10, pool_recycle=300, hide_parameters=True,
    )


def check_database() -> None:
    with get_engine().connect() as connection:
        if connection.execute(text("SELECT 1")).scalar_one() != 1:
            raise RuntimeError("Unexpected database health response")


def close_database() -> None:
    if get_engine.cache_info().currsize:
        get_engine().dispose()
        get_engine.cache_clear()
