"""Public provider directory: customers search pros who serve a place and open their profiles."""
from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppError
from app.core.geo import approx_km, bounding_box, distance_m, short_name
from app.modules.auth.model import ApprovalStatus, AuthUser
from app.modules.customers.exceptions import AddressNotFoundError
from app.modules.customers.model import CustomerAddress
from app.modules.customers.service import list_addresses
from app.modules.providers.model import OnboardingStatus, Proficiency, ProviderProfile, ProviderSkill
from app.modules.providers.schema import (
    AvailabilitySlot,
    ProviderCardResponse,
    ProviderProfileResponse,
    ProviderSearchResponse,
    PublicCategory,
    PublicSkill,
)
from app.modules.reviews.repository import NO_RATING, ReviewRepository
from app.modules.reviews.schema import PublicReviewResponse, RatingSummary

PAGE_SIZE = 20
# Latest reviews on a pro's public profile
PROFILE_REVIEWS = 10
CARD_SKILLS = 3
BIO_SNIPPET = 140
# Widest travel radius a provider can set; bounds the SQL pre-filter
MAX_RADIUS_M = 50_000
PROFICIENCY_RANK = {Proficiency.BEGINNER: 0, Proficiency.INTERMEDIATE: 1, Proficiency.EXPERT: 2}


class LocationRequiredError(AppError):
    status_code = 422
    detail = "Add an address or share your location to find pros near you"


class ProviderNotFoundError(AppError):
    status_code = 404
    detail = "This pro isn't available"


@dataclass(frozen=True)
class Place:
    latitude: float | None
    longitude: float | None
    pincode: str | None
    label: str | None

    @property
    def has_point(self) -> bool:
        return self.latitude is not None and self.longitude is not None


@dataclass(frozen=True)
class SearchQuery:
    q: str | None = None
    category_id: str | None = None
    # Only these services (e.g. the customer's favourites)
    skill_ids: frozenset[str] | None = None
    page: int = 1


def place_from_address(address: CustomerAddress) -> Place:
    return Place(address.latitude, address.longitude, address.pincode, address.area_name)


class ProviderDirectory:
    def resolve_place(
        self, db: Session, user: AuthUser, *, address_id: str | None,
        latitude: float | None, longitude: float | None, pincode: str | None,
    ) -> Place | None:
        """An explicit point or pincode wins, then the chosen saved address, then the default address."""
        if (latitude is not None and longitude is not None) or pincode:
            return Place(latitude, longitude, pincode, None)
        addresses = list_addresses(db, user.id)
        if address_id:
            address = next((item for item in addresses if item.id == address_id), None)
            if address is None:
                raise AddressNotFoundError
            return place_from_address(address)
        return place_from_address(addresses[0]) if addresses else None

    def search(self, db: Session, place: Place | None, query: SearchQuery) -> ProviderSearchResponse:
        if place is None:
            raise LocationRequiredError
        terms = [term for term in (query.q or "").lower().split() if term]

        ranked: list[tuple[tuple, ProviderCardResponse]] = []
        serving = self._serving(db, place)
        ratings = ReviewRepository(db).summaries([user.id for _, user in serving])
        for profile, user in serving:
            matched = self._matching_skills(profile.skills, terms, query.category_id, query.skill_ids)
            if (terms or query.category_id or query.skill_ids) and not matched:
                continue
            metres = self._distance(profile, place)
            best = max((PROFICIENCY_RANK[item.proficiency] for item in matched or profile.skills), default=0)
            # Best matching skill level first, then the closest pro
            key = (-best, metres is None, metres or 0, user.created_at)
            ranked.append((key, self._card(profile, user, metres, matched, ratings.get(user.id, NO_RATING))))
        ranked.sort(key=lambda item: item[0])

        start = (query.page - 1) * PAGE_SIZE
        page = [card for _, card in ranked[start:start + PAGE_SIZE]]
        return ProviderSearchResponse(
            near=place.label, providers=page, total=len(ranked), page=query.page,
            has_more=start + PAGE_SIZE < len(ranked),
        )

    def profile(
        self, db: Session, provider_id: str, place: Place | None, viewer_id: str | None = None
    ) -> ProviderProfileResponse:
        row = db.execute(
            select(ProviderProfile, AuthUser)
            .join(AuthUser, AuthUser.id == ProviderProfile.user_id)
            .where(
                ProviderProfile.user_id == provider_id,
                ProviderProfile.onboarding_status == OnboardingStatus.COMPLETE,
                AuthUser.is_active.is_(True),
                # Hidden until Helpio verifies them, except from their own preview
                or_(AuthUser.approval_status == ApprovalStatus.APPROVED, AuthUser.id == viewer_id),
            )
            .options(selectinload(ProviderProfile.skills), selectinload(ProviderProfile.availability))
        ).first()
        if row is None:
            raise ProviderNotFoundError
        profile, user = row
        metres = self._distance(profile, place) if place else None
        reviews = ReviewRepository(db)
        card = self._card(profile, user, metres, [], reviews.summary(user.id))
        categories: dict[str, PublicCategory] = {}
        for item in sorted(profile.skills, key=lambda s: (s.skill.category.sort_order, s.skill.sort_order)):
            skill = self._public_skill(item)
            categories.setdefault(
                skill.category_id, PublicCategory(id=skill.category_id, name=skill.category_name, skills=[])
            ).skills.append(skill)
        return ProviderProfileResponse(
            **card.model_dump(),
            bio=profile.bio,
            categories=list(categories.values()),
            availability=[
                AvailabilitySlot(day=slot.day_of_week, start=slot.start_time, end=slot.end_time)
                for slot in profile.availability
            ],
            radius_km=profile.radius_m / 1000 if profile.radius_m else None,
            reviews=[
                PublicReviewResponse(
                    id=review.id, rating=review.stars, comment=review.comment,
                    reviewer_label=short_name(review.author.name, "Customer"), created_at=review.created_at,
                )
                for review in reviews.latest_about(user.id, PROFILE_REVIEWS)
            ],
        )

    # ----- Helpers -----

    def _serving(self, db: Session, place: Place) -> list[tuple[ProviderProfile, AuthUser]]:
        """Signed-up, active providers whose travel area covers the place (or share its pincode without coordinates)."""
        places = []
        if place.has_point:
            min_lat, max_lat, min_lng, max_lng = bounding_box(place.latitude, place.longitude, MAX_RADIUS_M)
            places.append(and_(
                ProviderProfile.latitude.between(min_lat, max_lat), ProviderProfile.longitude.between(min_lng, max_lng)
            ))
        if place.pincode:
            places.append(ProviderProfile.pincode == place.pincode)
        if not places:
            return []
        rows = db.execute(
            select(ProviderProfile, AuthUser)
            .join(AuthUser, AuthUser.id == ProviderProfile.user_id)
            .where(
                ProviderProfile.onboarding_status == OnboardingStatus.COMPLETE,
                AuthUser.is_active.is_(True),
                AuthUser.approval_status == ApprovalStatus.APPROVED,
                or_(*places),
            )
            .options(selectinload(ProviderProfile.skills), selectinload(ProviderProfile.availability))
        ).all()

        serving = []
        for profile, user in rows:
            metres = self._distance(profile, place)
            if metres is not None:
                if profile.radius_m is None or metres > profile.radius_m:
                    continue
            elif profile.pincode != place.pincode:
                continue
            serving.append((profile, user))
        return serving

    def _distance(self, profile: ProviderProfile, place: Place) -> float | None:
        if not place.has_point or profile.latitude is None or profile.longitude is None:
            return None
        return distance_m(place.latitude, place.longitude, profile.latitude, profile.longitude)

    def _matching_skills(
        self, skills: Sequence[ProviderSkill], terms: list[str], category_id: str | None,
        skill_ids: frozenset[str] | None = None,
    ) -> list[ProviderSkill]:
        def matches(item: ProviderSkill) -> bool:
            if category_id and item.skill.category_id != category_id:
                return False
            if skill_ids and item.skill_id not in skill_ids:
                return False
            text = f"{item.skill.name} {item.skill.category.name}".lower()
            return all(term in text for term in terms)

        return [item for item in skills if matches(item)] if (terms or category_id or skill_ids) else []

    def _public_skill(self, item: ProviderSkill) -> PublicSkill:
        return PublicSkill(
            skill_id=item.skill_id, name=item.skill.name, category_id=item.skill.category_id,
            category_name=item.skill.category.name, proficiency=item.proficiency,
            years_experience=item.years_experience,
        )

    def _card(
        self, profile: ProviderProfile, user: AuthUser, metres: float | None, matched: list[ProviderSkill],
        rating: RatingSummary,
    ) -> ProviderCardResponse:
        by_level = sorted(profile.skills, key=lambda item: -PROFICIENCY_RANK[item.proficiency])
        shown = (matched + [item for item in by_level if item not in matched])[:CARD_SKILLS]
        years = [item.years_experience for item in profile.skills if item.years_experience is not None]
        bio = (profile.bio or "").strip()
        return ProviderCardResponse(
            id=profile.user_id,
            display_name=short_name(user.name, "Helpio pro"),
            avatar_url=user.avatar_url,
            bio_snippet=(bio[:BIO_SNIPPET - 1] + "…" if len(bio) > BIO_SNIPPET else bio) or None,
            area_name=profile.area_name,
            approx_distance_km=approx_km(metres) if metres is not None else None,
            skills=[self._public_skill(item) for item in shown],
            skill_count=len(profile.skills),
            top_proficiency=by_level[0].proficiency if by_level else Proficiency.BEGINNER,
            max_years_experience=max(years, default=None),
            work_days=sorted(slot.day_of_week for slot in profile.availability),
            member_since=user.created_at,
            rating=rating,
        )
