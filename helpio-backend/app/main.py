import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.config import get_settings
from app.core.database import close_database
from app.core.dependencies import get_db
from app.core.exceptions import register_exception_handlers
from app.core.monitoring import OVERDUE_CHECK, beat
from app.core.runtime_settings import runtime_settings
from app.modules.jobs.milestones import notify_overdue

logger = logging.getLogger(__name__)

# While the check is switched off (0), look again this often in case the admin console turns it on
IDLE_SECONDS = 60


def check_overdue_once(app: FastAPI) -> None:
    # Same session source as requests, so test overrides apply here too
    sessions = app.dependency_overrides.get(get_db, get_db)()
    try:
        db = next(sessions)
        try:
            flagged = notify_overdue(db)
        except Exception as error:
            db.rollback()
            beat(db, OVERDUE_CHECK, error=f"{type(error).__name__}: {error}")
            raise
        beat(db, OVERDUE_CHECK, flagged=flagged)
    finally:
        sessions.close()


async def check_overdue_forever(app: FastAPI) -> None:
    """Flag late progress updates; waits first, so a short-lived app (tests) never runs it. 0 seconds turns it off."""
    while True:
        await asyncio.sleep(runtime_settings().overdue_check_seconds or IDLE_SECONDS)
        if not runtime_settings().overdue_check_seconds:
            continue
        try:
            await asyncio.to_thread(check_overdue_once, app)
        except Exception:
            logger.exception("Overdue stage check failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if get_settings().app_env == "prod" and not get_settings().settings_encryption_key.get_secret_value():
        logger.warning("SETTINGS_ENCRYPTION_KEY is not set: API keys can't be saved in the admin console")
    task = asyncio.create_task(check_overdue_forever(app))
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
    close_database()


app = FastAPI(title="Helpio API", lifespan=lifespan)
register_exception_handlers(app)

cors_origins = get_settings().cors_origin_list
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )

app.include_router(router)
