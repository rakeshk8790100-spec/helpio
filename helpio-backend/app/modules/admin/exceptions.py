from app.core.exceptions import AppError


class AdminError(AppError):
    detail = "Admin request failed"


class AdminLoginLockedError(AdminError):
    status_code = 429

    def __init__(self, minutes: int) -> None:
        super().__init__(f"Too many failed log-ins. Try again in {minutes} minute{'' if minutes == 1 else 's'}.")


class OwnerOnlyError(AdminError):
    status_code = 403
    detail = "Only the owner can do this"


class AdminNotFoundError(AdminError):
    status_code = 404
    detail = "Admin not found"


class OwnerProtectedError(AdminError):
    status_code = 409
    detail = "The owner's own access can't be changed here"


class AdminNotPendingError(AdminError):
    status_code = 409
    detail = "This request has already been answered"


class UserNotFoundError(AdminError):
    status_code = 404
    detail = "Customer or provider not found"


class UnknownSettingError(AdminError):
    status_code = 422

    def __init__(self, keys: list[str]) -> None:
        super().__init__("Unknown setting: " + ", ".join(keys))


class InvalidSettingError(AdminError):
    status_code = 422

    def __init__(self, label: str, problem: str) -> None:
        super().__init__(f"{label}: {problem}")


class SecretsLockedError(AdminError):
    status_code = 409
    detail = "Set SETTINGS_ENCRYPTION_KEY on the server to save keys and secrets here"


class UnknownCheckError(AdminError):
    status_code = 404
    detail = "There's no test for that service"


class JobNotCancellableError(AdminError):
    status_code = 409
    detail = "Only jobs that haven't started can be cancelled here"


class AdminJobNotFoundError(AdminError):
    status_code = 404
    detail = "Job not found"


class ReviewNotFoundError(AdminError):
    status_code = 404
    detail = "Review not found"


class CatalogItemNotFoundError(AdminError):
    status_code = 404
    detail = "Category or skill not found"


class CatalogIdTakenError(AdminError):
    status_code = 409
    detail = "Something with that name already exists"
