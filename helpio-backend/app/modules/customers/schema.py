from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.modules.customers.model import AddressLabel

MAX_ADDRESSES = 5

AreaName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]
AddressLine = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]
Pincode = Annotated[str, Field(pattern=r"^[1-9]\d{5}$")]


class AddressFields(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def coordinates_together(self) -> "AddressFields":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Send both latitude and longitude, or neither")
        return self


class CreateAddressRequest(AddressFields):
    label: AddressLabel
    address_line: AddressLine | None = None
    area_name: AreaName
    pincode: Pincode
    is_default: bool = False


class UpdateAddressRequest(AddressFields):
    label: AddressLabel | None = None
    address_line: AddressLine | None = None
    area_name: AreaName | None = None
    pincode: Pincode | None = None
    # Only `true` is meaningful: another address becomes default by setting it there
    is_default: bool | None = None


class AddressResponse(BaseModel):
    id: str
    label: AddressLabel
    address_line: str | None
    area_name: str
    pincode: str
    latitude: float | None
    longitude: float | None
    is_default: bool
