from collections.abc import Sequence
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.modules.auth.model import AuthUser
from app.modules.catalog.repository import CatalogRepository
from app.modules.customers.exceptions import (
    AddressNotFoundError,
    FavoritesLimitError,
    TooManyAddressesError,
    UnknownSkillError,
)
from app.modules.customers.model import CustomerAddress, CustomerFavoritePrompt, CustomerFavoriteSkill
from app.modules.customers.schema import (
    MAX_ADDRESSES,
    MAX_FAVORITES,
    MAX_SKIP_STREAK,
    AddressResponse,
    CreateAddressRequest,
    FavoritesAddRequest,
    FavoritesReplaceRequest,
    FavoritesResponse,
    UpdateAddressRequest,
)


def list_addresses(db: Session, user_id: str) -> Sequence[CustomerAddress]:
    """Default first, then oldest first."""
    return db.scalars(
        select(CustomerAddress)
        .where(CustomerAddress.user_id == user_id)
        .order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at)
    ).all()


def favorite_skill_ids(db: Session, user_id: str) -> list[str]:
    """Oldest first."""
    return list(db.scalars(
        select(CustomerFavoriteSkill.skill_id)
        .where(CustomerFavoriteSkill.user_id == user_id)
        .order_by(CustomerFavoriteSkill.created_at, CustomerFavoriteSkill.skill_id)
    ))


def favorites_prompt_open(db: Session, user_id: str, count: int | None = None) -> bool:
    """Ask again at sign-in until there are 8 favourites or the popup was skipped 3 times in a row."""
    if count is None:
        count = db.scalar(
            select(func.count()).select_from(CustomerFavoriteSkill).where(CustomerFavoriteSkill.user_id == user_id)
        ) or 0
    prompt = db.get(CustomerFavoritePrompt, user_id)
    return count < MAX_FAVORITES and (prompt is None or prompt.skip_streak < MAX_SKIP_STREAK)


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

    # ----- Favourite services -----

    def favorites(self, db: Session, user: AuthUser) -> FavoritesResponse:
        ids = favorite_skill_ids(db, user.id)
        return FavoritesResponse(skill_ids=ids, prompt_open=favorites_prompt_open(db, user.id, len(ids)))

    def add_favorites(self, db: Session, user: AuthUser, payload: FavoritesAddRequest) -> FavoritesResponse:
        """From the popup: new picks join the saved ones; already-saved ids are ignored."""
        self._check_skills(db, payload.skill_ids)
        saved = set(favorite_skill_ids(db, user.id))
        new = [skill_id for skill_id in payload.skill_ids if skill_id not in saved]
        if len(saved) + len(new) > MAX_FAVORITES:
            raise FavoritesLimitError(MAX_FAVORITES)
        db.add_all(CustomerFavoriteSkill(user_id=user.id, skill_id=skill_id) for skill_id in new)
        self._prompt(db, user).skip_streak = 0
        db.commit()
        return self.favorites(db, user)

    def skip_favorites(self, db: Session, user: AuthUser) -> FavoritesResponse:
        prompt = self._prompt(db, user)
        prompt.skip_streak += 1
        db.commit()
        return self.favorites(db, user)

    def replace_favorites(self, db: Session, user: AuthUser, payload: FavoritesReplaceRequest) -> FavoritesResponse:
        """From the profile: the whole set at once."""
        self._check_skills(db, payload.skill_ids)
        db.execute(delete(CustomerFavoriteSkill).where(CustomerFavoriteSkill.user_id == user.id))
        # One saved moment, a microsecond apart, so they read back in the order picked
        now = utc_now()
        db.add_all(
            CustomerFavoriteSkill(user_id=user.id, skill_id=skill_id, created_at=now + timedelta(microseconds=index))
            for index, skill_id in enumerate(payload.skill_ids)
        )
        self._prompt(db, user).skip_streak = 0
        db.commit()
        return self.favorites(db, user)

    def _check_skills(self, db: Session, skill_ids: list[str]) -> None:
        if CatalogRepository(db).existing_skill_ids(skill_ids) != set(skill_ids):
            raise UnknownSkillError

    def _prompt(self, db: Session, user: AuthUser) -> CustomerFavoritePrompt:
        prompt = db.get(CustomerFavoritePrompt, user.id)
        if prompt is None:
            prompt = CustomerFavoritePrompt(user_id=user.id, skip_streak=0)
            db.add(prompt)
        return prompt

    # ----- Helpers -----

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
