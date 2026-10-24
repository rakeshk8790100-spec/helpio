from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.providers.dependencies import current_provider, get_provider_service
from app.modules.providers.schema import OnboardingResponse, SaveServiceSetupRequest, SaveSkillsRequest
from app.modules.providers.service import ProviderService

router = APIRouter(prefix="/providers/me", tags=["providers"])


@router.get("/onboarding", response_model=OnboardingResponse)
def get_onboarding(
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: ProviderService = Depends(get_provider_service),
) -> OnboardingResponse:
    return service.get_onboarding(db, user)


@router.put("/skills", response_model=OnboardingResponse)
def save_skills(
    payload: SaveSkillsRequest,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: ProviderService = Depends(get_provider_service),
) -> OnboardingResponse:
    """Replace the provider's skills (3–15). Moves sign-up on to availability and service area."""
    return service.save_skills(db, user, payload)


@router.put("/service-setup", response_model=OnboardingResponse)
def save_service_setup(
    payload: SaveServiceSetupRequest,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: ProviderService = Depends(get_provider_service),
) -> OnboardingResponse:
    """Weekly availability, service location and radius. Completes provider sign-up."""
    return service.save_service_setup(db, user, payload)
