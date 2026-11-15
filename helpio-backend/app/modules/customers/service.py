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
from app.modules.catalog.model import CatalogCategory, CatalogSkill
from app.modules.customers.model import (
    CustomerAddress,
    CustomerFavoritePrompt,
    CustomerFavoriteSkill,
    CustomerServiceRequest,
    ServiceRequestStatus,
)
from app.modules.customers.schema import (
    MAX_ADDRESSES,
    MAX_FAVORITES,
    AddressResponse,
    CreateAddressRequest,
    FavoriteRequestResponse,
    FavoritesAddRequest,
    FavoritesChoice,
    FavoritesReplaceRequest,
    FavoritesResponse,
    UpdateAddressRequest,
    name_key,
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


def pending_requests(db: Session, user_id: str) -> list[CustomerServiceRequest]:
    """Typed services still waiting for an admin, oldest first."""
    return list(db.scalars(
        select(CustomerServiceRequest)
        .where(CustomerServiceRequest.user_id == user_id, CustomerServiceRequest.status == ServiceRequestStatus.PENDING)
        .order_by(CustomerServiceRequest.created_at, CustomerServiceRequest.name_key)
    ))


def favorite_requests(db: Session, user_id: str) -> list[FavoriteRequestResponse]:
    return [FavoriteRequestResponse(id=r.id, name=r.name) for r in pending_requests(db, user_id)]


def favorites_prompt_open(db: Session, user_id: str, count: int | None = None) -> bool:
    """Ask again at every sign-in or visit until there are 8 favourites (pending requests count); skipping only
    closes it for now."""
    if count is None:
        count = len(favorite_skill_ids(db, user_id)) + len(pending_requests(db, user_id))
    return count < MAX_FAVORITES


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
        requests = favorite_requests(db, user.id)
        return FavoritesResponse(
            skill_ids=ids, requests=requests, prompt_open=favorites_prompt_open(db, user.id, len(ids) + len(requests))
        )

    def add_favorites(self, db: Session, user: AuthUser, payload: FavoritesAddRequest) -> FavoritesResponse:
        """From the popup: new picks join the saved ones; already-saved ids and names are ignored."""
        skill_ids, names = self._resolve(db, payload)
        saved = set(favorite_skill_ids(db, user.id))
        requested = {r.name_key for r in pending_requests(db, user.id)}
        new_ids = [skill_id for skill_id in skill_ids if skill_id not in saved]
        new_names = [name for name in names if name_key(name) not in requested]
        if len(saved) + len(requested) + len(new_ids) + len(new_names) > MAX_FAVORITES:
            raise FavoritesLimitError(MAX_FAVORITES)
        db.add_all(CustomerFavoriteSkill(user_id=user.id, skill_id=skill_id) for skill_id in new_ids)
        self._request(db, user, new_names)
        self._prompt(db, user).skip_streak = 0
        db.commit()
        return self.favorites(db, user)

    def skip_favorites(self, db: Session, user: AuthUser) -> FavoritesResponse:
        prompt = self._prompt(db, user)
        prompt.skip_streak += 1
        db.commit()
        return self.favorites(db, user)

    def replace_favorites(self, db: Session, user: AuthUser, payload: FavoritesReplaceRequest) -> FavoritesResponse:
        """From the profile: the whole set at once. Pending requests left out are withdrawn."""
        skill_ids, names = self._resolve(db, payload)
        db.execute(delete(CustomerFavoriteSkill).where(CustomerFavoriteSkill.user_id == user.id))
        # One saved moment, a microsecond apart, so they read back in the order picked
        now = utc_now()
        db.add_all(
            CustomerFavoriteSkill(user_id=user.id, skill_id=skill_id, created_at=now + timedelta(microseconds=index))
            for index, skill_id in enumerate(skill_ids)
        )
        keep = {name_key(name) for name in names}
        pending = pending_requests(db, user.id)
        for request in pending:
            if request.name_key not in keep:
                db.delete(request)
        requested = {r.name_key for r in pending}
        self._request(db, user, [name for name in names if name_key(name) not in requested])
        self._prompt(db, user).skip_streak = 0
        db.commit()
        return self.favorites(db, user)

    def _resolve(self, db: Session, payload: FavoritesChoice) -> tuple[list[str], list[str]]:
        """Check the ids; a typed name that matches an active catalog service becomes that service."""
        self._check_skills(db, payload.skill_ids)
        if not payload.service_names:
            return payload.skill_ids, []
        active = db.execute(
            select(CatalogSkill.id, CatalogSkill.name)
            .join(CatalogCategory, CatalogCategory.id == CatalogSkill.category_id)
            .where(CatalogSkill.is_active.is_(True), CatalogCategory.is_active.is_(True))
        ).all()
        by_key = {name_key(name): skill_id for skill_id, name in active}
        skill_ids, names = list(payload.skill_ids), []
        for name in payload.service_names:
            match = by_key.get(name_key(name))
            if match is None:
                names.append(name)
            elif match not in skill_ids:
                skill_ids.append(match)
        return skill_ids, names

    def _request(self, db: Session, user: AuthUser, names: list[str]) -> None:
        """New pending requests. A name asked for before (then approved or rejected) is asked for again."""
        for name in names:
            key = name_key(name)
            old = db.scalar(
                select(CustomerServiceRequest).where(
                    CustomerServiceRequest.user_id == user.id, CustomerServiceRequest.name_key == key
                )
            )
            if old is not None:
                db.delete(old)
                db.flush()
            db.add(CustomerServiceRequest(user_id=user.id, name=name, name_key=key))

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
