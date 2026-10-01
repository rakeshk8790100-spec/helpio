from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(StrEnum):
    ADMIN = "admin"
    CUSTOMER = "customer"
    PROVIDER = "provider"


class OtpPurpose(StrEnum):
    SIGNUP = "signup"
    PASSWORD_RESET = "password_reset"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AuthUser(Base):
    __tablename__ = "auth_users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False, values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    auth_provider: Mapped[str] = mapped_column(String(20), nullable=False, default="email")
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    otps: Mapped[list[AuthOtp]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class AuthOtp(Base):
    __tablename__ = "auth_otps"
    __table_args__ = (
        Index("ix_auth_otps_user_purpose_consumed", "user_id", "purpose", "consumed_at"),
    )

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[OtpPurpose] = mapped_column(Enum(OtpPurpose, native_enum=False, values_callable=lambda enum: [item.value for item in enum]), nullable=False)
    otp_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    user: Mapped[AuthUser] = relationship(back_populates="otps")





class RevokedAccessToken(Base):
    __tablename__ = "auth_revoked_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
