from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from secrets import randbelow, token_urlsafe
from typing import Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.core.security import access_token_hash, create_access_token, decode_access_token, hash_secret, verify_secret
from app.integrations.email import OtpEmailClient, get_otp_email_client
from app.integrations.google import GoogleOAuthTokenVerifier, GoogleTokenVerifier
from app.modules.auth.exceptions import (
    AccountDisabledError,
    EmailDeliveryError,
    EmailInUseError,
    InvalidAccessTokenError,
    InvalidCredentialsError,
    InvalidGoogleTokenError,
    InvalidOtpError,
    OtpRateLimitedError,
    PhoneInUseError,
    RoleMismatchError,
    TooManyOtpAttemptsError,
)
from app.modules.auth.model import AuthOtp, AuthUser, OtpPurpose, RevokedAccessToken, UserRole
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schema import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    NextStepResponse,
    OtpStartRequest,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    SessionResponse,
    UpdateMeRequest,
    UserResponse,
    VerifyOtpRequest,
)
from app.modules.providers.model import ProviderProfile
from app.modules.providers.repository import ProviderRepository

OTP_TTL = timedelta(minutes=10)
OTP_RESEND_COOLDOWN = timedelta(seconds=60)
OTP_HOURLY_LIMIT = 5
OTP_MAX_ATTEMPTS = 5

OtpFactory = Callable[[], str]


def default_otp_factory() -> str:
    return f"{randbelow(1_000_000):06d}"


def unusable_password_hash() -> str:
    """Passwordless and Google accounts get a random secret nobody knows."""
    return hash_secret(token_urlsafe(32))


def _seconds_until(moment: datetime, now: datetime) -> int:
    return max(1, ceil((moment - now).total_seconds()))


class AuthService:
    def __init__(
        self,
        *,
        email_client: OtpEmailClient | None = None,
        otp_factory: OtpFactory = default_otp_factory,
        google_token_verifier: GoogleTokenVerifier | None = None,
    ) -> None:
        self.email_client = email_client or get_otp_email_client()
        self.otp_factory = otp_factory
        self.google_token_verifier = google_token_verifier or GoogleOAuthTokenVerifier()

    # ── Passwordless sign-in (customers and providers) ────────────────────────────

    def start_otp(self, db: Session, payload: OtpStartRequest) -> NextStepResponse:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is None or not user.email_verified:
            return NextStepResponse(next="details")
        self._ensure_can_sign_in(user, UserRole(payload.role))
        self._issue_otp(repo, user=user, purpose=OtpPurpose.LOGIN)
        db.commit()
        return NextStepResponse(next="otp")

    def register(self, db: Session, payload: RegisterRequest) -> NextStepResponse:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is not None and user.email_verified:
            raise EmailInUseError
        if user is None:
            # An unverified account from an abandoned sign-up is reused, so people can simply try again.
            user = repo.add_user(
                AuthUser(email=payload.email, password_hash=unusable_password_hash(), role=UserRole(payload.role))
            )
        user.name = payload.name
        user.role = UserRole(payload.role)
        # Optional: customers who set one can later log in with email + password.
        user.password_hash = hash_secret(payload.password) if payload.password else unusable_password_hash()
        self._claim_phone(db, repo, user=user, phone=payload.phone)
        self._issue_otp(repo, user=user, purpose=OtpPurpose.SIGNUP)
        self._commit(db)
        return NextStepResponse(next="otp")

    def verify_otp(self, db: Session, payload: VerifyOtpRequest) -> SessionResponse:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is None:
            raise InvalidOtpError
        if not user.is_active:
            raise AccountDisabledError
        purpose = OtpPurpose(payload.purpose)
        self._consume_otp(db, repo, user=user, otp=payload.otp, purpose=purpose)
        if purpose == OtpPurpose.SIGNUP:
            user.email_verified = True
            providers = ProviderRepository(db)
            if user.role == UserRole.PROVIDER and providers.get_status(user.id) is None:
                providers.add_profile(ProviderProfile(user_id=user.id))
        db.commit()
        return self._session(db, user)

    def resend_otp(self, db: Session, payload: ResendOtpRequest) -> NextStepResponse:
        """Always answers the same way so the endpoint can't be used to discover accounts."""
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        purpose = OtpPurpose(payload.purpose)
        # Signup codes are for unverified accounts, login codes for verified ones.
        if user is not None and user.is_active and user.email_verified == (purpose == OtpPurpose.LOGIN):
            self._issue_otp(repo, user=user, purpose=purpose)
            db.commit()
        return NextStepResponse(next="otp")

    def google_login(self, db: Session, payload: GoogleLoginRequest) -> SessionResponse:
        id_info = self._verify_google_payload(payload.id_token)
        google_sub = str(id_info["sub"])
        email = str(id_info["email"]).lower()

        repo = AuthRepository(db)
        user = repo.get_user_by_google_sub(google_sub) or repo.get_user_by_email(email)
        if user is None:
            user = repo.add_user(
                AuthUser(
                    email=email,
                    password_hash=unusable_password_hash(),
                    role=UserRole.CUSTOMER,
                    email_verified=True,
                    auth_provider="google",
                    google_sub=google_sub,
                )
            )
        else:
            if user.google_sub not in (None, google_sub):
                raise EmailInUseError
            if user.role != UserRole.CUSTOMER:
                raise RoleMismatchError(user.role)
            user.google_sub = google_sub
            user.email_verified = True
        if not user.is_active:
            raise AccountDisabledError

        google_name = str(id_info.get("name") or "").strip()[:80]
        user.name = user.name or google_name or None
        user.avatar_url = str(id_info.get("picture") or "") or user.avatar_url
        self._commit(db)
        return self._session(db, user)

    # ── Current user ─────────────────────────────────────────────────────────────

    def authenticate(self, db: Session, token: str) -> AuthUser:
        user, _ = self._access_token_user(db, token)
        if db.get(RevokedAccessToken, access_token_hash(token)):
            raise InvalidAccessTokenError
        return user

    def me(self, db: Session, user: AuthUser) -> UserResponse:
        return self._user_response(db, user)

    def update_me(self, db: Session, user: AuthUser, payload: UpdateMeRequest) -> UserResponse:
        if payload.name is not None:
            user.name = payload.name
        if payload.phone is not None:
            self._claim_phone(db, AuthRepository(db), user=user, phone=payload.phone)
        self._commit(db)
        return self._user_response(db, user)

    def logout(self, db: Session, token: str) -> None:
        _, claims = self._access_token_user(db, token)
        # Dialect-level conflict handling makes concurrent/repeated logout idempotent.
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert

        insert = sqlite_insert if db.get_bind().dialect.name == "sqlite" else pg_insert
        db.execute(insert(RevokedAccessToken).values(
            token_hash=access_token_hash(token),
            expires_at=datetime.fromtimestamp(claims["exp"], timezone.utc),
        ).on_conflict_do_nothing(index_elements=["token_hash"]))
        db.commit()

    # ── Email + password (administrators; customers who set a password) ──────────

    def create_admin(self, db: Session, *, email: str, password: str, name: str) -> AuthUser:
        repo = AuthRepository(db)
        if repo.get_user_by_email(email):
            raise EmailInUseError
        user = repo.add_user(
            AuthUser(
                email=email, name=name, password_hash=hash_secret(password),
                role=UserRole.ADMIN, email_verified=True,
            )
        )
        db.commit()
        return user

    def login(self, db: Session, payload: LoginRequest) -> SessionResponse:
        """Administrators, and customers who set a password at sign-up. Others have an unusable hash."""
        user = AuthRepository(db).get_user_by_email(payload.email)
        if (
            user is None
            or user.role not in (UserRole.ADMIN, UserRole.CUSTOMER)
            or not user.is_active
            or not user.email_verified
            or not verify_secret(payload.password, user.password_hash)
        ):
            raise InvalidCredentialsError
        return self._session(db, user)

    def forgot_password(self, db: Session, payload: ForgotPasswordRequest) -> None:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is not None and user.role == UserRole.ADMIN and user.is_active:
            self._issue_otp(repo, user=user, purpose=OtpPurpose.PASSWORD_RESET)
            db.commit()

    def reset_password(self, db: Session, payload: ResetPasswordRequest) -> None:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is None or user.role != UserRole.ADMIN:
            raise InvalidOtpError
        self._consume_otp(db, repo, user=user, otp=payload.otp, purpose=OtpPurpose.PASSWORD_RESET)
        user.password_hash = hash_secret(payload.new_password)
        db.commit()

    # ── Internals ────────────────────────────────────────────────────────────────

    def _session(self, db: Session, user: AuthUser) -> SessionResponse:
        return SessionResponse(
            access_token=create_access_token(subject=user.id, role=user.role.value),
            user=self._user_response(db, user),
        )

    def _user_response(self, db: Session, user: AuthUser) -> UserResponse:
        status = ProviderRepository(db).get_status(user.id) if user.role == UserRole.PROVIDER else None
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            role=user.role.value,
            avatar_url=user.avatar_url,
            onboarding_status=status.value if status else None,
        )

    def _ensure_can_sign_in(self, user: AuthUser, role: UserRole) -> None:
        if user.role != role:
            raise RoleMismatchError(user.role)
        if not user.is_active:
            raise AccountDisabledError

    def _claim_phone(self, db: Session, repo: AuthRepository, *, user: AuthUser, phone: str) -> None:
        holder = repo.get_user_by_phone(phone)
        if holder is not None and holder.id != user.id:
            if holder.email_verified:
                raise PhoneInUseError
            # Release the number from an abandoned, never-verified sign-up.
            holder.phone = None
            db.flush()
        user.phone = phone

    def _commit(self, db: Session) -> None:
        """Commit, turning a lost race on the unique email/phone indexes into a clean 409."""
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            raise EmailInUseError("This email or mobile number is already registered") from error

    def _access_token_user(self, db: Session, token: str) -> tuple[AuthUser, dict[str, object]]:
        try:
            claims = decode_access_token(token)
        except ValueError as error:
            raise InvalidAccessTokenError from error
        user = db.get(AuthUser, claims["sub"])
        if not user or not user.is_active or not user.email_verified or user.role.value != claims["role"]:
            raise InvalidAccessTokenError
        return user, claims

    def _verify_google_payload(self, id_token: str) -> dict[str, object]:
        try:
            id_info = self.google_token_verifier.verify(id_token)
        except ValueError as error:
            raise InvalidGoogleTokenError from error
        if not id_info.get("sub") or not id_info.get("email") or id_info.get("email_verified") is not True:
            raise InvalidGoogleTokenError
        return id_info

    def _issue_otp(self, repo: AuthRepository, *, user: AuthUser, purpose: OtpPurpose) -> None:
        now = utc_now()
        window_start = now - timedelta(hours=1)
        issued, oldest, newest = repo.otp_window(user_id=user.id, purpose=purpose, since=window_start)
        if newest is not None and newest + OTP_RESEND_COOLDOWN > now:
            raise OtpRateLimitedError(_seconds_until(newest + OTP_RESEND_COOLDOWN, now))
        if issued >= OTP_HOURLY_LIMIT and oldest is not None:
            raise OtpRateLimitedError(_seconds_until(oldest + timedelta(hours=1), now))

        repo.close_open_otps(user_id=user.id, purpose=purpose, now=now)
        otp = self.otp_factory()
        repo.add_otp(
            AuthOtp(
                user_id=user.id, purpose=purpose, otp_hash=hash_secret(otp),
                expires_at=now + OTP_TTL, created_at=now,
            )
        )
        try:
            self.email_client.send_otp(
                to_email=user.email, otp=otp, purpose=purpose.value,
                expires_minutes=int(OTP_TTL.total_seconds() // 60),
            )
        except RuntimeError as error:
            raise EmailDeliveryError from error

    def _consume_otp(
        self, db: Session, repo: AuthRepository, *, user: AuthUser, otp: str, purpose: OtpPurpose
    ) -> AuthOtp:
        now = utc_now()
        record = repo.latest_open_otp_for_update(user_id=user.id, purpose=purpose, now=now)
        if record is None:
            raise InvalidOtpError
        if not verify_secret(otp, record.otp_hash):
            record.attempts += 1
            exhausted = record.attempts >= OTP_MAX_ATTEMPTS
            if exhausted:
                record.consumed_at = now
            # Persist the failed attempt even though this request fails.
            db.commit()
            raise TooManyOtpAttemptsError if exhausted else InvalidOtpError
        record.consumed_at = now
        return record
