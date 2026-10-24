from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.modules.auth.model import AuthOtp, AuthUser, OtpPurpose


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> AuthUser | None:
        return self.db.scalar(select(AuthUser).where(AuthUser.email == email))

    def get_user_by_phone(self, phone: str) -> AuthUser | None:
        return self.db.scalar(select(AuthUser).where(AuthUser.phone == phone))

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

    def otp_window(self, *, user_id: str, purpose: OtpPurpose, since: datetime) -> tuple[int, datetime | None, datetime | None]:
        """Codes issued since `since`: (count, oldest created_at, newest created_at)."""
        count, oldest, newest = self.db.execute(
            select(func.count(AuthOtp.id), func.min(AuthOtp.created_at), func.max(AuthOtp.created_at)).where(
                AuthOtp.user_id == user_id, AuthOtp.purpose == purpose, AuthOtp.created_at > since
            )
        ).one()
        return count, oldest, newest

    def close_open_otps(self, *, user_id: str, purpose: OtpPurpose, now: datetime) -> None:
        self.db.execute(
            update(AuthOtp)
            .where(AuthOtp.user_id == user_id, AuthOtp.purpose == purpose, AuthOtp.consumed_at.is_(None))
            .values(consumed_at=now)
            .execution_options(synchronize_session=False)
        )

    def latest_open_otp_for_update(self, *, user_id: str, purpose: OtpPurpose, now: datetime) -> AuthOtp | None:
        """Lock the newest usable code so concurrent guesses are counted one at a time."""
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
            .with_for_update()
        )
