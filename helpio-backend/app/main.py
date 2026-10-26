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
from app.modules.jobs.milestones import notify_overdue

logger = logging.getLogger(__name__)


def check_overdue_once(app: FastAPI) -> None:
    # Same session source as requests, so test overrides apply here too
    sessions = app.dependency_overrides.get(get_db, get_db)()
    try:
        notify_overdue(next(sessions))
    finally:
        sessions.close()


async def check_overdue_forever(app: FastAPI, every: int) -> None:
    """Flag late progress updates; waits first, so a short-lived app (tests) never runs it."""
    while True:
        await asyncio.sleep(every)
        try:
            await asyncio.to_thread(check_overdue_once, app)
        except Exception:
            logger.exception("Overdue stage check failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    every = get_settings().overdue_check_seconds
    task = asyncio.create_task(check_overdue_forever(app, every)) if every else None
    yield
    if task is not None:
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
