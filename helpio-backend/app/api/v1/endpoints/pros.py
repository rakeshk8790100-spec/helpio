from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import AuthUser
from app.modules.providers.directory import ProviderDirectory, SearchQuery
from app.modules.providers.schema import ProviderProfileResponse, ProviderSearchResponse

router = APIRouter(prefix="/providers", tags=["providers"])


def get_directory() -> ProviderDirectory:
    return ProviderDirectory()


@router.get("/search", response_model=ProviderSearchResponse)
def search_providers(
    q: str | None = Query(default=None, max_length=60),
    category_id: str | None = Query(default=None, max_length=40),
    # Repeat for several, e.g. a customer's favourite services
    skill_id: list[str] = Query(default=[], max_length=8),
    address_id: str | None = Query(default=None, max_length=36),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    pincode: str | None = Query(default=None, pattern=r"^[1-9]\d{5}$"),
    page: int = Query(default=1, ge=1, le=50),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    directory: ProviderDirectory = Depends(get_directory),
) -> ProviderSearchResponse:
    """Pros who serve a place (a point, pincode, saved address, or the default address), best match first."""
    place = directory.resolve_place(
        db, user, address_id=address_id, latitude=latitude, longitude=longitude, pincode=pincode
    )
    query = SearchQuery(q=q, category_id=category_id, skill_ids=frozenset(skill_id) or None, page=page)
    return directory.search(db, place, query)


@router.get("/{provider_id}", response_model=ProviderProfileResponse)
def provider_profile(
    provider_id: UUID,
    address_id: str | None = Query(default=None, max_length=36),
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    directory: ProviderDirectory = Depends(get_directory),
) -> ProviderProfileResponse:
    """A pro's public profile. Distance is from the chosen (or default) address, rounded to 0.5 km."""
    place = directory.resolve_place(db, user, address_id=address_id, latitude=None, longitude=None, pincode=None)
    return directory.profile(db, str(provider_id), place)
