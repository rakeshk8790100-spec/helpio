from app.core.exceptions import AppError

BEARER_CHALLENGE = {"WWW-Authenticate": "Bearer"}
ROLE_LABELS = {"admin": "an administrator", "customer": "a customer", "provider": "a professional"}
# Customers and providers have separate login pages; point people at theirs.
LOGIN_HINTS = {"admin": "", "customer": " Use the customer login.", "provider": " Use the professional login."}


class AuthError(AppError):
    detail = "Authentication failed"


class EmailInUseError(AuthError):
    status_code = 409
    detail = "This email is already registered. Log in instead."


class PhoneInUseError(AuthError):
    status_code = 409
    detail = "This mobile number is already registered with another account"


class RoleMismatchError(AuthError):
    status_code = 409

    def __init__(self, registered_role: str) -> None:
        super().__init__(
            f"This email is registered as {ROLE_LABELS[registered_role]} account.{LOGIN_HINTS[registered_role]}"
        )


class InvalidCredentialsError(AuthError):
    status_code = 401
    detail = "Invalid email or password"
    headers = BEARER_CHALLENGE


class AccountDisabledError(AuthError):
    status_code = 403
    detail = "This account is disabled. Contact support."


class InvalidOtpError(AuthError):
    status_code = 400
    detail = "Invalid or expired code"


class TooManyOtpAttemptsError(AuthError):
    status_code = 429
    detail = "Too many wrong attempts. Request a new code."


class OtpRateLimitedError(AuthError):
    status_code = 429

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(
            f"Please wait {retry_after_seconds} seconds before requesting a new code",
            headers={"Retry-After": str(retry_after_seconds)},
        )


class InvalidGoogleTokenError(AuthError):
    status_code = 401
    detail = "Invalid Google token"
    headers = BEARER_CHALLENGE


class EmailDeliveryError(AuthError):
    status_code = 503
    detail = "Email service is unavailable. Try again shortly."


class InvalidAccessTokenError(AuthError):
    status_code = 401
    detail = "Invalid or expired access token"
    headers = BEARER_CHALLENGE


class ForbiddenError(AuthError):
    status_code = 403
    detail = "You don't have access to this resource"


class WrongCurrentPasswordError(AuthError):
    status_code = 400
    detail = "Your current password is incorrect. Signed up with Google? Use Forgot password to set one."


class SamePasswordError(AuthError):
    status_code = 400
    detail = "Choose a password different from your current one"


class UnsupportedAvatarError(AuthError):
    status_code = 422
    detail = "Use a JPG, PNG or WebP photo up to 5 MB"


class UseAdminLoginError(AuthError):
    status_code = 403
    detail = "Administrators log in at the admin console."


class AccountPendingError(AuthError):
    status_code = 403
    detail = "Your account is waiting for approval. We'll email you once it's approved."


class AccountRejectedError(AuthError):
    status_code = 403

    def __init__(self, note: str | None = None) -> None:
        super().__init__("Your account wasn't approved." + (f" {note}" if note else ""))
