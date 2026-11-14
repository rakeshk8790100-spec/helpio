from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now
from app.modules.auth.model import AuthUser
from app.modules.catalog.model import CatalogCategory


class JobStatus(StrEnum):
    """A custom job request, from draft to paid-out. PIN and milestones move it past ACCEPTED; paying completes it."""

    DRAFT = "draft"
    OPEN = "open"
    ACCEPTED = "accepted"
    FUNDED = "funded"
    IN_PROGRESS = "in_progress"
    # All four stages approved; the customer pays the hired quote on Razorpay
    PAYMENT_DUE = "payment_due"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


# Hired: a provider's quote was accepted and the job isn't finished (or isn't paid yet)
ACTIVE_STATUSES = (JobStatus.ACCEPTED, JobStatus.FUNDED, JobStatus.IN_PROGRESS, JobStatus.PAYMENT_DUE)


class InviteStatus(StrEnum):
    """A direct request from a customer to one pro: waiting, answered with a quote, or turned down."""

    PENDING = "pending"
    QUOTED = "quoted"
    DECLINED = "declined"


class MilestoneStatus(StrEnum):
    """One of a hired job's four 25% stages: the pro submits photos and a note, the customer approves or asks for changes."""

    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"


class JobEventType(StrEnum):
    HIRED = "hired"
    STARTED = "started"
    MILESTONE_SUBMITTED = "milestone_submitted"
    MILESTONE_APPROVED = "milestone_approved"
    CHANGES_REQUESTED = "changes_requested"
    STAGE_OVERDUE = "stage_overdue"
    PAYMENT_FAILED = "payment_failed"
    PAID = "paid"
    REVIEWED = "reviewed"
    COMPLETED = "completed"


MILESTONE_STAGES = (1, 2, 3, 4)
STAGE_PERCENT = 25


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
    # Flat, building and street: shown to the hired provider only
    address_line: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    duration_mins: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[JobStatus] = mapped_column(str_enum(JobStatus), nullable=False, default=JobStatus.DRAFT)
    # Approved work: 0, 25, 50, 75 or 100
    progress_pct: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    # Last change to a posted job; quotes sent before it may be out of date
    edited_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # Shown to the customer after hire; the hired pro enters it to start work
    start_pin: Mapped[str | None] = mapped_column(String(4), nullable=True)
    start_pin_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # The pro's estimate when starting; each 25% stage gets a quarter of it
    estimated_mins: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    customer: Mapped[AuthUser] = relationship(lazy="joined")
    category: Mapped[CatalogCategory | None] = relationship(lazy="joined")
    quotes: Mapped[list[JobQuote]] = relationship(
        back_populates="job", cascade="all, delete-orphan", passive_deletes=True, order_by="JobQuote.created_at"
    )
    # Pros the customer asked directly; loaded with the job
    invites: Mapped[list[JobInvite]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, lazy="selectin", order_by="JobInvite.created_at"
    )
    attachments: Mapped[list[JobAttachment]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="JobAttachment.created_at"
    )
    # Created on hire: four 25% stages
    milestones: Mapped[list[JobMilestone]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="JobMilestone.stage"
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


class JobInvite(Base):
    __tablename__ = "job_invites"
    __table_args__ = (
        UniqueConstraint("job_id", "provider_id", name="ux_job_invites_job_provider"),
        Index("ix_job_invites_provider_status", "provider_id", "status"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    provider_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[InviteStatus] = mapped_column(str_enum(InviteStatus), nullable=False, default=InviteStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    provider: Mapped[AuthUser] = relationship(lazy="joined")


class JobMessage(Base):
    """Chat between a job's customer and its hired pro. Contact details are masked before saving."""

    __tablename__ = "job_messages"
    __table_args__ = (Index("ix_job_messages_job_created", "job_id", "created_at"),)

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    read_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class JobMilestone(Base):
    __tablename__ = "job_milestones"
    __table_args__ = (UniqueConstraint("job_id", "stage", name="ux_job_milestones_job_stage"),)

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    # 1 to 4; stage N is N × 25% of the work
    stage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    percent: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    status: Mapped[MilestoneStatus] = mapped_column(
        str_enum(MilestoneStatus), nullable=False, default=MilestoneStatus.PENDING
    )
    approved_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # Target time, fixed on start: started_at + stage × estimate / 4. Fixing work never moves it.
    due_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # Set when both sides were told the stage is late, so it's said once
    overdue_notified_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    # Every attempt is kept, oldest first, so both sides see the full history
    submissions: Mapped[list[JobMilestoneSubmission]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, lazy="selectin",
        order_by="JobMilestoneSubmission.submitted_at",
    )


class JobMilestoneSubmission(Base):
    __tablename__ = "job_milestone_submissions"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    milestone_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_milestones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    # submitted, approved or changes_requested; the customer's answer to this attempt
    review_status: Mapped[MilestoneStatus] = mapped_column(
        str_enum(MilestoneStatus), nullable=False, default=MilestoneStatus.SUBMITTED
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    photos: Mapped[list[JobMilestonePhoto]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, lazy="selectin", order_by="JobMilestonePhoto.created_at"
    )


class JobMilestonePhoto(Base):
    """Proof of work stored on Cloudinary, like JobAttachment."""

    __tablename__ = "job_milestone_photos"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    submission_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_milestone_submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    public_id: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    resource_type: Mapped[str] = mapped_column(String(10), nullable=False)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)


class JobEvent(Base):
    """The job's timeline, shown to the customer and the hired pro."""

    __tablename__ = "job_events"
    __table_args__ = (Index("ix_job_events_job_created", "job_id", "created_at"),)

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )
    type: Mapped[JobEventType] = mapped_column(str_enum(JobEventType), nullable=False)
    # e.g. {"stage": 2} or {"reason": "..."}
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
