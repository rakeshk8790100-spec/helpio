from datetime import datetime
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, Field, StringConstraints, model_validator

from app.modules.jobs.model import JobStatus, QuoteStatus
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

    # First name and initial, e.g. "Ravi S."
    provider_label: str
    # Best proficiency among the provider's skills in the job's category
    proficiency: Proficiency | None
    years_experience: int | None
    approx_distance_km: float | None


class JobDetailResponse(JobResponse):
    attachments: list[AttachmentResponse]
    quotes: list[CustomerQuoteResponse]


class NearbyJobDetailResponse(NearbyJobResponse):
    attachments: list[AttachmentResponse]
    can_quote: bool


class CategoryOption(BaseModel):
    id: str
    name: str


class NearbyJobsResponse(BaseModel):
    # The provider's own centre and travel radius, for the map; null without coordinates
    area: MapCircle | None
    # Categories of the provider's skills, for the filter
    categories: list[CategoryOption]
    jobs: list[NearbyJobResponse]
