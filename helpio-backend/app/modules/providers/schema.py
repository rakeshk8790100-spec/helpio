from datetime import time
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.modules.providers.model import OnboardingStatus, Proficiency

MIN_SKILLS = 3
MAX_SKILLS = 15


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
    radius_km: int = Field(ge=1, le=50)

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
    radius_km: int


class OnboardingResponse(BaseModel):
    status: OnboardingStatus
    skills: list[ProviderSkillResponse]
    availability: list[AvailabilitySlot]
    service_area: ServiceAreaResponse | None
