"""A shared, bounded SQLAlchemy pool for Supabase Postgres."""
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


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
