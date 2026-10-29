from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.admin.access import AdminAccessService
from app.modules.admin.audit import RequestInfo
from app.modules.admin.dependencies import current_admin, current_owner, get_admin_access_service, request_info
from app.modules.admin.schema import AdminResponse, AuditEntryResponse, OptionalReasonRequest, ReasonRequest
from app.modules.auth.model import AuthUser
from app.utils.pagination import Page, PageParams, page_params

router = APIRouter(prefix="/admin", tags=["admin"])


# ----- Admins (the owner only) -----


@router.get("/admins", response_model=list[AdminResponse])
def list_admins(
    _: AuthUser = Depends(current_owner),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> list[AdminResponse]:
    """Every admin, waiting requests first."""
    return service.admins(db)


@router.post("/admins/{admin_id}/approve", response_model=AdminResponse)
def approve_admin(
    admin_id: UUID,
    background: BackgroundTasks,
    owner: AuthUser = Depends(current_owner),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> AdminResponse:
    """They can log in with their email and password from now on, with an emailed code each time."""
    return service.approve(db, owner, str(admin_id), info, background)


@router.post("/admins/{admin_id}/reject", response_model=AdminResponse)
def reject_admin(
    admin_id: UUID,
    payload: ReasonRequest,
    background: BackgroundTasks,
    owner: AuthUser = Depends(current_owner),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> AdminResponse:
    """Turn a waiting request down; the reason is emailed to them."""
    return service.reject(db, owner, str(admin_id), payload.reason, info, background)


@router.post("/admins/{admin_id}/deactivate", response_model=AdminResponse)
def deactivate_admin(
    admin_id: UUID,
    payload: OptionalReasonRequest,
    owner: AuthUser = Depends(current_owner),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> AdminResponse:
    """Signs them out everywhere; they can't log in until reactivated."""
    return service.set_active(db, owner, str(admin_id), False, payload.reason, info)


@router.post("/admins/{admin_id}/activate", response_model=AdminResponse)
def activate_admin(
    admin_id: UUID,
    owner: AuthUser = Depends(current_owner),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> AdminResponse:
    return service.set_active(db, owner, str(admin_id), True, None, info)


# ----- Audit log (every admin) -----


@router.get("/audit", response_model=Page[AuditEntryResponse])
def audit_log(
    action: str | None = None,
    admin_id: UUID | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    params: PageParams = Depends(page_params),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> Page[AuditEntryResponse]:
    """Every admin action and console log-in, newest first."""
    return service.audit_log(
        db, params, action=action, admin_id=str(admin_id) if admin_id else None,
        target_type=target_type, target_id=target_id,
    )
