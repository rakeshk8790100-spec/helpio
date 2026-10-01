class AuthError(Exception):
    status_code = 400
    detail = "Authentication failed"


class DuplicateEmailError(AuthError):
    status_code = 409
    detail = "Email is already registered"


class InvalidCredentialsError(AuthError):
    status_code = 401
    detail = "Invalid email or password"


class EmailVerificationRequiredError(AuthError):
    status_code = 403
    detail = "Email verification is required before login"


class InvalidOtpError(AuthError):
    status_code = 400
    detail = "Invalid or expired OTP"


class InvalidGoogleTokenError(AuthError):
    status_code = 401
    detail = "Invalid Google token"

class EmailDeliveryError(AuthError):
    status_code = 503
    detail = "Email service is unavailable"



class InvalidAccessTokenError(AuthError):
    status_code = 401
    detail = "Invalid or expired access token"
