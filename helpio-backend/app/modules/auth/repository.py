from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.model import AuthOtp, AuthUser, OtpPurpose


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> AuthUser | None:
        return self.db.scalar(select(AuthUser).where(AuthUser.email == email.lower()))

    def get_user_by_google_sub(self, google_sub: str) -> AuthUser | None:
        return self.db.scalar(select(AuthUser).where(AuthUser.google_sub == google_sub))

    def add_user(self, user: AuthUser) -> AuthUser:
        self.db.add(user)
        self.db.flush()
        return user

    def add_otp(self, otp: AuthOtp) -> AuthOtp:
        self.db.add(otp)
        self.db.flush()
        return otp

    def latest_open_otp(self, *, user_id: str, purpose: OtpPurpose, now: datetime) -> AuthOtp | None:
        return self.db.scalar(
            select(AuthOtp)
            .where(
                AuthOtp.user_id == user_id,
                AuthOtp.purpose == purpose,
                AuthOtp.consumed_at.is_(None),
                AuthOtp.expires_at > now,
            )
            .order_by(AuthOtp.created_at.desc())
            .limit(1)
        )
