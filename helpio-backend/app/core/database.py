"""A shared, bounded SQLAlchemy pool for Supabase Postgres, plus shared column types."""
import ssl
from datetime import datetime, timezone
from enum import StrEnum
from functools import lru_cache

from sqlalchemy import DateTime, Enum, create_engine, event, text
from sqlalchemy.engine import Dialect, Engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

from app.core.config import Settings, get_settings


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


def _ssl_context(settings: Settings) -> ssl.SSLContext:
    """libpq's sslmode for pg8000: `require` encrypts only; `verify-*` check the certificate (and the host name)."""
    if settings.db_sslmode == "require":
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        return context
    context = ssl.create_default_context(cafile=settings.db_sslrootcert or None)
    context.check_hostname = settings.db_sslmode == "verify-full"
    return context


@lru_cache
def get_engine() -> Engine:
    # pg8000 is pure Python: Windows Smart App Control blocks psycopg-binary's bundled DLLs
    settings = get_settings()
    connect_args = {
        "ssl_context": _ssl_context(settings),
        # Covers every socket read, so a little above the statement timeout
        "timeout": 15,
    }
    engine = create_engine(
        settings.database_url(), connect_args=connect_args,
        pool_pre_ping=True, pool_size=3, max_overflow=2,
        pool_timeout=10, pool_recycle=300, hide_parameters=True,
    )

    @event.listens_for(engine, "connect")
    def limit_statements(dbapi_connection, _record) -> None:
        # The Supabase pooler ignores startup options, so set it per connection; committed so the pool keeps it
        cursor = dbapi_connection.cursor()
        cursor.execute("SET statement_timeout = 10000")
        cursor.close()
        dbapi_connection.commit()

    return engine


def check_database() -> None:
    with get_engine().connect() as connection:
        if connection.execute(text("SELECT 1")).scalar_one() != 1:
            raise RuntimeError("Unexpected database health response")


def close_database() -> None:
    if get_engine.cache_info().currsize:
        get_engine().dispose()
        get_engine.cache_clear()
