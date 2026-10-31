from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.jobs.dependencies import get_job_service
from app.modules.jobs.schema import ProviderHomeResponse
from app.modules.jobs.service import JobService
from app.modules.payments.dependencies import get_payment_service
from app.modules.payments.schema import ProviderEarningsResponse
from app.modules.payments.service import PaymentService
from app.modules.providers.dependencies import current_provider, get_provider_service
from app.modules.providers.schema import (
    OnboardingResponse,
    SaveServiceSetupRequest,
    SaveSkillsRequest,
    UpdateProviderProfileRequest,
)
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
    background: BackgroundTasks,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: ProviderService = Depends(get_provider_service),
) -> OnboardingResponse:
    """Weekly availability, service location and radius. Completes provider sign-up."""
    return service.save_service_setup(db, user, payload, background)


@router.patch("/profile", response_model=OnboardingResponse)
def update_profile(
    payload: UpdateProviderProfileRequest,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: ProviderService = Depends(get_provider_service),
) -> OnboardingResponse:
    """The short bio on the provider's public profile."""
    return service.update_profile(db, user, payload)


@router.get("/home", response_model=ProviderHomeResponse)
def provider_home(
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> ProviderHomeResponse:
    """Everything the provider home screen needs: sign-up checklist, active job, quotes, nearby jobs, earnings."""
    return service.provider_home(db, user)


@router.get("/earnings", response_model=ProviderEarningsResponse)
def provider_earnings(
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> ProviderEarningsResponse:
    """Totals and every paid job, with Helpio's payout to the provider (pending, or sent with its reference)."""
    return service.earnings(db, user)
