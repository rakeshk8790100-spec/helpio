from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now


class PaymentStatus(StrEnum):
    """A Razorpay Payment Link: open (a failed try keeps it open), paid, or closed without a payment."""

    PENDING = "pending"
    PAID = "paid"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class PayoutStatus(StrEnum):
    """Helpio sends the pro their money by hand, then marks it paid."""

    PENDING = "pending"
    PAID = "paid"


class AttemptStatus(StrEnum):
    """Razorpay's own payment states, kept as reported."""

    CREATED = "created"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_job_created", "job_id", "created_at"),
        Index("ix_payments_provider_status", "provider_id", "status"),
    )

    # Also the link's `reference_id` on Razorpay
    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    customer_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    provider_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    # The hired quote, in paise
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[PaymentStatus] = mapped_column(
        str_enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING
    )
    razorpay_link_id: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    # Razorpay creates the link's order when the customer first opens it
    razorpay_order_id: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    # Razorpay's hosted payment page
    short_url: Mapped[str] = mapped_column(Text, nullable=False)
    # The captured payment, once paid
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # "upi" or "netbanking"
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Razorpay's reason for the latest failed try, while the link is still open
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    # Last time Razorpay was asked for the link's state
    synced_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    payout_status: Mapped[PayoutStatus] = mapped_column(
        str_enum(PayoutStatus), nullable=False, default=PayoutStatus.PENDING
    )
    # UTR or UPI reference of Helpio's transfer to the pro
    payout_reference: Mapped[str | None] = mapped_column(String(80), nullable=True)
    payout_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    payout_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    # Every try on Razorpay, oldest first
    attempts: Mapped[list[PaymentAttempt]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, lazy="selectin", order_by="PaymentAttempt.attempted_at",
    )


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    payment_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # One row per Razorpay payment, so repeated webhooks and syncs never duplicate it
    razorpay_payment_id: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    status: Mapped[AttemptStatus] = mapped_column(str_enum(AttemptStatus), nullable=False)
    method: Mapped[str | None] = mapped_column(String(20), nullable=True)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(60), nullable=True)
    # e.g. "Payment was declined by the bank"
    error_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Razorpay's payment entity as last seen
    raw: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # When the customer tried, by Razorpay's clock
    attempted_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)
