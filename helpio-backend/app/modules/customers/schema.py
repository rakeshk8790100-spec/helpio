from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, field_validator, model_validator

from app.modules.customers.model import AddressLabel

MAX_ADDRESSES = 5
# Favourite services: at most 8 in all, picked up to 4 per popup; 3 skips in a row stop the popup
MAX_FAVORITES = 8
MAX_PER_PROMPT = 4
MAX_SKIP_STREAK = 3

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


def unique(ids: list[str]) -> list[str]:
    """Drop repeats, keeping the first order."""
    return list(dict.fromkeys(ids))


class FavoritesAddRequest(BaseModel):
    """Picks from one popup, added to the ones saved before."""

    skill_ids: list[SkillId] = Field(min_length=1)

    @field_validator("skill_ids")
    @classmethod
    def at_most_per_prompt(cls, ids: list[str]) -> list[str]:
        ids = unique(ids)
        if len(ids) > MAX_PER_PROMPT:
            raise ValueError(f"Pick up to {MAX_PER_PROMPT} services at a time")
        return ids


class FavoritesReplaceRequest(BaseModel):
    """The whole set, from the profile."""

    skill_ids: list[SkillId]

    @field_validator("skill_ids")
    @classmethod
    def at_most_total(cls, ids: list[str]) -> list[str]:
        ids = unique(ids)
        if len(ids) > MAX_FAVORITES:
            raise ValueError(f"Pick up to {MAX_FAVORITES} favourite services")
        return ids


class FavoritesResponse(BaseModel):
    # Oldest first
    skill_ids: list[str]
    # Show the popup at the next sign-in: fewer than 8 favourites and not skipped 3 times in a row
    prompt_open: bool
