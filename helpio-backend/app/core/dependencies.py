from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.core.runtime_settings import refresh_runtime_settings


def get_db() -> Generator[Session, None, None]:
    """Provide a session; callers explicitly commit successful writes."""
    try:
        engine = get_engine()
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured",
        ) from error
    except ImportError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database driver is unavailable",
        ) from error
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from error

    with Session(engine) as session:
        # Pick up API keys and switches saved in the admin console (one tiny query, at most every 15 s)
        refresh_runtime_settings(session)
        yield session
