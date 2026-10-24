from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_auth_service, get_bearer_token, get_current_user
from app.modules.auth.model import AuthUser
from app.modules.auth.schema import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
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
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Customers and providers: passwordless email code ─────────────────────────


@router.post("/otp/start", response_model=NextStepResponse)
def start_otp(
    payload: OtpStartRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> NextStepResponse:
    """Email a login code to an existing account, or ask the client to collect sign-up details."""
    return service.start_otp(db, payload)


@router.post("/register", response_model=NextStepResponse, status_code=status.HTTP_202_ACCEPTED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> NextStepResponse:
    return service.register(db, payload)


@router.post("/verify-otp", response_model=SessionResponse)
def verify_otp(
    payload: VerifyOtpRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    return service.verify_otp(db, payload)


@router.post("/otp/resend", response_model=NextStepResponse, status_code=status.HTTP_202_ACCEPTED)
def resend_otp(
    payload: ResendOtpRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> NextStepResponse:
    return service.resend_otp(db, payload)


@router.post("/google", response_model=SessionResponse)
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Customers only: verify a Google ID token and sign in, creating the account if needed."""
    return service.google_login(db, payload)


# ── Signed-in user ───────────────────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
def me(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return service.me(db, user)


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UpdateMeRequest,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return service.update_me(db, user, payload)


@router.post("/logout", response_model=MessageResponse)
def logout(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.logout(db, token)
    return MessageResponse(message="Logged out successfully")


# ── Email + password: administrators, and customers who set a password ───────


@router.post("/login", response_model=SessionResponse)
def password_login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Administrators, and verified customers who set a password at sign-up."""
    return service.login(db, payload)


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.forgot_password(db, payload)
    return MessageResponse(message="If the email exists, a reset code has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.reset_password(db, payload)
    return MessageResponse(message="Password has been reset")
