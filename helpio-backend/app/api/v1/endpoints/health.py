from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app.core.database import check_database

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/db")
def database_health() -> dict[str, str]:
    try:
        check_database()
    except ValueError:
        raise HTTPException(status_code=503, detail="Database is not configured") from None
    except (SQLAlchemyError, RuntimeError):
        raise HTTPException(status_code=503, detail="Database is unavailable") from None
    return {"status": "ok", "database": "connected"}
