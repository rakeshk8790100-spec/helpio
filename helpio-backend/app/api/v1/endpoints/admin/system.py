from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.admin.audit import RequestInfo
from app.modules.admin.dependencies import current_admin, current_owner, request_info
from app.modules.admin.schema import (
    CheckResponse,
    DashboardResponse,
    SettingsResponse,
    StatusResponse,
    UpdateSettingsRequest,
)
from app.modules.admin.settings import SettingsService
from app.modules.admin.status import StatusService
from app.modules.auth.model import AuthUser

router = APIRouter(prefix="/admin", tags=["admin"])


def get_settings_service() -> SettingsService:
    return SettingsService()


def get_status_service() -> StatusService:
    return StatusService()


# ----- Dashboard and status (every admin) -----


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: StatusService = Depends(get_status_service),
) -> DashboardResponse:
    """Today's numbers (India time) and the latest activity across Helpio."""
    return service.dashboard(db)


@router.get("/status", response_model=StatusResponse)
def status(
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: StatusService = Depends(get_status_service),
) -> StatusResponse:
    """Is everything running: the database, outside services (checked at most every 30 s), background jobs, errors."""
    return service.status(db)


# ----- Settings (the owner) -----


@router.get("/settings", response_model=SettingsResponse)
def view_settings(
    _: AuthUser = Depends(current_owner),
    service: SettingsService = Depends(get_settings_service),
) -> SettingsResponse:
    """Every setting the console can change, where its value comes from, secrets masked."""
    return service.view()


@router.put("/settings", response_model=SettingsResponse)
def update_settings(
    payload: UpdateSettingsRequest,
    owner: AuthUser = Depends(current_owner),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: SettingsService = Depends(get_settings_service),
) -> SettingsResponse:
    """Save values (secrets encrypted), or `null` to go back to .env. In force within 15 seconds on every server."""
    return service.update(db, owner, payload.changes, info)


@router.post("/settings/{group}/test", response_model=CheckResponse)
def test_settings(
    group: Literal["razorpay", "cloudinary", "email", "google"],
    _: AuthUser = Depends(current_owner),
    service: SettingsService = Depends(get_settings_service),
) -> CheckResponse:
    """Check the service with the values in force (nothing is sent or charged)."""
    return service.test(group)
