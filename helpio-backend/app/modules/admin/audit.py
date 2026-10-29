"""The audit log: every admin action and console log-in, with who did it, to what, from where and when."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import JSON, ForeignKey, Index, String, Text, Uuid, select
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.core.database import Base, UtcDateTime, utc_now
from app.modules.auth.model import AuthUser


class AuditAction(StrEnum):
    LOGIN = "admin.login"
    LOGIN_FAILED = "admin.login_failed"
    ACCESS_REQUESTED = "admin.access_requested"
    ADMIN_APPROVED = "admin.approve"
    ADMIN_REJECTED = "admin.reject"
    ADMIN_DEACTIVATED = "admin.deactivate"
    ADMIN_ACTIVATED = "admin.activate"
    USER_APPROVED = "user.approve"
    USER_REJECTED = "user.reject"
    SETTINGS_UPDATED = "settings.update"
    USER_DEACTIVATED = "user.deactivate"
    USER_ACTIVATED = "user.activate"
    USER_SIGNED_OUT = "user.sign_out"
    JOB_CANCELLED = "job.cancel"
    CHAT_VIEWED = "chat.view"
    PAYMENT_RECHECKED = "payment.recheck"
    PAYOUT_SENT = "payout.mark_paid"
    REVIEW_HIDDEN = "review.hide"
    REVIEW_SHOWN = "review.unhide"
    CATALOG_CHANGED = "catalog.update"


@dataclass(frozen=True)
class RequestInfo:
    ip: str | None
    user_agent: str | None


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"
    __table_args__ = (
        Index("ix_admin_audit_log_created", "created_at"),
        Index("ix_admin_audit_log_admin_created", "admin_id", "created_at"),
        Index("ix_admin_audit_log_action_email_created", "action", "actor_email", "created_at"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    admin_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )
    # The email typed, for logins that failed before an admin was known
    actor_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    # e.g. "admin", "user", "job"
    target_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # One line for the log, e.g. "Approved Ravi Singh (ravi@example.com)"
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    # Extra facts, never secret values
    details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    admin: Mapped[AuthUser | None] = relationship(foreign_keys=[admin_id], lazy="joined")


def record(
    db: Session, *, action: AuditAction, summary: str, admin: AuthUser | None = None, actor_email: str | None = None,
    target_type: str | None = None, target_id: str | None = None, request: RequestInfo | None = None,
    **details: object,
) -> None:
    """Add a row in the caller's transaction, so a failed action is never logged as done."""
    db.add(AdminAuditLog(
        admin_id=admin.id if admin else None, actor_email=actor_email or (admin.email if admin else None),
        action=action, target_type=target_type, target_id=target_id, summary=summary, details=details,
        ip=request.ip if request else None, user_agent=request.user_agent if request else None,
    ))


def recent_failures(db: Session, email: str, since: datetime, limit: int) -> list[datetime]:
    """When the latest failed console log-ins for this email happened, newest first."""
    return list(db.scalars(
        select(AdminAuditLog.created_at)
        .where(
            AdminAuditLog.action == AuditAction.LOGIN_FAILED,
            AdminAuditLog.actor_email == email,
            AdminAuditLog.created_at >= since,
        )
        .order_by(AdminAuditLog.created_at.desc())
        .limit(limit)
    ).all())
