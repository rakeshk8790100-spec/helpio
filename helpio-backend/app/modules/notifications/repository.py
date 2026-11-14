from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.modules.notifications.model import Notification


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.flush()
        return notification

    def latest(self, user_id: str, limit: int) -> Sequence[Notification]:
        return self.db.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        ).all()

    def unread_count(self, user_id: str) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id, Notification.read_at.is_(None)
            )
        ) or 0

    def mark_read(self, user_id: str, notification_id: str | None = None) -> None:
        """One notification, or all of the user's when no id is given."""
        query = update(Notification).where(Notification.user_id == user_id, Notification.read_at.is_(None))
        if notification_id is not None:
            query = query.where(Notification.id == notification_id)
        self.db.execute(query.values(read_at=utc_now()))

    def recent_count(self, user_id: str, type: str, since: datetime) -> int:
        """How many alerts of this kind the user got since then; spaces out emails such as new-job alerts."""
        return self.db.scalar(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id, Notification.type == type, Notification.created_at >= since
            )
        ) or 0

    def has_unread(self, user_id: str, type: str, job_id: str) -> bool:
        return self.db.scalar(
            select(Notification.id).where(
                Notification.user_id == user_id, Notification.type == type, Notification.job_id == job_id,
                Notification.read_at.is_(None),
            ).limit(1)
        ) is not None

    def mark_read_for_job(self, user_id: str, job_id: str, type: str) -> None:
        """Opening a screen (e.g. the chat) clears its alerts from the bell."""
        self.db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id, Notification.job_id == job_id, Notification.type == type,
                Notification.read_at.is_(None),
            )
            .values(read_at=utc_now())
        )
