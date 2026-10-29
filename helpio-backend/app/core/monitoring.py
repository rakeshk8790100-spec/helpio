"""
What the admin console's status page watches: when background work last succeeded or failed (heartbeats), unexpected
server errors (one row per kind, counted), and this process's email sends. Recording never breaks the work itself.
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Integer, String, Text, Uuid, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.database import Base, UtcDateTime, utc_now

logger = logging.getLogger(__name__)

# When this process started, for the status page's uptime
STARTED_AT = utc_now()

OVERDUE_CHECK = "overdue_check"
RAZORPAY_WEBHOOK = "razorpay_webhook"
PAYMENT_SYNC = "payment_sync"


class SystemHeartbeat(Base):
    __tablename__ = "system_heartbeats"

    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    last_ok_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)


class SystemErrorLog(Base):
    __tablename__ = "system_errors"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    # method + route + error type, so repeats add to one row
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(200), nullable=False)
    error_type: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    first_seen: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    last_seen: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)


def beat(db: Session, name: str, *, error: str | None = None, **details: object) -> None:
    """Record that background work just succeeded (or failed with `error`), in its own small commit."""
    try:
        row = db.get(SystemHeartbeat, name) or SystemHeartbeat(name=name, details={})
        now = utc_now()
        if error is None:
            row.last_ok_at = now
        else:
            row.last_error_at, row.last_error = now, error[:500]
        row.details = {**(row.details or {}), **details}
        db.add(row)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.warning("Could not record the %s heartbeat", name)


def record_error(db: Session, *, method: str, path: str, error: BaseException) -> None:
    """Count an unexpected server error under its kind; best effort."""
    error_type = type(error).__name__
    fingerprint = hashlib.sha256(f"{method} {path} {error_type}".encode()).hexdigest()
    try:
        row = db.scalar(select(SystemErrorLog).where(SystemErrorLog.fingerprint == fingerprint))
        message = (str(error) or error_type)[:1000]
        if row is None:
            db.add(SystemErrorLog(fingerprint=fingerprint, method=method, path=path[:200], error_type=error_type[:120], message=message))
        else:
            row.count += 1
            row.last_seen, row.message = utc_now(), message
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.warning("Could not record a server error")


@dataclass
class EmailStatus:
    """Email sends from this process (they run after responses, without a database session)."""

    last_ok_at: datetime | None = None
    last_error_at: datetime | None = None
    last_error: str | None = None
    sent: int = 0
    failed: int = 0


EMAIL = EmailStatus()


def email_sent() -> None:
    EMAIL.last_ok_at, EMAIL.sent = utc_now(), EMAIL.sent + 1


def email_failed(error: str) -> None:
    EMAIL.last_error_at, EMAIL.last_error, EMAIL.failed = utc_now(), error[:300], EMAIL.failed + 1
