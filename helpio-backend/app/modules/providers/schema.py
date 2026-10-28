from datetime import datetime, time
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.modules.providers.model import OnboardingStatus, Proficiency
from app.modules.reviews.schema import PublicReviewResponse, RatingSummary

MIN_SKILLS = 4
MAX_SKILLS = 20
# Travel radius, in metres
MIN_RADIUS_M = 500
MAX_RADIUS_M = 50_000


class ProviderSkillInput(BaseModel):
    skill_id: str = Field(min_length=1, max_length=60)
    proficiency: Proficiency
    years_experience: int | None = Field(default=None, ge=0, le=60)


class SaveSkillsRequest(BaseModel):
    skills: list[ProviderSkillInput] = Field(min_length=MIN_SKILLS, max_length=MAX_SKILLS)

    @model_validator(mode="after")
    def unique_skills(self) -> "SaveSkillsRequest":
        if len({skill.skill_id for skill in self.skills}) != len(self.skills):
            raise ValueError("Each skill can be added only once")
        return self


class AvailabilitySlot(BaseModel):
    day: int = Field(ge=0, le=6, description="0 = Monday … 6 = Sunday")
    start: time
    end: time

    @model_validator(mode="after")
    def start_before_end(self) -> "AvailabilitySlot":
        if self.start >= self.end:
            raise ValueError("Start time must be before end time")
        return self


class ServiceArea(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    pincode: str = Field(pattern=r"^[1-9]\d{5}$")
    area_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]

    @model_validator(mode="after")
    def coordinates_together(self) -> "ServiceArea":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Send both latitude and longitude, or neither")
        return self


class SaveServiceSetupRequest(BaseModel):
    availability: list[AvailabilitySlot] = Field(min_length=1, max_length=7)
    service_area: ServiceArea
    radius_m: int = Field(ge=MIN_RADIUS_M, le=MAX_RADIUS_M)

    @model_validator(mode="after")
    def unique_days(self) -> "SaveServiceSetupRequest":
        if len({slot.day for slot in self.availability}) != len(self.availability):
            raise ValueError("Each day can appear only once")
        return self


class ProviderSkillResponse(BaseModel):
    skill_id: str
    skill_name: str
    category_id: str
    proficiency: Proficiency
    years_experience: int | None


class ServiceAreaResponse(ServiceArea):
    radius_m: int


class UpdateProviderProfileRequest(BaseModel):
    # Empty clears it
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]


class OnboardingResponse(BaseModel):
    status: OnboardingStatus
    bio: str | None
    skills: list[ProviderSkillResponse]
    availability: list[AvailabilitySlot]
    service_area: ServiceAreaResponse | None


# ----- Public directory: search and profile (no exact location, pincode or phone) -----


class PublicSkill(BaseModel):
    skill_id: str
    name: str
    category_id: str
    category_name: str
    proficiency: Proficiency
    years_experience: int | None


class ProviderCardResponse(BaseModel):
    id: str
    # First name and initial, e.g. "Ravi S."
    display_name: str
    avatar_url: str | None
    # First 140 characters
    bio_snippet: str | None
    area_name: str | None
    # Rounded to 0.5 km; null when matched by pincode only
    approx_distance_km: float | None
    # Skills matching the search first, up to 3
    skills: list[PublicSkill]
    skill_count: int
    top_proficiency: Proficiency
    max_years_experience: int | None
    # Working days, 0 = Monday
    work_days: list[int]
    member_since: datetime
    # Customers' ratings after finished jobs
    rating: RatingSummary


class ProviderSearchResponse(BaseModel):
    # Where the search was made from, e.g. "Mira Road"
    near: str | None
    providers: list[ProviderCardResponse]
    total: int
    page: int
    has_more: bool


class PublicCategory(BaseModel):
    id: str
    name: str
    skills: list[PublicSkill]


class ProviderProfileResponse(ProviderCardResponse):
    bio: str | None
    categories: list[PublicCategory]
    availability: list[AvailabilitySlot]
    radius_km: float | None
    # Newest first, up to 10
    reviews: list[PublicReviewResponse]
