import logging

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.email import NotificationEmailClient, get_notification_email_client
from app.modules.auth.model import AuthUser
from app.modules.notifications.model import Notification
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.schema import NotificationListResponse, NotificationResponse, UnreadCountResponse

logger = logging.getLogger(__name__)


def send_email(client: NotificationEmailClient, to_email: str, subject: str, body: str, link: str | None) -> None:
    """Best effort: the in-app notification is already saved, so a failed email is only logged."""
    try:
        client.send_notification(to_email=to_email, subject=subject, body=body, link=link)
    except RuntimeError:
        logger.exception("Notification email to user failed")


class NotificationService:
    def __init__(self, *, email_client: NotificationEmailClient | None = None) -> None:
        self._email_client = email_client

    @property
    def email_client(self) -> NotificationEmailClient:
        if self._email_client is None:
            self._email_client = get_notification_email_client()
        return self._email_client

    def notify(
        self, db: Session, user: AuthUser, *, type: str, title: str, body: str,
        job_id: str | None = None, link: str | None = None, background: BackgroundTasks | None = None,
    ) -> Notification:
        """Save the notification in the caller's transaction; with `background`, also email it after the response."""
        notification = NotificationRepository(db).add(
            Notification(user_id=user.id, type=type, title=title, body=body, job_id=job_id, link=link)
        )
        if background is not None and user.email:
            base = get_settings().app_web_url.rstrip("/")
            url = f"{base}{link}" if base and link else None
            background.add_task(send_email, self.email_client, user.email, title, body, url)
        return notification

    def list(self, db: Session, user: AuthUser, limit: int) -> NotificationListResponse:
        repo = NotificationRepository(db)
        return NotificationListResponse(
            notifications=[self._response(item) for item in repo.latest(user.id, limit)],
            unread_count=repo.unread_count(user.id),
        )

    def unread_count(self, db: Session, user: AuthUser) -> UnreadCountResponse:
        return UnreadCountResponse(unread_count=NotificationRepository(db).unread_count(user.id))

    def mark_read(self, db: Session, user: AuthUser, notification_id: str | None = None) -> UnreadCountResponse:
        repo = NotificationRepository(db)
        repo.mark_read(user.id, notification_id)
        db.commit()
        return UnreadCountResponse(unread_count=repo.unread_count(user.id))

    def _response(self, item: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=item.id, type=item.type, title=item.title, body=item.body, job_id=item.job_id,
            link=item.link, read=item.read_at is not None, created_at=item.created_at,
        )
