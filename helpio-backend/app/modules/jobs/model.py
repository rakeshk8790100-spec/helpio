from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now
from app.modules.auth.model import AuthUser
from app.modules.catalog.model import CatalogCategory


class JobStatus(StrEnum):
    """A custom job request, from draft to paid-out. Escrow, PIN and milestones move it past ACCEPTED."""

    DRAFT = "draft"
    OPEN = "open"
    ACCEPTED = "accepted"
    FUNDED = "funded"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


# Hired: a provider's quote was accepted and the job isn't finished
ACTIVE_STATUSES = (JobStatus.ACCEPTED, JobStatus.FUNDED, JobStatus.IN_PROGRESS)


class QuoteStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_customer_status", "customer_id", "status"),
        Index("ix_jobs_status_category", "status", "category_id"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_id: Mapped[str | None] = mapped_column(
        String(40), ForeignKey("catalog_categories.id", ondelete="RESTRICT"), nullable=True
    )
    # Exact location: shown to the hired provider only
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(6), nullable=True)
    area_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    budget_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    duration_mins: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[JobStatus] = mapped_column(str_enum(JobStatus), nullable=False, default=JobStatus.DRAFT)
    # Approved work: 0, 25, 50, 75 or 100
    progress_pct: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    customer: Mapped[AuthUser] = relationship(lazy="joined")
    category: Mapped[CatalogCategory | None] = relationship(lazy="joined")
    quotes: Mapped[list[JobQuote]] = relationship(
        back_populates="job", cascade="all, delete-orphan", passive_deletes=True, order_by="JobQuote.created_at"
    )
    attachments: Mapped[list[JobAttachment]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="JobAttachment.created_at"
    )


class JobQuote(Base):
    __tablename__ = "job_quotes"
    __table_args__ = (
        UniqueConstraint("job_id", "provider_id", name="ux_job_quotes_job_provider"),
        Index("ix_job_quotes_provider_status", "provider_id", "status"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    provider_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[QuoteStatus] = mapped_column(str_enum(QuoteStatus), nullable=False, default=QuoteStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    job: Mapped[Job] = relationship(back_populates="quotes")
    provider: Mapped[AuthUser] = relationship(lazy="joined")


class JobAttachment(Base):
    """A photo or video stored on Cloudinary; the database keeps its URL and id."""

    __tablename__ = "job_attachments"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    # Cloudinary id and type ("image" or "video"), to delete the file
    public_id: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    resource_type: Mapped[str] = mapped_column(String(10), nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
