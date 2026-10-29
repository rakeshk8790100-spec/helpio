from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints, model_validator

Email = Annotated[EmailStr, AfterValidator(str.lower)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
# Indian mobile number as typed (10 digits), stored in E.164 form.
IndianMobile = Annotated[str, Field(pattern=r"^[6-9]\d{9}$"), AfterValidator(lambda digits: f"+91{digits}")]
Otp = Annotated[str, Field(pattern=r"^\d{6}$")]
NewPassword = Annotated[str, Field(min_length=8, max_length=128)]
SelfServiceRole = Literal["customer", "provider"]


class RegisterRequest(BaseModel):
    name: PersonName
    email: Email
    phone: IndianMobile
    role: SelfServiceRole
    password: NewPassword


class AdminAccessRequest(BaseModel):
    """Asking for admin console access: the owner approves it before the first log-in."""

    name: PersonName
    email: Email
    phone: IndianMobile
    password: NewPassword


class SignupCodeResponse(BaseModel):
    # Where the code went
    email: str
    # Seconds before another code can be requested
    resend_in: int
    expires_in_minutes: int


class VerifySignupRequest(BaseModel):
    email: Email
    otp: Otp


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1, max_length=4096)


class UpdateMeRequest(BaseModel):
    name: PersonName | None = None
    phone: IndianMobile | None = None

    @model_validator(mode="after")
    def require_a_field(self) -> "UpdateMeRequest":
        if self.name is None and self.phone is None:
            raise ValueError("Provide name or phone")
        return self


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None
    phone: str | None
    role: Literal["admin", "customer", "provider"]
    avatar_url: str | None
    # Providers only: the next sign-up step, or "complete".
    onboarding_status: Literal["skills", "service_setup", "complete"] | None
    # Customers only: favourite services, and whether to show the popup at sign-in
    favorite_skill_ids: list[str] = []
    favorites_prompt_open: bool = False
    # Admins only: the owner, who manages other admins and the API keys
    is_owner: bool = False
    # pending: a provider waiting for Helpio's verification (customers can't log in until approved)
    approval_status: Literal["approved", "pending", "rejected"] = "approved"


class PendingApprovalResponse(BaseModel):
    """A new customer account waiting for an admin: no session until it's approved."""

    email: str
    approval_status: Literal["pending"] = "pending"


class SessionResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)
    # Sent by the customer and provider login pages so each only signs in its own audience.
    # Administrators omit it.
    role: SelfServiceRole | None = None


class ForgotPasswordRequest(BaseModel):
    email: Email


class ResetPasswordRequest(BaseModel):
    email: Email
    otp: Otp
    new_password: NewPassword


class MessageResponse(BaseModel):
    message: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: NewPassword
