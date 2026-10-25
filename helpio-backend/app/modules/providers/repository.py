from collections.abc import Collection, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.providers.model import OnboardingStatus, ProviderProfile


class ProviderRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_status(self, user_id: str) -> OnboardingStatus | None:
        return self.db.scalar(select(ProviderProfile.onboarding_status).where(ProviderProfile.user_id == user_id))

    def get_profile(self, user_id: str) -> ProviderProfile | None:
        return self.db.scalar(
            select(ProviderProfile)
            .where(ProviderProfile.user_id == user_id)
            .options(selectinload(ProviderProfile.skills), selectinload(ProviderProfile.availability))
        )

    def add_profile(self, profile: ProviderProfile) -> ProviderProfile:
        self.db.add(profile)
        self.db.flush()
        return profile

    def get_profiles(self, user_ids: Collection[str]) -> Sequence[ProviderProfile]:
        if not user_ids:
            return []
        return self.db.scalars(
            select(ProviderProfile)
            .where(ProviderProfile.user_id.in_(user_ids))
            .options(selectinload(ProviderProfile.skills))
        ).all()
