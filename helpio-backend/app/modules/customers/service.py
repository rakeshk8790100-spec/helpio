from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.model import AuthUser
from app.modules.customers.exceptions import AddressNotFoundError, TooManyAddressesError
from app.modules.customers.model import CustomerAddress
from app.modules.customers.schema import (
    MAX_ADDRESSES,
    AddressResponse,
    CreateAddressRequest,
    UpdateAddressRequest,
)


def list_addresses(db: Session, user_id: str) -> Sequence[CustomerAddress]:
    """Default first, then oldest first."""
    return db.scalars(
        select(CustomerAddress)
        .where(CustomerAddress.user_id == user_id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at)
    ).all()


class CustomerService:
    def addresses(self, db: Session, user: AuthUser) -> list[AddressResponse]:
        return [self._response(item) for item in list_addresses(db, user.id)]

    def add_address(self, db: Session, user: AuthUser, payload: CreateAddressRequest) -> list[AddressResponse]:
        existing = list_addresses(db, user.id)
        if len(existing) >= MAX_ADDRESSES:
            raise TooManyAddressesError(MAX_ADDRESSES)
        address = CustomerAddress(user_id=user.id, **payload.model_dump(exclude={"is_default"}))
        db.add(address)
        # The first address is the default; asking for default moves it
        self._make_default(db, existing, address, payload.is_default or not existing)
        db.commit()
        return self.addresses(db, user)

    def update_address(
        self, db: Session, user: AuthUser, address_id: str, payload: UpdateAddressRequest
    ) -> list[AddressResponse]:
        existing = list_addresses(db, user.id)
        address = self._find(existing, address_id)
        for name, value in payload.model_dump(exclude_unset=True, exclude={"is_default"}).items():
            if name in ("label", "area_name", "pincode") and value is None:
                continue
            setattr(address, name, value)
        if payload.is_default:
            self._make_default(db, existing, address, True)
        db.commit()
        return self.addresses(db, user)

    def delete_address(self, db: Session, user: AuthUser, address_id: str) -> list[AddressResponse]:
        existing = list_addresses(db, user.id)
        address = self._find(existing, address_id)
        db.delete(address)
        rest = [item for item in existing if item.id != address.id]
        db.flush()
        # Deleting the default promotes the next one
        if address.is_default and rest:
            rest[0].is_default = True
        db.commit()
        return self.addresses(db, user)

    def _find(self, existing: Sequence[CustomerAddress], address_id: str) -> CustomerAddress:
        address = next((item for item in existing if item.id == address_id), None)
        if address is None:
            raise AddressNotFoundError
        return address

    def _make_default(
        self, db: Session, existing: Sequence[CustomerAddress], address: CustomerAddress, make: bool
    ) -> None:
        if not make:
            return
        for item in existing:
            item.is_default = False
        # Clear the old default first: the database allows one default per customer
        db.flush()
        address.is_default = True

    def _response(self, address: CustomerAddress) -> AddressResponse:
        return AddressResponse(
            id=address.id, label=address.label, address_line=address.address_line, area_name=address.area_name,
            pincode=address.pincode, latitude=address.latitude, longitude=address.longitude,
            is_default=address.is_default,
        )
