from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.modules.auth.model import ApprovalStatus, UserRole
from app.modules.auth.schema import Email
from app.modules.providers.model import OnboardingStatus

Reason = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]


class AdminLoginRequest(BaseModel):
    email: Email
    password: str = Field(min_length=1, max_length=128)


class AdminAccessResultResponse(BaseModel):
    email: str
    # pending until the owner approves; the owner's own address is approved at once
    approval_status: ApprovalStatus


class AdminResponse(BaseModel):
    id: str
    name: str | None
    email: str
    phone: str | None
    approval_status: ApprovalStatus
    # The owner's reason when rejecting
    approval_note: str | None
    is_active: bool
    is_owner: bool
    created_at: datetime
    approved_at: datetime | None


class ReasonRequest(BaseModel):
    reason: Reason


class OptionalReasonRequest(BaseModel):
    reason: Reason | None = None


class ProviderSummary(BaseModel):
    """What a provider offers, for deciding whether to verify them."""

    onboarding_status: OnboardingStatus
    skills: list[str]
    area_name: str | None
    pincode: str | None
    radius_km: float | None
    # 0 = Monday
    work_days: list[int]
    bio: str | None


class ApprovalItemResponse(BaseModel):
    """A customer or provider waiting for an admin (or just answered)."""

    id: str
    role: UserRole
    name: str | None
    email: str
    phone: str | None
    approval_status: ApprovalStatus
    approval_note: str | None
    created_at: datetime
    provider: ProviderSummary | None


class ApprovalCountsResponse(BaseModel):
    customers: int
    providers: int
    # Admin access requests; counted for the owner only
    admins: int


class ApproveRequest(BaseModel):
    note: Reason | None = None


class AuditEntryResponse(BaseModel):
    id: str
    action: str
    summary: str
    # "Rakesh B." or the email typed, for failed log-ins
    actor: str | None
    target_type: str | None
    target_id: str | None
    details: dict
    ip: str | None
    created_at: datetime



# ----- Settings (the owner) -----


class SettingFieldResponse(BaseModel):
    key: str
    label: str
    help: str
    kind: Literal["text", "secret", "int", "bool"]
    # Text, numbers and switches as set; secrets masked ("••••1AIZ"), or null when not set
    value: str | None
    # panel: saved in the console; env: from .env (or the default); missing: not set anywhere
    source: Literal["panel", "env", "missing"]
    # Saved in the console but can't be decrypted (the encryption key changed): .env is used
    unreadable: bool


class SettingGroupResponse(BaseModel):
    id: str
    title: str
    description: str
    fields: list[SettingFieldResponse]
    # The console can test this service with the values in force
    testable: bool


class SettingsResponse(BaseModel):
    groups: list[SettingGroupResponse]
    # SETTINGS_ENCRYPTION_KEY is set, so secrets can be saved here
    can_store_secrets: bool


class UpdateSettingsRequest(BaseModel):
    # Setting key → new value, or null to go back to the .env value
    changes: dict[str, str | None] = Field(min_length=1, max_length=30)


class CheckResponse(BaseModel):
    name: str
    label: str
    configured: bool
    # null: set up, but it can't be checked from here
    ok: bool | None
    message: str
    latency_ms: int | None
    checked_at: datetime


# ----- Status page -----


class HeartbeatResponse(BaseModel):
    name: str
    label: str
    description: str
    last_ok_at: datetime | None
    last_error_at: datetime | None
    last_error: str | None
    # null: switched off, or nothing has happened yet
    healthy: bool | None
    details: dict


class EmailStatusResponse(BaseModel):
    """This server process's email sends since it started."""

    sent: int
    failed: int
    last_ok_at: datetime | None
    last_error_at: datetime | None
    last_error: str | None


class ServerErrorResponse(BaseModel):
    id: str
    method: str
    path: str
    error_type: str
    message: str
    count: int
    first_seen: datetime
    last_seen: datetime


class AttentionResponse(BaseModel):
    approvals_waiting: int
    # Open payment links older than a day
    payments_stuck: int
    payouts_waiting: int
    payouts_waiting_paise: int


class StatusResponse(BaseModel):
    env: str
    version: str
    started_at: datetime
    database: CheckResponse
    integrations: list[CheckResponse]
    heartbeats: list[HeartbeatResponse]
    email: EmailStatusResponse
    # Newest first, up to 20
    errors: list[ServerErrorResponse]
    attention: AttentionResponse


# ----- Dashboard -----


class UserCounts(BaseModel):
    customers: int
    providers: int
    admins: int
    pending_customers: int
    pending_providers: int
    signups_today: int
    signups_week: int


class JobCounts(BaseModel):
    # Every status, including zeros
    by_status: dict[str, int]
    posted_today: int


class MoneyCounts(BaseModel):
    payment_due_count: int
    payment_due_paise: int
    paid_today_count: int
    paid_today_paise: int
    failed_tries_day: int
    payouts_waiting_count: int
    payouts_waiting_paise: int


class ReviewCounts(BaseModel):
    average: float | None
    count: int


class ActivityItemResponse(BaseModel):
    id: str
    # A job event type, e.g. "milestone_approved"
    type: str
    # "Asha Kumar"; null for the system
    actor: str | None
    job_id: str
    job_title: str
    data: dict
    at: datetime


class DashboardResponse(BaseModel):
    users: UserCounts
    jobs: JobCounts
    money: MoneyCounts
    reviews: ReviewCounts
    # The latest job events across Helpio, newest first
    activity: list[ActivityItemResponse]



# ----- Customers and providers -----


class UserRowResponse(BaseModel):
    id: str
    role: UserRole
    name: str | None
    email: str
    phone: str | None
    approval_status: ApprovalStatus
    is_active: bool
    created_at: datetime
    # Customers: jobs posted; providers: jobs hired for
    jobs: int
    # Providers: customers' rating
    rating_average: float | None
    rating_count: int


class UserJobResponse(BaseModel):
    id: str
    title: str
    status: str
    amount_paise: int | None
    created_at: datetime


class UserReviewResponse(BaseModel):
    id: str
    job_title: str
    # Who wrote it
    author: str
    stars: int
    comment: str | None
    hidden: bool
    created_at: datetime


class UserPaymentResponse(BaseModel):
    id: str
    job_title: str
    status: str
    amount_paise: int
    payout_status: str
    paid_at: datetime | None
    created_at: datetime


class UserDetailResponse(UserRowResponse):
    approval_note: str | None
    approved_at: datetime | None
    # Providers: skills, area, days
    provider: ProviderSummary | None
    # Providers: quotes by status
    quotes: dict[str, int]
    job_list: list[UserJobResponse]
    reviews_received: list[UserReviewResponse]
    reviews_given: int
    payments: list[UserPaymentResponse]
    # Providers: paid by customers, and still to be sent on by Helpio
    earned_paise: int
    owed_paise: int


# ----- Jobs -----


class AdminJobRowResponse(BaseModel):
    id: str
    title: str
    status: str
    category: str | None
    area: str | None
    customer: str
    pro: str | None
    # The hired quote, or the budget before hire
    amount_paise: int | None
    progress_pct: int
    created_at: datetime
    updated_at: datetime


class PartyResponse(BaseModel):
    id: str
    name: str | None
    email: str
    phone: str | None


class AdminQuoteResponse(BaseModel):
    pro: str
    amount_paise: int
    status: str
    message: str | None
    created_at: datetime


class AdminAttemptResponse(BaseModel):
    note: str
    review_status: str
    review_note: str | None
    submitted_at: datetime
    photos: list[str]


class AdminStageResponse(BaseModel):
    stage: int
    percent: int
    status: str
    attempts: list[AdminAttemptResponse]


class AdminEventResponse(BaseModel):
    type: str
    actor: str | None
    data: dict
    at: datetime


class AdminJobPaymentResponse(BaseModel):
    id: str
    status: str
    amount_paise: int
    last_error: str | None
    tries: int
    paid_at: datetime | None
    payout_status: str
    payout_reference: str | None


class AdminJobDetailResponse(AdminJobRowResponse):
    description: str | None
    pincode: str | None
    latitude: float | None
    longitude: float | None
    budget_paise: int | None
    scheduled_at: datetime | None
    is_emergency: bool
    started_at: datetime | None
    customer_party: PartyResponse
    pro_party: PartyResponse | None
    quotes: list[AdminQuoteResponse]
    stages: list[AdminStageResponse]
    events: list[AdminEventResponse]
    payments: list[AdminJobPaymentResponse]
    reviews: list[UserReviewResponse]
    # Open, or hired and not started
    can_cancel: bool


class AdminMessageResponse(BaseModel):
    id: str
    sender: str
    body: str
    at: datetime


# ----- Payments -----


class AdminPaymentRowResponse(BaseModel):
    id: str
    job_id: str
    job_title: str
    customer: str
    pro: str
    amount_paise: int
    status: str
    method: str | None
    last_error: str | None
    tries: int
    failed_tries: int
    payout_status: str
    created_at: datetime
    paid_at: datetime | None


# ----- Reviews -----


class AdminReviewRowResponse(UserReviewResponse):
    job_id: str
    author_role: UserRole
    # Who it's about
    subject: str
    hidden_reason: str | None


# ----- Catalog -----


class AdminSkillResponse(BaseModel):
    id: str
    name: str
    sort_order: int
    is_active: bool
    # Providers offering it
    providers: int


class AdminCategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    sort_order: int
    is_active: bool
    jobs: int
    skills: list[AdminSkillResponse]


CatalogName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)]
IconKey = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[a-z0-9-]{2,40}$")]


class SaveCategoryRequest(BaseModel):
    name: CatalogName
    # A lucide icon key known to the app, e.g. "wrench"
    icon: IconKey
    sort_order: int = Field(default=0, ge=0, le=999)
    is_active: bool = True


class SaveSkillRequest(BaseModel):
    name: CatalogName
    sort_order: int = Field(default=0, ge=0, le=999)
    is_active: bool = True
