from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.admin.approvals import ApprovalService
from app.modules.admin.audit import RequestInfo
from app.modules.admin.dependencies import current_admin, get_approval_service, request_info
from app.modules.admin.schema import ApprovalCountsResponse, ApprovalItemResponse, ApproveRequest, ReasonRequest
from app.modules.auth.model import AuthUser, UserRole
from app.modules.auth.service import is_owner_email

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/approvals", response_model=list[ApprovalItemResponse])
def pending_approvals(
    role: Literal["customer", "provider"] | None = None,
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: ApprovalService = Depends(get_approval_service),
) -> list[ApprovalItemResponse]:
    """Customers and providers waiting for an admin, oldest first; providers with their skills, area and days."""
    return service.pending(db, UserRole(role) if role else None)


@router.get("/approvals/count", response_model=ApprovalCountsResponse)
def approval_counts(
    admin: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalCountsResponse:
    """For the console's badges; admin requests are counted for the owner only."""
    return service.counts(db, owner=is_owner_email(admin.email))


@router.post("/users/{user_id}/approve", response_model=ApprovalItemResponse)
def approve_user(
    user_id: UUID,
    payload: ApproveRequest,
    background: BackgroundTasks,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalItemResponse:
    """A customer can log in from now on; a provider can quote and be found. They're told in the app and by email."""
    return service.approve(db, admin, str(user_id), payload.note, info, background)


@router.post("/users/{user_id}/reject", response_model=ApprovalItemResponse)
def reject_user(
    user_id: UUID,
    payload: ReasonRequest,
    background: BackgroundTasks,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalItemResponse:
    """The reason is emailed to them; they can't log in."""
    return service.reject(db, admin, str(user_id), payload.reason, info, background)
