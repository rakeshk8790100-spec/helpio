from sqlalchemy.orm import Session

from app.modules.auth.model import AuthUser
from app.modules.catalog.repository import CatalogRepository
from app.modules.providers.exceptions import ProviderProfileNotFoundError, SkillsRequiredError, UnknownSkillError
from app.modules.providers.model import OnboardingStatus, ProviderAvailability, ProviderProfile, ProviderSkill
from app.modules.providers.repository import ProviderRepository
from app.modules.providers.schema import (
    AvailabilitySlot,
    OnboardingResponse,
    ProviderSkillResponse,
    SaveServiceSetupRequest,
    SaveSkillsRequest,
    ServiceAreaResponse,
)


class ProviderService:
    def get_onboarding(self, db: Session, user: AuthUser) -> OnboardingResponse:
        return self._response(self._profile(db, user))

    def save_skills(self, db: Session, user: AuthUser, payload: SaveSkillsRequest) -> OnboardingResponse:
        profile = self._profile(db, user)
        requested = [skill.skill_id for skill in payload.skills]
        unknown = set(requested) - CatalogRepository(db).existing_skill_ids(requested)
        if unknown:
            raise UnknownSkillError(list(unknown))

        profile.skills = [
            ProviderSkill(
                user_id=profile.user_id, skill_id=skill.skill_id,
                proficiency=skill.proficiency, years_experience=skill.years_experience,
            )
            for skill in payload.skills
        ]
        if profile.onboarding_status == OnboardingStatus.SKILLS:
            profile.onboarding_status = OnboardingStatus.SERVICE_SETUP
        db.commit()
        return self.get_onboarding(db, user)

    def save_service_setup(self, db: Session, user: AuthUser, payload: SaveServiceSetupRequest) -> OnboardingResponse:
        profile = self._profile(db, user)
        if profile.onboarding_status == OnboardingStatus.SKILLS:
            raise SkillsRequiredError

        profile.availability = [
            ProviderAvailability(user_id=profile.user_id, day_of_week=slot.day, start_time=slot.start, end_time=slot.end)
            for slot in payload.availability
        ]
        area = payload.service_area
        profile.latitude = area.latitude
        profile.longitude = area.longitude
        profile.pincode = area.pincode
        profile.area_name = area.area_name
        profile.radius_m = payload.radius_m
        profile.onboarding_status = OnboardingStatus.COMPLETE
        db.commit()
        return self.get_onboarding(db, user)

    def _profile(self, db: Session, user: AuthUser) -> ProviderProfile:
        profile = ProviderRepository(db).get_profile(user.id)
        if profile is None:
            raise ProviderProfileNotFoundError
        return profile

    def _response(self, profile: ProviderProfile) -> OnboardingResponse:
        has_area = profile.pincode is not None and profile.area_name is not None and profile.radius_m is not None
        return OnboardingResponse(
            status=profile.onboarding_status,
            skills=[
                ProviderSkillResponse(
                    skill_id=item.skill_id, skill_name=item.skill.name, category_id=item.skill.category_id,
                    proficiency=item.proficiency, years_experience=item.years_experience,
                )
                for item in profile.skills
            ],
            availability=[
                AvailabilitySlot(day=slot.day_of_week, start=slot.start_time, end=slot.end_time)
                for slot in profile.availability
            ],
            service_area=ServiceAreaResponse(
                latitude=profile.latitude, longitude=profile.longitude, pincode=profile.pincode,
                area_name=profile.area_name, radius_m=profile.radius_m,
            ) if has_area else None,
        )
