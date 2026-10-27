from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from secrets import randbelow, token_urlsafe
from typing import Callable

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.core.security import access_token_hash, create_access_token, decode_access_token, hash_secret, verify_secret
from app.integrations.cloudinary import CloudinaryStorage, FileStorage
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
    SamePasswordError,
    TooManyOtpAttemptsError,
    UnsupportedAvatarError,
    WrongCurrentPasswordError,
)
from app.modules.auth.model import AuthOtp, AuthUser, OtpPurpose, PendingSignup, RevokedAccessToken, UserRole
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schema import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionResponse,
    SignupCodeResponse,
    UpdateMeRequest,
    UserResponse,
    VerifySignupRequest,
)
from app.modules.customers.service import favorite_skill_ids, favorites_prompt_open
from app.modules.providers.model import ProviderProfile
from app.modules.providers.repository import ProviderRepository

OTP_TTL = timedelta(minutes=10)
OTP_RESEND_COOLDOWN = timedelta(seconds=60)
OTP_HOURLY_LIMIT = 5
OTP_MAX_ATTEMPTS = 5

OtpFactory = Callable[[], str]

AVATAR_TYPES = ("image/jpeg", "image/png", "image/webp")
MAX_AVATAR_BYTES = 5 * 1024 * 1024
AVATARS_FOLDER = "helpio/avatars"


def default_otp_factory() -> str:
    return f"{randbelow(1_000_000):06d}"


def unusable_password_hash() -> str:
    """Google-only accounts get a random secret nobody knows."""
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

    # ── Sign-up and log-in ───────────────────────────────────────────────────────

    def register(self, db: Session, payload: RegisterRequest) -> SignupCodeResponse:
        """
        Customer or provider sign-up, step 1: email a code to prove the address. Nothing is created yet;
        `verify_signup` creates the account. Sending the same details again resends the code.
        """
        repo = AuthRepository(db)
        # Checked before any email goes out, so the form can show the problem straight away
        if repo.get_user_by_email(payload.email) is not None:
            raise EmailInUseError
        if repo.get_user_by_phone(payload.phone) is not None:
            raise PhoneInUseError
        now = utc_now()
        self._check_rate(*repo.signup_window(email=payload.email, since=now - timedelta(hours=1)), now=now)

        repo.close_open_signups(email=payload.email, now=now)
        otp = self.otp_factory()
        repo.add_pending_signup(
            PendingSignup(
                email=payload.email, name=payload.name, phone=payload.phone, role=UserRole(payload.role),
                password_hash=hash_secret(payload.password), otp_hash=hash_secret(otp),
                expires_at=now + OTP_TTL, created_at=now,
            )
        )
        self._send_code(to_email=payload.email, otp=otp, purpose=OtpPurpose.SIGNUP)
        db.commit()
        return SignupCodeResponse(
            email=payload.email,
            resend_in=int(OTP_RESEND_COOLDOWN.total_seconds()),
            expires_in_minutes=int(OTP_TTL.total_seconds() // 60),
        )

    def verify_signup(self, db: Session, payload: VerifySignupRequest) -> SessionResponse:
        """Sign-up, step 2: the emailed code creates the account, with the email verified, and signs it in."""
        repo = AuthRepository(db)
        now = utc_now()
        signup = repo.latest_open_signup_for_update(email=payload.email, now=now)
        self._check_code(db, signup, payload.otp, now)
        # Someone may have taken the email or number while the code was on its way
        if repo.get_user_by_email(signup.email) is not None:
            raise EmailInUseError
        user = repo.add_user(
            AuthUser(
                email=signup.email, name=signup.name, password_hash=signup.password_hash, role=signup.role,
                email_verified=True,
            )
        )
        self._claim_phone(repo, user=user, phone=signup.phone)
        if user.role == UserRole.PROVIDER:
            ProviderRepository(db).add_profile(ProviderProfile(user_id=user.id))
        self._commit(db)
        return self._session(db, user)

    def login(self, db: Session, payload: LoginRequest) -> SessionResponse:
        """Email + password for everyone. The customer and provider pages send `role`; administrators don't."""
        user = AuthRepository(db).get_user_by_email(payload.email)
        if user is None or not verify_secret(payload.password, user.password_hash):
            raise InvalidCredentialsError
        if not user.is_active:
            raise AccountDisabledError
        # Checked only after the password matched, so it can't be used to discover accounts.
        if payload.role is not None and user.role != UserRole(payload.role):
            raise RoleMismatchError(user.role)
        return self._session(db, user)

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
            if not user.email_verified:
                # Whoever chose this password never proved the email; Google just did. Drop the password
                # and its sessions, so registering someone else's email doesn't keep you in their account.
                user.password_hash = unusable_password_hash()
                user.token_version += 1
            user.google_sub = google_sub
            user.email_verified = True
        if not user.is_active:
            raise AccountDisabledError

        google_name = str(id_info.get("name") or "").strip()[:80]
        user.name = user.name or google_name or None
        user.avatar_url = str(id_info.get("picture") or "") or user.avatar_url
        self._commit(db)
        return self._session(db, user)

    # ── Forgotten password ───────────────────────────────────────────────────────

    def forgot_password(self, db: Session, payload: ForgotPasswordRequest) -> None:
        """Email a reset code to an active account. The caller can't tell whether one was sent."""
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is None or not user.is_active:
            return
        try:
            self._issue_otp(repo, user=user, purpose=OtpPurpose.PASSWORD_RESET)
        except OtpRateLimitedError:
            # A 429 would confirm the account exists; the resend countdown lives in the client.
            return
        db.commit()

    def reset_password(self, db: Session, payload: ResetPasswordRequest) -> None:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email)
        if user is None or not user.is_active:
            raise InvalidOtpError
        self._consume_otp(db, repo, user=user, otp=payload.otp, purpose=OtpPurpose.PASSWORD_RESET)
        user.password_hash = hash_secret(payload.new_password)
        # The code proved the email. End every existing session, including any opened by someone
        # who registered this email before its owner did.
        user.email_verified = True
        user.token_version += 1
        db.commit()

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
            self._claim_phone(AuthRepository(db), user=user, phone=payload.phone)
        self._commit(db)
        return self._user_response(db, user)

    def change_password(self, db: Session, user: AuthUser, payload: ChangePasswordRequest) -> SessionResponse:
        """Signs out every other device; the returned session keeps this one signed in."""
        if not verify_secret(payload.current_password, user.password_hash):
            raise WrongCurrentPasswordError
        if payload.new_password == payload.current_password:
            raise SamePasswordError
        user.password_hash = hash_secret(payload.new_password)
        user.token_version += 1
        db.commit()
        return self._session(db, user)

    def set_avatar(
        self, db: Session, user: AuthUser, content: bytes, content_type: str, storage: FileStorage | None = None
    ) -> UserResponse:
        if content_type not in AVATAR_TYPES or not 0 < len(content) <= MAX_AVATAR_BYTES:
            raise UnsupportedAvatarError
        stored = (storage or CloudinaryStorage()).upload(
            content, content_type=content_type, folder=AVATARS_FOLDER, public_id=f"avatar-{token_urlsafe(12)}"
        )
        user.avatar_url = stored.url
        db.commit()
        return self._user_response(db, user)

    def remove_avatar(self, db: Session, user: AuthUser) -> UserResponse:
        user.avatar_url = None
        db.commit()
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

    # ── Administrators ───────────────────────────────────────────────────────────

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

    # ── Internals ────────────────────────────────────────────────────────────────

    def _session(self, db: Session, user: AuthUser) -> SessionResponse:
        return SessionResponse(
            access_token=create_access_token(subject=user.id, role=user.role.value, version=user.token_version),
            user=self._user_response(db, user),
        )

    def _user_response(self, db: Session, user: AuthUser) -> UserResponse:
        status = ProviderRepository(db).get_status(user.id) if user.role == UserRole.PROVIDER else None
        favorites = favorite_skill_ids(db, user.id) if user.role == UserRole.CUSTOMER else []
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            role=user.role.value,
            avatar_url=user.avatar_url,
            onboarding_status=status.value if status else None,
            favorite_skill_ids=favorites,
            favorites_prompt_open=user.role == UserRole.CUSTOMER and favorites_prompt_open(db, user.id, len(favorites)),
        )

    def _claim_phone(self, repo: AuthRepository, *, user: AuthUser, phone: str) -> None:
        holder = repo.get_user_by_phone(phone)
        if holder is not None and holder.id != user.id:
            raise PhoneInUseError
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
        if (
            not user
            or not user.is_active
            or user.role.value != claims["role"]
            or user.token_version != claims["ver"]
        ):
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
        self._check_rate(*repo.otp_window(user_id=user.id, purpose=purpose, since=now - timedelta(hours=1)), now=now)

        repo.close_open_otps(user_id=user.id, purpose=purpose, now=now)
        otp = self.otp_factory()
        repo.add_otp(
            AuthOtp(
                user_id=user.id, purpose=purpose, otp_hash=hash_secret(otp),
                expires_at=now + OTP_TTL, created_at=now,
            )
        )
        self._send_code(to_email=user.email, otp=otp, purpose=purpose)

    @staticmethod
    def _check_rate(issued: int, oldest: datetime | None, newest: datetime | None, *, now: datetime) -> None:
        """One code a minute and OTP_HOURLY_LIMIT an hour, from the codes sent in the last hour."""
        if newest is not None and newest + OTP_RESEND_COOLDOWN > now:
            raise OtpRateLimitedError(_seconds_until(newest + OTP_RESEND_COOLDOWN, now))
        if issued >= OTP_HOURLY_LIMIT and oldest is not None:
            raise OtpRateLimitedError(_seconds_until(oldest + timedelta(hours=1), now))

    def _send_code(self, *, to_email: str, otp: str, purpose: OtpPurpose) -> None:
        try:
            self.email_client.send_otp(
                to_email=to_email, otp=otp, purpose=purpose.value,
                expires_minutes=int(OTP_TTL.total_seconds() // 60),
            )
        except RuntimeError as error:
            raise EmailDeliveryError from error

    def _consume_otp(
        self, db: Session, repo: AuthRepository, *, user: AuthUser, otp: str, purpose: OtpPurpose
    ) -> AuthOtp:
        now = utc_now()
        record = repo.latest_open_otp_for_update(user_id=user.id, purpose=purpose, now=now)
        self._check_code(db, record, otp, now)
        return record

    @staticmethod
    def _check_code(db: Session, record: AuthOtp | PendingSignup | None, otp: str, now: datetime) -> None:
        """Use up a matching code; count a wrong one, closing the code after OTP_MAX_ATTEMPTS."""
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
