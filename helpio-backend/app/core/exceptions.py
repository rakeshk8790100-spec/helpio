"""Domain errors and their single translation into HTTP responses; unexpected errors are counted for the admin console."""
import logging
import re

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
NUMBER = re.compile(r"/\d+(?=/|$)")


def route_template(path: str) -> str:
    """"/api/v1/jobs/3f1c…/milestones/2/approve" → "/api/v1/jobs/{id}/milestones/{n}/approve", so repeats group."""
    return NUMBER.sub("/{n}", UUID.sub("{id}", path))


class AppError(Exception):
    """Base for expected, user-facing errors. Subclasses set `status_code` and a generic `detail`."""

    status_code = 400
    detail = "Request failed"
    headers: dict[str, str] | None = None

    def __init__(self, detail: str | None = None, *, headers: dict[str, str] | None = None) -> None:
        if detail is not None:
            self.detail = detail
        if headers is not None:
            self.headers = headers
        super().__init__(self.detail)


def app_error_handler(_: Request, error: AppError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content={"detail": error.detail}, headers=error.headers)


def _record_unexpected(request: Request, path: str, error: Exception) -> None:
    from app.core.dependencies import get_db
    from app.core.monitoring import record_error

    # Same session source as requests, so test overrides apply here too
    sessions = request.app.dependency_overrides.get(get_db, get_db)()
    try:
        record_error(next(sessions), method=request.method, path=path, error=error)
    except Exception:
        logger.warning("Could not record an unexpected error")
    finally:
        sessions.close()


async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    """A bug or an outage: counted for the admin status page, answered with a plain 500 (the server still logs it)."""
    await run_in_threadpool(_record_unexpected, request, route_template(request.url.path), error)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
