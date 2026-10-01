from __future__ import annotations

from datetime import datetime, timedelta, timezone
from secrets import randbelow, token_urlsafe
from typing import Callable

from sqlalchemy.orm import Session

from app.core.security import access_token_hash, create_access_token, decode_access_token, hash_secret, verify_secret
from app.integrations.email import BrevoOtpEmailClient, OtpEmailClient
from app.integrations.google import GoogleOAuthTokenVerifier, GoogleTokenVerifier
from app.modules.auth.exceptions import (
    DuplicateEmailError,
    EmailDeliveryError,
    EmailVerificationRequiredError,
    InvalidCredentialsError,
    InvalidAccessTokenError,
    InvalidGoogleTokenError,
    InvalidOtpError,
)
from app.modules.auth.model import AuthOtp, AuthUser, OtpPurpose, UserRole, RevokedAccessToken
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schema import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)

OtpFactory = Callable[[], str]


def default_otp_factory() -> str:
    return f"{randbelow(1_000_000):06d}"


class AuthService:
    def __init__(
        self,
        *,
        email_client: OtpEmailClient | None = None,
        otp_factory: OtpFactory = default_otp_factory,
        google_token_verifier: GoogleTokenVerifier | None = None,
    ) -> None:
        self.email_client = email_client or BrevoOtpEmailClient()
        self.otp_factory = otp_factory
        self.google_token_verifier = google_token_verifier or GoogleOAuthTokenVerifier()

    def signup(self, db: Session, payload: SignupRequest) -> SignupResponse:
        repo = AuthRepository(db)
        email = payload.email.lower()
        if repo.get_user_by_email(email):
            raise DuplicateEmailError

        role = UserRole(payload.role)
        requires_verification = True
        user = repo.add_user(
            AuthUser(
                email=email,
                password_hash=hash_secret(payload.password),
                role=role,
                email_verified=not requires_verification,
                auth_provider="email",
            )
        )
        if requires_verification:
            self._create_and_send_otp(repo, user=user, purpose=OtpPurpose.SIGNUP)
        db.commit()
        db.refresh(user)
        return SignupResponse(
            id=user.id,
            email=user.email,
            role=user.role.value,
            email_verified=user.email_verified,
            requires_verification=requires_verification,
        )

    def _access_token_user(self, db: Session, token: str) -> tuple[AuthUser, dict[str, object]]:
        try:
            claims = decode_access_token(token)
        except ValueError as error:
            raise InvalidAccessTokenError from error
        user = db.get(AuthUser, claims["sub"])
        if not user or not user.is_active or not user.email_verified or user.role.value != claims["role"]:
            raise InvalidAccessTokenError
        return user, claims

    def authenticate(self, db: Session, token: str) -> AuthUser:
        user, _ = self._access_token_user(db, token)
        if db.get(RevokedAccessToken, access_token_hash(token)):
            raise InvalidAccessTokenError
        return user

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

    def login(self, db: Session, payload: LoginRequest) -> TokenResponse:
        user = AuthRepository(db).get_user_by_email(payload.email.lower())
        if not user or not verify_secret(payload.password, user.password_hash) or not user.is_active:
            raise InvalidCredentialsError
        if not user.email_verified:
            raise EmailVerificationRequiredError
        return TokenResponse(access_token=create_access_token(subject=user.id, role=user.role.value))

    def google_login(self, db: Session, payload: GoogleLoginRequest) -> TokenResponse:
        id_info = self._verify_google_payload(payload.id_token)
        google_sub = str(id_info["sub"])
        email = str(id_info["email"]).lower()
        role = UserRole(payload.role)

        repo = AuthRepository(db)
        user = repo.get_user_by_google_sub(google_sub)
        if not user:
            user = repo.get_user_by_email(email)
            if user and user.google_sub and user.google_sub != google_sub:
                raise DuplicateEmailError
            if user and user.role != role:
                raise DuplicateEmailError
            if user:
                user.google_sub = google_sub
                user.auth_provider = "google"
                user.email_verified = True
            else:
                user = repo.add_user(
                    AuthUser(
                        email=email,
                        password_hash=hash_secret(token_urlsafe(32)),
                        role=role,
                        email_verified=True,
                        auth_provider="google",
                        google_sub=google_sub,
                    )
                )
        if not user.is_active:
            raise InvalidCredentialsError
        db.commit()
        db.refresh(user)
        return TokenResponse(access_token=create_access_token(subject=user.id, role=user.role.value))

    def verify_otp(self, db: Session, payload: VerifyOtpRequest) -> VerifyOtpResponse:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email.lower())
        if not user:
            raise InvalidOtpError
        otp = self._consume_otp(repo, user=user, otp=payload.otp, purpose=OtpPurpose(payload.purpose))
        if otp.purpose == OtpPurpose.SIGNUP:
            user.email_verified = True
        db.commit()
        db.refresh(user)
        return VerifyOtpResponse(email=user.email, email_verified=user.email_verified)

    def forgot_password(self, db: Session, payload: ForgotPasswordRequest) -> None:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email.lower())
        if user:
            self._create_and_send_otp(repo, user=user, purpose=OtpPurpose.PASSWORD_RESET)
            db.commit()

    def reset_password(self, db: Session, payload: ResetPasswordRequest) -> None:
        repo = AuthRepository(db)
        user = repo.get_user_by_email(payload.email.lower())
        if not user:
            raise InvalidOtpError
        self._consume_otp(repo, user=user, otp=payload.otp, purpose=OtpPurpose.PASSWORD_RESET)
        user.password_hash = hash_secret(payload.new_password)
        db.commit()

    def _verify_google_payload(self, id_token: str) -> dict[str, object]:
        try:
            id_info = self.google_token_verifier.verify(id_token)
        except ValueError as error:
            raise InvalidGoogleTokenError from error
        if not id_info.get("sub") or not id_info.get("email") or id_info.get("email_verified") is not True:
            raise InvalidGoogleTokenError
        return id_info

    def _create_and_send_otp(self, repo: AuthRepository, *, user: AuthUser, purpose: OtpPurpose) -> None:
        otp = self.otp_factory()
        repo.add_otp(
            AuthOtp(
                user_id=user.id,
                purpose=purpose,
                otp_hash=hash_secret(otp),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
        )
        try:
            self.email_client.send_otp(to_email=user.email, otp=otp, purpose=purpose.value)
        except RuntimeError as error:
            raise EmailDeliveryError from error

    def _consume_otp(
        self, repo: AuthRepository, *, user: AuthUser, otp: str, purpose: OtpPurpose
    ) -> AuthOtp:
        now = datetime.now(timezone.utc)
        record = repo.latest_open_otp(user_id=user.id, purpose=purpose, now=now)
        if not record or not verify_secret(otp, record.otp_hash):
            raise InvalidOtpError
        record.consumed_at = now
        return record
