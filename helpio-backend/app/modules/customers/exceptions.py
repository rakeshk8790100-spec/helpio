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
