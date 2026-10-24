from __future__ import annotations

from datetime import datetime, time
from enum import StrEnum

from sqlalchemy import ForeignKey, Numeric, SmallInteger, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UtcDateTime, str_enum, utc_now
from app.modules.catalog.model import CatalogSkill


class OnboardingStatus(StrEnum):
    """Forward-only provider sign-up progress; the value names the next step to complete."""

    SKILLS = "skills"
    SERVICE_SETUP = "service_setup"
    COMPLETE = "complete"


class Proficiency(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    EXPERT = "expert"


class ProviderProfile(Base):
    __tablename__ = "provider_profiles"

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("auth_users.id", ondelete="CASCADE"), primary_key=True
    )
    onboarding_status: Mapped[OnboardingStatus] = mapped_column(
        str_enum(OnboardingStatus), nullable=False, default=OnboardingStatus.SKILLS
    )
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6, asdecimal=False), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(6), nullable=True)
    area_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    radius_km: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UtcDateTime, nullable=False, default=utc_now, onupdate=utc_now)

    skills: Mapped[list[ProviderSkill]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="ProviderSkill.skill_id"
    )
    availability: Mapped[list[ProviderAvailability]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="ProviderAvailability.day_of_week"
    )


class ProviderSkill(Base):
    __tablename__ = "provider_skills"

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("provider_profiles.user_id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        String(60), ForeignKey("catalog_skills.id", ondelete="RESTRICT"), primary_key=True
    )
    proficiency: Mapped[Proficiency] = mapped_column(str_enum(Proficiency), nullable=False)
    years_experience: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    skill: Mapped[CatalogSkill] = relationship(lazy="joined")


class ProviderAvailability(Base):
    __tablename__ = "provider_availability"

    user_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("provider_profiles.user_id", ondelete="CASCADE"), primary_key=True
    )
    # ISO weekday index: 0 = Monday ... 6 = Sunday
    day_of_week: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
