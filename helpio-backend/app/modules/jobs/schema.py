from datetime import datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, Field, StringConstraints, model_validator

from app.modules.jobs.model import InviteStatus, JobEventType, JobStatus, MilestoneStatus, QuoteStatus
from app.modules.providers.model import OnboardingStatus, Proficiency

# Money is in paise: ₹100 to ₹10 lakh
MIN_AMOUNT_PAISE = 10_000
MAX_AMOUNT_PAISE = 100_000_000

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=120)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]
AreaName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]


class JobFields(BaseModel):
    """Everything a customer fills in. A draft may leave fields empty; posting needs the required ones."""

    description: Description | None = None
    category_id: str | None = Field(default=None, max_length=40)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    pincode: str | None = Field(default=None, pattern=r"^[1-9]\d{5}$")
    area_name: AreaName | None = None
    budget_paise: int | None = Field(default=None, ge=MIN_AMOUNT_PAISE, le=MAX_AMOUNT_PAISE)
    scheduled_at: AwareDatetime | None = None
    duration_mins: int | None = Field(default=None, ge=15, le=24 * 60)
    is_emergency: bool = False
    # False saves a draft ("continue later"); true posts the job to nearby providers
    submit: bool = False

    @model_validator(mode="after")
    def coordinates_together(self) -> "JobFields":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Send both latitude and longitude, or neither")
        return self


class CreateJobRequest(JobFields):
    title: Title


class UpdateJobRequest(JobFields):
    title: Title | None = None


class JobResponse(BaseModel):
    """The customer's own job, with a summary of the quotes it has received."""

    id: str
    title: str
    description: str | None
    category_id: str | None
    category_name: str | None
    latitude: float | None
    longitude: float | None
    pincode: str | None
    area_name: str | None
    budget_paise: int | None
    scheduled_at: datetime | None
    duration_mins: int | None
    is_emergency: bool
    status: JobStatus
    progress_pct: int
    quote_count: int
    lowest_quote_paise: int | None
    created_at: datetime
    updated_at: datetime
    # Last change after posting; null if never edited
    edited_at: datetime | None
    # After hire: the first stage not yet approved (1-4) and its state; null before hire or when all are approved
    milestone_stage: int | None = None
    milestone_status: MilestoneStatus | None = None


class CreateQuoteRequest(BaseModel):
    amount_paise: int = Field(ge=MIN_AMOUNT_PAISE, le=MAX_AMOUNT_PAISE)
    message: Description | None = None


class QuoteResponse(BaseModel):
    id: str
    job_id: str
    amount_paise: int
    message: str | None
    status: QuoteStatus
    created_at: datetime


class MapCircle(BaseModel):
    """An approximate area: for a job, a circle offset from the real spot so it can't be pinpointed."""

    latitude: float
    longitude: float
    radius_m: int


class NearbyJobResponse(BaseModel):
    """A job as a provider sees it before hire: no customer contact, exact address or coordinates."""

    id: str
    title: str
    description: str | None
    category_id: str | None
    category_name: str | None
    area_name: str | None
    # Rounded to 0.5 km; null when matched by pincode only
    approx_distance_km: float | None
    # First name and initial, e.g. "Asha K."
    customer_label: str
    budget_paise: int | None
    scheduled_at: datetime | None
    duration_mins: int | None
    is_emergency: bool
    status: JobStatus
    progress_pct: int
    quote_count: int
    my_quote: QuoteResponse | None
    # The customer changed the job after my quote was sent
    edited_after_my_quote: bool
    # The customer asked me directly: "pending" or "quoted"; null when found nearby
    invite_status: InviteStatus | None
    # The customer's note with the request
    invite_message: str | None
    # Null when the job was posted without coordinates
    area_circle: MapCircle | None
    created_at: datetime


class CustomerHomeResponse(BaseModel):
    # Hired and not finished; the most recent one
    active_job: JobResponse | None
    # Open jobs with quotes to compare
    awaiting_decision: list[JobResponse]
    # Open jobs with no quotes yet
    waiting_for_quotes: list[JobResponse]
    drafts: list[JobResponse]


class ChecklistItem(BaseModel):
    key: str
    label: str
    # "unavailable": the step isn't offered yet (e.g. KYC)
    state: Annotated[str, StringConstraints(pattern=r"^(done|pending|unavailable)$")]


class QuoteCounts(BaseModel):
    pending: int
    accepted: int
    rejected: int


class EarningsSummary(BaseModel):
    week_paise: int
    wallet_paise: int


class ProviderHomeResponse(BaseModel):
    onboarding_status: OnboardingStatus
    checklist: list[ChecklistItem]
    can_quote: bool
    active_job: NearbyJobResponse | None
    quotes: QuoteCounts
    # Direct requests still waiting for my quote
    invites: list[NearbyJobResponse]
    nearby: list[NearbyJobResponse]
    nearby_count: int
    earnings: EarningsSummary


# ----- Phase 2: attachments, job detail, nearby list with the provider's area -----

MAX_ATTACHMENTS = 6
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
AttachmentType = Literal["image/jpeg", "image/png", "image/webp", "video/mp4"]


ATTACHMENT_TYPES: tuple[str, ...] = AttachmentType.__args__


class AttachmentResponse(BaseModel):
    id: str
    content_type: str
    # Cloudinary delivery URL
    url: str


class CustomerQuoteResponse(QuoteResponse):
    """A quote as the job's customer sees it before hire: no provider contact details."""

    # Opens the pro's public profile
    provider_id: str
    # First name and initial, e.g. "Ravi S."
    provider_label: str
    avatar_url: str | None
    # Best proficiency among the provider's skills in the job's category
    proficiency: Proficiency | None
    years_experience: int | None
    approx_distance_km: float | None


class InviteResponse(BaseModel):
    provider_id: str
    # "Ravi S."
    provider_label: str
    avatar_url: str | None
    status: InviteStatus
    created_at: datetime


class CreateInviteRequest(BaseModel):
    provider_id: str = Field(min_length=36, max_length=36)
    message: Description | None = None


class HiredProResponse(BaseModel):
    provider_id: str
    # "Ravi S."
    provider_label: str
    avatar_url: str | None
    amount_paise: int


class JobDetailResponse(JobResponse):
    attachments: list[AttachmentResponse]
    quotes: list[CustomerQuoteResponse]
    invites: list[InviteResponse]
    # The pro whose quote was accepted
    hired: HiredProResponse | None
    # Hired, not started: the customer shares it with the pro at the door
    start_pin: str | None
    started_at: datetime | None
    unread_messages: int


class ExactLocation(BaseModel):
    latitude: float | None
    longitude: float | None
    pincode: str | None
    area_name: str | None


class NearbyJobDetailResponse(NearbyJobResponse):
    attachments: list[AttachmentResponse]
    can_quote: bool
    # My quote was accepted: the job's exact place and the customer's name are shared from here on
    hired: bool
    exact_location: ExactLocation | None
    customer_name: str | None
    started_at: datetime | None
    unread_messages: int


class CategoryOption(BaseModel):
    id: str
    name: str


class NearbyJobsResponse(BaseModel):
    # The provider's own centre and travel radius, for the map; null without coordinates
    area: MapCircle | None
    # Categories of the provider's skills, for the filter
    categories: list[CategoryOption]
    jobs: list[NearbyJobResponse]


EstimatedMins = Annotated[int, Field(ge=15, le=24 * 60)]


class StartJobRequest(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$")
    # How long the whole job should take; each 25% stage gets a quarter of it
    estimated_mins: EstimatedMins


class SetEstimateRequest(BaseModel):
    estimated_mins: EstimatedMins


class SendMessageRequest(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class MessageResponse(BaseModel):
    id: str
    body: str
    mine: bool
    sender_name: str
    created_at: datetime


class ChatResponse(BaseModel):
    job_id: str
    job_title: str
    # The other person, e.g. "Ravi S."
    other_name: str
    other_avatar_url: str | None
    messages: list[MessageResponse]


# ----- Milestones: four 25% stages with photos, a note and the customer's approval -----

Note = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=1000)]


class RequestChangesRequest(BaseModel):
    reason: Note


class MilestonePhotoResponse(BaseModel):
    id: str
    content_type: str
    url: str


class MilestoneSubmissionResponse(BaseModel):
    id: str
    note: str
    photos: list[MilestonePhotoResponse]
    submitted_at: datetime
    # submitted (waiting), approved or changes_requested
    review_status: MilestoneStatus
    # The customer's reason when asking for changes
    review_note: str | None
    reviewed_at: datetime | None


class MilestoneResponse(BaseModel):
    stage: int
    percent: int
    status: MilestoneStatus
    # This stage's share of the hired quote
    amount_paise: int
    approved_at: datetime | None
    # When this quarter of the work should be done; null until the pro sets an estimate
    due_at: datetime | None
    # Minutes spent fixing after the customer asked for changes (not charged)
    extra_mins: int
    # Oldest first; the last one is the current attempt
    submissions: list[MilestoneSubmissionResponse]


class JobEventResponse(BaseModel):
    id: str
    type: JobEventType
    # "You", "Ravi S." or "Asha K."
    actor_label: str | None
    data: dict
    created_at: datetime


class MilestonesResponse(BaseModel):
    job_id: str
    job_title: str
    job_status: JobStatus
    progress_pct: int
    # The hired quote, and the approved stages' share of it
    amount_paise: int
    earned_paise: int
    # The first stage not yet approved; null when all are
    current_stage: int | None
    estimated_mins: int | None
    started_at: datetime | None
    # Fixing time across all stages (not charged)
    extra_mins_total: int
    milestones: list[MilestoneResponse]
    # Newest first
    events: list[JobEventResponse]


class ProviderJobResponse(NearbyJobResponse):
    """A job the provider was hired for, with its progress."""

    customer_name: str | None
    started_at: datetime | None
    amount_paise: int
    earned_paise: int
    milestone_stage: int | None
    milestone_status: MilestoneStatus | None
    # The current stage's target time, to flag it overdue
    next_due_at: datetime | None
    unread_messages: int
