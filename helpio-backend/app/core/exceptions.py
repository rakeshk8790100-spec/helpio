"""Domain errors and their single translation into HTTP responses."""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


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


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
