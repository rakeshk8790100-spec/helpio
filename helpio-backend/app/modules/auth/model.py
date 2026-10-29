from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, Index, Integer, SmallInteger, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now


class UserRole(StrEnum):
    ADMIN = "admin"
    CUSTOMER = "customer"
    PROVIDER = "provider"


class OtpPurpose(StrEnum):
    SIGNUP = "signup"
    LOGIN = "login"
    PASSWORD_RESET = "password_reset"
    # The second step of every admin console log-in
    ADMIN_LOGIN = "admin_login"


class ApprovalStatus(StrEnum):
    """New admins (and, when switched on, new customers and providers) wait for an admin's approval."""

    APPROVED = "approved"
    PENDING = "pending"
    REJECTED = "rejected"


class AuthUser(Base):
    __tablename__ = "auth_users"
    __table_args__ = (
        Index("ux_auth_users_phone", "phone", unique=True),
        Index("ix_auth_users_role_approval", "role", "approval_status"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # E.164, e.g. +919876543210
    phone: Mapped[str | None] = mapped_column(String(13), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(str_enum(UserRole), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    auth_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="email")
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        str_enum(ApprovalStatus), nullable=False, default=ApprovalStatus.APPROVED
    )
    # The admin's reason when rejecting
    approval_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="SET NULL"), nullable=True
    )
    # Access tokens carry the version they were issued with; bumping it signs the user out everywhere.
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    otps: Mapped[list[AuthOtp]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class AuthOtp(Base):
    __tablename__ = "auth_otps"
    __table_args__ = (
        Index("ix_auth_otps_user_purpose_consumed", "user_id", "purpose", "consumed_at"),
        Index("ix_auth_otps_user_purpose_created", "user_id", "purpose", "created_at"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[OtpPurpose] = mapped_column(str_enum(OtpPurpose), nullable=False)
    otp_hash: Mapped[str] = mapped_column(Text, nullable=False)
    attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)

    user: Mapped[AuthUser] = relationship(back_populates="otps")


class PendingSignup(Base):
    """Sign-up details waiting for the emailed code; the account is created only once the code matches."""

    __tablename__ = "auth_pending_signups"
    __table_args__ = (Index("ix_auth_pending_signups_email_created", "email", "created_at"),)

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[str] = mapped_column(String(13), nullable=False)
    role: Mapped[UserRole] = mapped_column(str_enum(UserRole), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    otp_hash: Mapped[str] = mapped_column(Text, nullable=False)
    attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)


class RevokedAccessToken(Base):
    __tablename__ = "auth_revoked_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, index=True)
