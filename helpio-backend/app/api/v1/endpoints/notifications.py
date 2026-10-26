from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import AuthUser
from app.modules.notifications.dependencies import get_notification_service
from app.modules.notifications.schema import NotificationListResponse, UnreadCountResponse
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationListResponse:
    """Newest first, with the unread count for the bell."""
    return service.list(db, user, limit)


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: NotificationService = Depends(get_notification_service),
) -> UnreadCountResponse:
    return service.unread_count(db, user)


@router.post("/read-all", response_model=UnreadCountResponse)
def mark_all_read(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: NotificationService = Depends(get_notification_service),
) -> UnreadCountResponse:
    return service.mark_read(db, user)


@router.post("/{notification_id}/read", response_model=UnreadCountResponse)
def mark_read(
    notification_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: NotificationService = Depends(get_notification_service),
) -> UnreadCountResponse:
    return service.mark_read(db, user, notification_id)
