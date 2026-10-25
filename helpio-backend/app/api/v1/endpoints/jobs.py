from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.jobs.dependencies import current_customer, get_job_service
from app.modules.jobs.schema import (
    MAX_ATTACHMENT_BYTES,
    AttachmentResponse,
    CreateJobRequest,
    CreateQuoteRequest,
    JobDetailResponse,
    JobResponse,
    NearbyJobDetailResponse,
    NearbyJobsResponse,
    QuoteResponse,
    UpdateJobRequest,
)
from app.modules.jobs.service import JobService, NearbyFilters
from app.modules.providers.dependencies import current_provider

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ----- Customer -----


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: CreateJobRequest,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    """Save a draft, or post the job (`submit: true`) to nearby providers."""
    return service.create_job(db, user, payload)


@router.get("/mine", response_model=list[JobResponse])
def my_jobs(
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> list[JobResponse]:
    return service.my_jobs(db, user)


# ----- Provider -----


@router.get("/nearby", response_model=NearbyJobsResponse)
def nearby_jobs(
    category_id: str | None = Query(default=None, max_length=40),
    max_km: float | None = Query(default=None, gt=0, le=50),
    has_budget: bool = False,
    urgent_only: bool = False,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> NearbyJobsResponse:
    """Open jobs in the provider's skills and radius, with the customer and address masked."""
    filters = NearbyFilters(category_id=category_id, max_km=max_km, has_budget=has_budget, urgent_only=urgent_only)
    return service.nearby_jobs(db, user, filters)


@router.get("/nearby/{job_id}", response_model=NearbyJobDetailResponse)
def nearby_job(
    job_id: str,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> NearbyJobDetailResponse:
    """One nearby job, masked, with photos and the provider's own quote."""
    return service.nearby_job(db, user, job_id)


@router.post("/{job_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(
    job_id: str,
    payload: CreateQuoteRequest,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> QuoteResponse:
    return service.create_quote(db, user, job_id, payload)


@router.delete("/{job_id}/quotes/mine", response_model=QuoteResponse)
def withdraw_quote(
    job_id: str,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> QuoteResponse:
    """Withdraw a pending quote; it can be sent again later."""
    return service.withdraw_quote(db, user, job_id)


# ----- Customer: one job -----


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job(
    job_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobDetailResponse:
    """The customer's job with photos and the quotes received (providers shown as "Ravi S.")."""
    return service.get_job(db, user, job_id)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    payload: UpdateJobRequest,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    """Edit a draft; `submit: true` posts it."""
    return service.update_job(db, user, job_id, payload)


@router.post("/{job_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def add_attachment(
    job_id: str,
    file: UploadFile = File(description="JPG, PNG, WebP or MP4, up to 10 MB"),
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> AttachmentResponse:
    """Upload a photo or video (max 6 per job) to Cloudinary; its URL is saved on the job."""
    # Read one byte past the limit so oversized files are rejected without loading them whole
    content = await file.read(MAX_ATTACHMENT_BYTES + 1)
    return service.add_attachment(db, user, job_id, content, file.content_type or "")


@router.delete("/{job_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    job_id: str,
    attachment_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> Response:
    service.delete_attachment(db, user, job_id, attachment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
