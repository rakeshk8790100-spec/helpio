from datetime import datetime

from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Path, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.auth.dependencies import get_current_user
from app.modules.jobs.chat import JobChat
from app.modules.jobs.assist import JobAssistService
from app.modules.jobs.dependencies import (
    current_customer,
    get_job_assist_service,
    get_job_chat,
    get_job_service,
    get_milestone_service,
)
from app.modules.jobs.milestones import MilestoneService
from app.modules.jobs.schema import (
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS,
    MilestonesResponse,
    ProviderJobResponse,
    RequestChangesRequest,
    SetEstimateRequest,
    AssistJobRequest,
    AssistJobResponse,
    AttachmentResponse,
    ChatResponse,
    MessageResponse,
    SendMessageRequest,
    StartJobRequest,
    CreateInviteRequest,
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
from app.modules.reviews.dependencies import get_review_service
from app.modules.reviews.schema import JobReviewsResponse, SubmitReviewRequest
from app.modules.reviews.service import ReviewService

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ----- Customer -----


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: CreateJobRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    """Save a draft, or post the job (`submit: true`): the closest pros who do the work are told about it."""
    return service.create_job(db, user, payload, background)


@router.post("/assist", response_model=AssistJobResponse)
def assist_job(
    payload: AssistJobRequest,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobAssistService = Depends(get_job_assist_service),
) -> AssistJobResponse:
    """A first draft of the job form from the customer's own words: Claude when configured, keywords otherwise."""
    return service.assist(db, user, payload.text)


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


@router.get("/provider/mine", response_model=list[ProviderJobResponse])
def provider_jobs(
    bucket: Literal["active", "completed"] = "active",
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> list[ProviderJobResponse]:
    """Jobs I was hired for, with progress: `active` (hired or in progress) or `completed`."""
    return service.provider_jobs(db, user, completed=bucket == "completed")


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
    background: BackgroundTasks,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> QuoteResponse:
    return service.create_quote(db, user, job_id, payload, background)


@router.post("/{job_id}/invite/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_invite(
    job_id: str,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> Response:
    """Turn down a direct request (and withdraw a pending quote on it)."""
    service.decline_invite(db, user, job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.post("/{job_id}/quotes/{quote_id}/accept", response_model=JobDetailResponse)
def accept_quote(
    job_id: str,
    quote_id: str,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobDetailResponse:
    """Hire this pro (open jobs, pending quotes): other pending quotes are declined. Payment comes later."""
    return service.accept_quote(db, user, job_id, quote_id, background)


@router.post("/{job_id}/quotes/{quote_id}/decline", response_model=JobDetailResponse)
def decline_quote(
    job_id: str,
    quote_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobDetailResponse:
    """Turn one pending quote down; the job stays open for other quotes."""
    return service.decline_quote(db, user, job_id, quote_id)


@router.post("/{job_id}/invites", response_model=JobDetailResponse, status_code=status.HTTP_201_CREATED)
def invite_provider(
    job_id: str,
    payload: CreateInviteRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobDetailResponse:
    """Send an open job to a chosen pro (up to 5 per job). They reply with a quote or decline."""
    return service.invite_provider(db, user, job_id, payload, background)


@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: str,
    payload: UpdateJobRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobResponse:
    """Edit a draft; `submit: true` posts it."""
    return service.update_job(db, user, job_id, payload, background)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_draft(
    job_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> Response:
    """Delete a draft and its photos; posted jobs can't be deleted."""
    service.delete_draft(db, user, job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


# ----- Start with the customer's PIN -----


@router.post("/{job_id}/start", response_model=NearbyJobDetailResponse)
def start_job(
    job_id: str,
    payload: StartJobRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> NearbyJobDetailResponse:
    """
    Hired pro: start work with the 4-digit PIN the customer shares, and the time the whole job should take
    (each 25% stage gets a quarter of it). 5 wrong tries lock the PIN until the customer resets it.
    """
    return service.start_job(db, user, job_id, payload.pin, payload.estimated_mins, background)


@router.post("/{job_id}/start-pin/reset", response_model=JobDetailResponse)
def reset_start_pin(
    job_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> JobDetailResponse:
    """Customer: a new start PIN (the old one stops working; tries reset)."""
    return service.reset_start_pin(db, user, job_id)


# ----- Progress: four 25% stages with photos and the customer's approval -----

Stage = Path(ge=1, le=4)


@router.get("/{job_id}/milestones", response_model=MilestonesResponse)
def list_milestones(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: MilestoneService = Depends(get_milestone_service),
) -> MilestonesResponse:
    """The four stages with every submitted update, and the job's timeline (customer or hired pro)."""
    return service.view(db, user, job_id)


@router.post("/{job_id}/estimate", response_model=MilestonesResponse)
def set_estimate(
    job_id: str,
    payload: SetEstimateRequest,
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: MilestoneService = Depends(get_milestone_service),
) -> MilestonesResponse:
    """Hired pro, job started without an estimate: set it once; stage targets count from the start."""
    return service.set_estimate(db, user, job_id, payload.estimated_mins)


@router.post("/{job_id}/milestones/{stage}/submit", response_model=MilestonesResponse)
async def submit_milestone(
    job_id: str,
    background: BackgroundTasks,
    stage: int = Stage,
    note: str = Form(min_length=3, max_length=1000),
    files: list[UploadFile] = File(description=f"1 to {MAX_ATTACHMENTS} photos (JPG, PNG, WebP) or MP4s, 10 MB each"),
    user: AuthUser = Depends(current_provider),
    db: Session = Depends(get_db),
    service: MilestoneService = Depends(get_milestone_service),
) -> MilestonesResponse:
    """Hired pro: send photos and a note for the open stage and ask the customer to approve it."""
    # One byte past the limit, so oversized files are refused without loading them whole
    contents = [(await file.read(MAX_ATTACHMENT_BYTES + 1), file.content_type or "") for file in files[:MAX_ATTACHMENTS + 1]]
    return service.submit(db, user, job_id, stage, note.strip(), contents, background)


@router.post("/{job_id}/milestones/{stage}/approve", response_model=MilestonesResponse)
def approve_milestone(
    job_id: str,
    background: BackgroundTasks,
    stage: int = Stage,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: MilestoneService = Depends(get_milestone_service),
) -> MilestonesResponse:
    """Customer: approve the stage; approving stage 4 makes the job due for payment."""
    return service.approve(db, user, job_id, stage, background)


@router.post("/{job_id}/milestones/{stage}/request-changes", response_model=MilestonesResponse)
def request_milestone_changes(
    job_id: str,
    payload: RequestChangesRequest,
    background: BackgroundTasks,
    stage: int = Stage,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: MilestoneService = Depends(get_milestone_service),
) -> MilestonesResponse:
    """Customer: send the stage back with a reason; the pro sends new photos."""
    return service.request_changes(db, user, job_id, stage, payload.reason, background)


# ----- Reviews: once all four stages are approved, each side rates the other once -----


@router.get("/{job_id}/reviews", response_model=JobReviewsResponse)
def job_reviews(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: ReviewService = Depends(get_review_service),
) -> JobReviewsResponse:
    """The customer or the hired pro: my review, the other side's review of me, and whether I can still review."""
    return service.for_job(db, user, job_id)


@router.post("/{job_id}/reviews", response_model=JobReviewsResponse, status_code=status.HTTP_201_CREATED)
def submit_review(
    job_id: str,
    payload: SubmitReviewRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: ReviewService = Depends(get_review_service),
) -> JobReviewsResponse:
    """The customer rates the pro, or the pro rates the customer: 1 to 5 stars and an optional comment. Final."""
    return service.submit(db, user, job_id, payload, background)


# ----- Chat between the customer and the hired pro -----


@router.get("/{job_id}/messages", response_model=ChatResponse)
def list_messages(
    job_id: str,
    after: datetime | None = None,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    chat: JobChat = Depends(get_job_chat),
) -> ChatResponse:
    """Messages oldest first (only newer than `after` when given); reading marks the other side's as read."""
    return chat.messages(db, user, job_id, after)


@router.post("/{job_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    job_id: str,
    payload: SendMessageRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    chat: JobChat = Depends(get_job_chat),
) -> MessageResponse:
    """Phone numbers and emails are replaced with "•••": contact details stay private on Helpio."""
    return chat.send(db, user, job_id, payload.body, background)
