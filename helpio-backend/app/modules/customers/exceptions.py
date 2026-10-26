from app.core.exceptions import AppError


class CustomerError(AppError):
    detail = "Request failed"


class AddressNotFoundError(CustomerError):
    status_code = 404
    detail = "Address not found"


class TooManyAddressesError(CustomerError):
    status_code = 409

    def __init__(self, limit: int) -> None:
        super().__init__(f"You can save up to {limit} addresses. Remove one first.")


class UnknownSkillError(CustomerError):
    status_code = 422
    detail = "One of these services doesn't exist"


class FavoritesLimitError(CustomerError):
    status_code = 422

    def __init__(self, limit: int) -> None:
        super().__init__(f"You can have up to {limit} favourite services. Remove one in your profile first.")
