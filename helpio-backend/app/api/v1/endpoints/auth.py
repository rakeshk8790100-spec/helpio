from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_auth_service, get_bearer_token
from app.modules.auth.exceptions import AuthError
from app.modules.auth.schema import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def handle_auth_error(error: AuthError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.detail,
                         headers={"WWW-Authenticate": "Bearer"} if error.status_code == 401 else None)


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> SignupResponse:
    try:
        return service.signup(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return service.login(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error


@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return service.google_login(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(
    payload: VerifyOtpRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> VerifyOtpResponse:
    try:
        return service.verify_otp(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    try:
        service.forgot_password(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error
    return MessageResponse(message="If the email exists, a reset OTP has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    try:
        service.reset_password(db, payload)
    except AuthError as error:
        raise handle_auth_error(error) from error
    return MessageResponse(message="Password has been reset")


@router.post("/logout", response_model=MessageResponse)
def logout(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    try:
        service.logout(db, token)
    except AuthError as error:
        raise handle_auth_error(error) from error
    return MessageResponse(message="Logged out successfully")
