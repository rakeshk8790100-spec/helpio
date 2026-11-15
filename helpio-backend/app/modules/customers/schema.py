import re
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from app.modules.customers.model import AddressLabel

MAX_ADDRESSES = 5
# Favourite services: 8 in all; the popup after sign-in keeps coming back until all 8 are saved
MAX_FAVORITES = 8

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


# ----- Favourite services -----

SkillId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
# A service the customer typed because it isn't in the catalog, e.g. "Solar panel cleaning"
ServiceName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)]


def unique(ids: list[str]) -> list[str]:
    """Drop repeats, keeping the first order."""
    return list(dict.fromkeys(ids))


def name_key(name: str) -> str:
    """"Solar Panel  cleaning!" → "solar-panel-cleaning": one key for the same request typed differently."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60]


def unique_names(names: list[str]) -> list[str]:
    """Collapse spaces and drop names that mean the same, keeping the first spelling."""
    kept: dict[str, str] = {}
    for name in names:
        name = " ".join(name.split())
        key = name_key(name)
        if not key:
            raise ValueError("Type a service name with letters or numbers")
        kept.setdefault(key, name)
    return list(kept.values())


class FavoritesChoice(BaseModel):
    skill_ids: list[SkillId] = []
    # Typed names not found in the catalog; each becomes a request for an admin to add
    service_names: list[ServiceName] = []

    @field_validator("skill_ids")
    @classmethod
    def unique_ids(cls, ids: list[str]) -> list[str]:
        return unique(ids)

    @field_validator("service_names")
    @classmethod
    def unique_service_names(cls, names: list[str]) -> list[str]:
        return unique_names(names)

    @model_validator(mode="after")
    def at_most_total(self) -> "FavoritesChoice":
        if len(self.skill_ids) + len(self.service_names) > MAX_FAVORITES:
            raise ValueError(f"Pick up to {MAX_FAVORITES} favourite services")
        return self


class FavoritesAddRequest(FavoritesChoice):
    """Picks from one popup, added to the ones saved before."""

    @model_validator(mode="after")
    def at_least_one(self) -> "FavoritesAddRequest":
        if not self.skill_ids and not self.service_names:
            raise ValueError("Pick at least one service")
        return self


class FavoritesReplaceRequest(FavoritesChoice):
    """The whole set, from the profile. Pending requests left out are withdrawn."""


class FavoriteRequestResponse(BaseModel):
    id: str
    name: str


class FavoritesResponse(BaseModel):
    # Oldest first
    skill_ids: list[str]
    # Typed services waiting for an admin; they count toward the 8
    requests: list[FavoriteRequestResponse] = []
    # Show the popup at the next sign-in or visit: fewer than 8 favourites
    prompt_open: bool
