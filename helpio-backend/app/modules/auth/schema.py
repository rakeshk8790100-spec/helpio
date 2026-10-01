from typing import Literal

from pydantic import BaseModel, EmailStr, Field

AuthRole = Literal["admin", "customer", "provider"]
GoogleAuthRole = Literal["customer", "provider"]
OtpPurpose = Literal["signup", "password_reset"]


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: AuthRole


class SignupResponse(BaseModel):
    id: str
    email: EmailStr
    role: AuthRole
    email_verified: bool
    requires_verification: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)
    role: GoogleAuthRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    purpose: OtpPurpose = "signup"


class VerifyOtpResponse(BaseModel):
    email: EmailStr
    email_verified: bool


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)
