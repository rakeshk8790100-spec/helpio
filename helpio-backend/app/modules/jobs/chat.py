"""Job chat: the customer and the hired pro, from hire onwards. Phone numbers and emails are masked."""
import re
from datetime import datetime

from fastapi import BackgroundTasks
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.core.geo import short_name
from app.modules.auth.model import AuthUser
from app.modules.jobs.exceptions import ChatNotAvailableError, JobNotFoundError
from app.modules.jobs.model import Job, JobMessage, JobStatus, QuoteStatus
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.schema import ChatResponse, MessageResponse
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService

# 7+ digits, allowing spaces, dots, dashes and a leading +: phone numbers in any common format
PHONE = re.compile(r"\+?\d[\d\s.\-()]{5,}\d")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
MASK = "•••"


def mask_contacts(text: str) -> tuple[str, bool]:
    """Hide phone numbers and email addresses; returns the text and whether anything was hidden."""
    masked = EMAIL.sub(MASK, text)
    masked = PHONE.sub(lambda m: MASK if sum(ch.isdigit() for ch in m.group()) >= 7 else m.group(), masked)
    return masked, masked != text


def hired_provider_id(job: Job) -> str | None:
    return next((q.provider_id for q in job.quotes if q.status == QuoteStatus.ACCEPTED), None)


def unread_count(db: Session, job_id: str, reader_id: str) -> int:
    return db.scalar(
        select(func.count()).select_from(JobMessage).where(
            JobMessage.job_id == job_id, JobMessage.sender_id != reader_id, JobMessage.read_at.is_(None)
        )
    ) or 0


class JobChat:
    def __init__(self, *, notifications: NotificationService | None = None) -> None:
        self.notifications = notifications or NotificationService()

    def messages(self, db: Session, user: AuthUser, job_id: str, after: datetime | None) -> ChatResponse:
        job, other = self._conversation(db, user, job_id)
        query = select(JobMessage).where(JobMessage.job_id == job.id)
        if after is not None:
            query = query.where(JobMessage.created_at > after)
        rows = db.scalars(query.order_by(JobMessage.created_at)).all()
        # Reading marks the other side's messages as read
        db.execute(
            update(JobMessage)
            .where(JobMessage.job_id == job.id, JobMessage.sender_id != user.id, JobMessage.read_at.is_(None))
            .values(read_at=utc_now())
        )
        NotificationRepository(db).mark_read_for_job(user.id, job.id, "chat_message")
        db.commit()
        names = {user.id: short_name(user.name, "You"), other.id: short_name(other.name, "Helpio user")}
        return ChatResponse(
            job_id=job.id, job_title=job.title, other_name=names[other.id], other_avatar_url=other.avatar_url,
            messages=[self._response(m, user.id, names) for m in rows],
        )

    def send(
        self, db: Session, user: AuthUser, job_id: str, body: str, background: BackgroundTasks | None = None
    ) -> MessageResponse:
        job, other = self._conversation(db, user, job_id)
        text, _ = mask_contacts(body)
        message = JobMessage(job_id=job.id, sender_id=user.id, body=text)
        db.add(message)
        # One alert until the chat is opened, however many messages follow
        if not NotificationRepository(db).has_unread(other.id, "chat_message", job.id):
            link = f"/jobs/{job.id}/chat" if other.id == job.customer_id else f"/pro/jobs/{job.id}/chat"
            self.notifications.notify(
                db, other, type="chat_message", title=f"New message from {short_name(user.name, 'Helpio user')}",
                body=f"About \"{job.title}\": {text[:120]}", job_id=job.id, link=link, background=background,
            )
        db.commit()
        return self._response(message, user.id, {user.id: short_name(user.name, "You"), other.id: ""})

    def _conversation(self, db: Session, user: AuthUser, job_id: str) -> tuple[Job, AuthUser]:
        """The job and the other person; only the customer and the hired pro may chat, from hire onwards."""
        job = JobRepository(db).get(job_id)
        if job is None:
            raise JobNotFoundError
        provider_id = hired_provider_id(job)
        if user.id not in (job.customer_id, provider_id):
            raise JobNotFoundError
        if provider_id is None or job.status in (JobStatus.DRAFT, JobStatus.OPEN, JobStatus.CANCELLED):
            raise ChatNotAvailableError
        other = db.get(AuthUser, provider_id if user.id == job.customer_id else job.customer_id)
        return job, other

    def _response(self, message: JobMessage, me: str, names: dict[str, str]) -> MessageResponse:
        return MessageResponse(
            id=message.id, body=message.body, mine=message.sender_id == me,
            sender_name=names.get(message.sender_id, ""), created_at=message.created_at,
        )
