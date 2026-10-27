from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_auth_service, get_bearer_token, get_current_user
from app.modules.auth.model import AuthUser
from app.modules.auth.schema import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    SessionResponse,
    SignupCodeResponse,
    UpdateMeRequest,
    UserResponse,
    VerifySignupRequest,
)
from app.modules.auth.service import MAX_AVATAR_BYTES, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Sign-up and log-in ───────────────────────────────────────────────────────


@router.post("/register", response_model=SignupCodeResponse, status_code=status.HTTP_202_ACCEPTED)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SignupCodeResponse:
    """
    Customers and providers, step 1: email a 6-digit code to prove the address. Nothing is created yet.
    Send the same details again to resend (one code a minute, 5 an hour; each lasts 10 minutes).
    """
    return service.register(db, payload)


@router.post("/register/verify", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def verify_signup(
    payload: VerifySignupRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Step 2: the emailed code creates the account with a verified email and signs in (5 wrong tries end it)."""
    return service.verify_signup(db, payload)


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Email + password. `role` keeps the customer and provider login pages to their own audience."""
    return service.login(db, payload)


@router.post("/google", response_model=SessionResponse)
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Customers only: verify a Google ID token and sign in, creating the account if needed."""
    return service.google_login(db, payload)


# ── Forgotten password ───────────────────────────────────────────────────────


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


@router.post("/change-password", response_model=SessionResponse)
def change_password(
    payload: ChangePasswordRequest,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    """Checks the current password, signs out other devices and returns a fresh session for this one."""
    return service.change_password(db, user, payload)


@router.post("/me/avatar", response_model=UserResponse)
async def set_avatar(
    file: UploadFile = File(description="JPG, PNG or WebP, up to 5 MB"),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Profile photo, stored on Cloudinary; its URL is saved as `avatar_url`."""
    content = await file.read(MAX_AVATAR_BYTES + 1)
    return service.set_avatar(db, user, content, file.content_type or "")


@router.delete("/me/avatar", response_model=UserResponse)
def remove_avatar(
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return service.remove_avatar(db, user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.logout(db, token)
    return MessageResponse(message="Logged out successfully")
