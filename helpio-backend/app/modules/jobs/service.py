import hashlib
import hmac
from dataclasses import dataclass
from math import asin, cos, pi, radians, sin, sqrt
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.cloudinary import JOB_ATTACHMENTS_FOLDER, CloudinaryStorage, FileStorage
from app.modules.auth.model import AuthUser
from app.modules.catalog.model import CatalogCategory
from app.modules.jobs.exceptions import (
    AlreadyQuotedError,
    AttachmentNotFoundError,
    JobClosedForChangesError,
    JobIncompleteError,
    JobNotEditableError,
    JobNotFoundError,
    JobNotOpenError,
    ProviderNotReadyError,
    QuoteNotFoundError,
    QuoteNotWithdrawableError,
    TooManyAttachmentsError,
    UnsupportedAttachmentError,
    UnknownCategoryError,
)
from app.modules.jobs.model import ACTIVE_STATUSES, Job, JobAttachment, JobQuote, JobStatus, QuoteStatus
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.schema import (
    ATTACHMENT_TYPES,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS,
    AttachmentResponse,
    CategoryOption,
    ChecklistItem,
    CreateJobRequest,
    CreateQuoteRequest,
    CustomerHomeResponse,
    CustomerQuoteResponse,
    EarningsSummary,
    JobDetailResponse,
    JobFields,
    JobResponse,
    MapCircle,
    NearbyJobDetailResponse,
    NearbyJobResponse,
    NearbyJobsResponse,
    ProviderHomeResponse,
    QuoteCounts,
    QuoteResponse,
    UpdateJobRequest,
)
from app.modules.providers.exceptions import ProviderProfileNotFoundError
from app.modules.providers.model import OnboardingStatus, Proficiency, ProviderProfile
from app.modules.providers.repository import ProviderRepository

EARTH_RADIUS_M = 6_371_000
METRES_PER_DEGREE = 111_320
HOME_NEARBY_LIMIT = 3
# Approximate job area on the map: the real spot sits 200–400 m from the centre, inside a 600 m circle
FUZZ_MIN_M, FUZZ_SPREAD_M, FUZZ_RADIUS_M = 200, 200, 600
# Photos may change until a pro is hired
EDITABLE_PHOTO_STATUSES = (JobStatus.DRAFT, JobStatus.OPEN)
PROFICIENCY_RANK = {Proficiency.BEGINNER: 0, Proficiency.INTERMEDIATE: 1, Proficiency.EXPERT: 2}


@dataclass(frozen=True)
class NearbyFilters:
    category_id: str | None = None
    max_km: float | None = None
    has_budget: bool = False
    urgent_only: bool = False


NO_FILTERS = NearbyFilters()


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle (haversine) distance in metres."""
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(a))


def approx_km(metres: float) -> float:
    """Round to the nearest 0.5 km (at least 0.5) so a provider can't pinpoint the customer."""
    return max(0.5, round(metres / 500) / 2)


def short_name(name: str | None, fallback: str) -> str:
    """"Asha Kumar" → "Asha K."; used for both sides before hire."""
    parts = (name or "").split()
    if not parts:
        return fallback
    return f"{parts[0]} {parts[-1][0].upper()}." if len(parts) > 1 else parts[0]


def fuzzed_circle(job: Job) -> MapCircle | None:
    """A map circle around the job, offset by a secret-keyed amount so the job id can't reveal the real spot."""
    if job.latitude is None or job.longitude is None:
        return None
    key = get_settings().auth_secret_key.get_secret_value().encode()
    digest = hmac.new(key, job.id.encode(), hashlib.sha256).digest()
    angle = digest[0] / 255 * 2 * pi
    offset = FUZZ_MIN_M + digest[1] / 255 * FUZZ_SPREAD_M
    dlat = offset * cos(angle) / METRES_PER_DEGREE
    dlng = offset * sin(angle) / (METRES_PER_DEGREE * max(cos(radians(job.latitude)), 0.01))
    return MapCircle(
        latitude=round(job.latitude + dlat, 4), longitude=round(job.longitude + dlng, 4), radius_m=FUZZ_RADIUS_M
    )


def pending_quotes(job: Job) -> list[JobQuote]:
    return [quote for quote in job.quotes if quote.status == QuoteStatus.PENDING]


class JobService:
    def __init__(self, *, storage: FileStorage | None = None) -> None:
        self._storage_client = storage

    @property
    def storage(self) -> FileStorage:
        # Created on first use, so screens without photos work without Cloudinary configured
        if self._storage_client is None:
            self._storage_client = CloudinaryStorage()
        return self._storage_client

    # ----- Customer -----

    def create_job(self, db: Session, user: AuthUser, payload: CreateJobRequest) -> JobResponse:
        job = Job(customer_id=user.id, title=payload.title, quotes=[])
        self._apply(db, job, payload)
        JobRepository(db).add(job)
        db.commit()
        return self._job_response(job)

    def update_job(self, db: Session, user: AuthUser, job_id: str, payload: UpdateJobRequest) -> JobResponse:
        job = self._own_job(db, user, job_id)
        if job.status != JobStatus.DRAFT:
            raise JobNotEditableError
        if payload.title is not None:
            job.title = payload.title
        self._apply(db, job, payload)
        db.commit()
        return self._job_response(job)

    def my_jobs(self, db: Session, user: AuthUser) -> list[JobResponse]:
        return [self._job_response(job) for job in JobRepository(db).list_for_customer(user.id)]

    def get_job(self, db: Session, user: AuthUser, job_id: str) -> JobDetailResponse:
        job = self._own_job(db, user, job_id)
        quotes = [quote for quote in job.quotes if quote.status != QuoteStatus.WITHDRAWN]
        profiles = {p.user_id: p for p in ProviderRepository(db).get_profiles({q.provider_id for q in quotes})}
        return JobDetailResponse(
            **self._job_response(job).model_dump(),
            attachments=self._attachments(job),
            quotes=[self._customer_quote(job, quote, profiles.get(quote.provider_id)) for quote in quotes],
        )

    def customer_home(self, db: Session, user: AuthUser) -> CustomerHomeResponse:
        jobs = JobRepository(db).list_for_customer(user.id)
        active = next((job for job in jobs if job.status in ACTIVE_STATUSES), None)
        open_jobs = [job for job in jobs if job.status == JobStatus.OPEN]
        return CustomerHomeResponse(
            active_job=self._job_response(active) if active else None,
            awaiting_decision=[self._job_response(job) for job in open_jobs if pending_quotes(job)],
            waiting_for_quotes=[self._job_response(job) for job in open_jobs if not pending_quotes(job)],
            drafts=[self._job_response(job) for job in jobs if job.status == JobStatus.DRAFT],
        )

    def add_attachment(
        self, db: Session, user: AuthUser, job_id: str, content: bytes, content_type: str
    ) -> AttachmentResponse:
        job = self._own_job(db, user, job_id)
        if job.status not in EDITABLE_PHOTO_STATUSES:
            raise JobClosedForChangesError
        if len(job.attachments) >= MAX_ATTACHMENTS:
            raise TooManyAttachmentsError(MAX_ATTACHMENTS)
        if content_type not in ATTACHMENT_TYPES or not 0 < len(content) <= MAX_ATTACHMENT_BYTES:
            raise UnsupportedAttachmentError
        # Random ids: a file URL never reveals who or where
        attachment = JobAttachment(id=str(uuid4()), content_type=content_type, size_bytes=len(content))
        stored = self.storage.upload(
            content, content_type=content_type, folder=f"{JOB_ATTACHMENTS_FOLDER}/{job.id}", public_id=attachment.id
        )
        attachment.url, attachment.public_id, attachment.resource_type = stored.url, stored.public_id, stored.resource_type
        job.attachments.append(attachment)
        db.commit()
        return self._attachment_response(attachment)

    def delete_attachment(self, db: Session, user: AuthUser, job_id: str, attachment_id: str) -> None:
        job = self._own_job(db, user, job_id)
        if job.status not in EDITABLE_PHOTO_STATUSES:
            raise JobClosedForChangesError
        attachment = next((item for item in job.attachments if item.id == attachment_id), None)
        if attachment is None:
            raise AttachmentNotFoundError
        self.storage.delete(attachment.public_id, attachment.resource_type)
        job.attachments.remove(attachment)
        db.commit()

    # ----- Provider -----

    def nearby_jobs(self, db: Session, user: AuthUser, filters: NearbyFilters = NO_FILTERS) -> NearbyJobsResponse:
        profile = self._provider_profile(db, user)
        has_point = profile.latitude is not None and profile.longitude is not None and profile.radius_m is not None
        return NearbyJobsResponse(
            area=MapCircle(latitude=profile.latitude, longitude=profile.longitude, radius_m=profile.radius_m)
            if has_point else None,
            categories=[
                CategoryOption(id=category_id, name=name)
                for category_id, name in sorted(
                    {(item.skill.category.id, item.skill.category.name) for item in profile.skills}, key=lambda c: c[1]
                )
            ],
            jobs=[self._nearby_response(job, user, metres) for job, metres in self._matches(db, user, profile, filters)],
        )

    def nearby_job(self, db: Session, user: AuthUser, job_id: str) -> NearbyJobDetailResponse:
        profile = self._provider_profile(db, user)
        match = next(((job, metres) for job, metres in self._matches(db, user, profile) if job.id == job_id), None)
        if match is None:
            raise JobNotFoundError
        job, metres = match
        return NearbyJobDetailResponse(
            **self._nearby_response(job, user, metres).model_dump(),
            attachments=self._attachments(job),
            can_quote=profile.onboarding_status == OnboardingStatus.COMPLETE,
        )

    def create_quote(self, db: Session, user: AuthUser, job_id: str, payload: CreateQuoteRequest) -> QuoteResponse:
        profile = self._provider_profile(db, user)
        if profile.onboarding_status != OnboardingStatus.COMPLETE:
            raise ProviderNotReadyError
        repo = JobRepository(db)
        job = repo.get(job_id)
        if job is None:
            raise JobNotFoundError
        if job.status != JobStatus.OPEN:
            raise JobNotOpenError
        # Providers may only quote on jobs they can see nearby
        if job.id not in {match.id for match, _ in self._matches(db, user, profile)}:
            raise JobNotFoundError
        quote = repo.get_quote(job.id, user.id)
        if quote is not None and quote.status != QuoteStatus.WITHDRAWN:
            raise AlreadyQuotedError
        if quote is None:
            quote = repo.add_quote(
                JobQuote(job_id=job.id, provider_id=user.id, amount_paise=payload.amount_paise, message=payload.message)
            )
        else:
            # A withdrawn quote can be sent again
            quote.amount_paise = payload.amount_paise
            quote.message = payload.message
            quote.status = QuoteStatus.PENDING
        db.commit()
        return self._quote_response(quote)

    def withdraw_quote(self, db: Session, user: AuthUser, job_id: str) -> QuoteResponse:
        quote = JobRepository(db).get_quote(job_id, user.id)
        if quote is None:
            raise QuoteNotFoundError
        if quote.status != QuoteStatus.PENDING:
            raise QuoteNotWithdrawableError
        quote.status = QuoteStatus.WITHDRAWN
        db.commit()
        return self._quote_response(quote)

    def provider_home(self, db: Session, user: AuthUser) -> ProviderHomeResponse:
        profile = self._provider_profile(db, user)
        repo = JobRepository(db)
        status = profile.onboarding_status
        nearby = self._matches(db, user, profile)
        counts = repo.quote_counts(user.id)
        active = repo.active_job_for_provider(user.id)
        return ProviderHomeResponse(
            onboarding_status=status,
            checklist=[
                ChecklistItem(key="account", label="Account and mobile number", state="done"),
                ChecklistItem(
                    key="skills", label="Your skills", state="pending" if status == OnboardingStatus.SKILLS else "done"
                ),
                ChecklistItem(
                    key="service_area", label="Service area and availability",
                    state="done" if status == OnboardingStatus.COMPLETE else "pending",
                ),
                ChecklistItem(key="kyc", label="ID and selfie verification", state="unavailable"),
            ],
            can_quote=status == OnboardingStatus.COMPLETE,
            active_job=self._nearby_response(active, user, None) if active else None,
            quotes=QuoteCounts(
                pending=counts.get(QuoteStatus.PENDING, 0),
                accepted=counts.get(QuoteStatus.ACCEPTED, 0),
                rejected=counts.get(QuoteStatus.REJECTED, 0),
            ),
            nearby=[self._nearby_response(job, user, metres) for job, metres in nearby[:HOME_NEARBY_LIMIT]],
            nearby_count=len(nearby),
            # Wallet and payouts arrive with escrow
            earnings=EarningsSummary(week_paise=0, wallet_paise=0),
        )

    # ----- Helpers -----

    def _apply(self, db: Session, job: Job, fields: JobFields) -> None:
        values = fields.model_dump(exclude_unset=True, exclude={"title", "submit"})
        if values.get("category_id") is not None and db.get(CatalogCategory, values["category_id"]) is None:
            raise UnknownCategoryError
        for name, value in values.items():
            setattr(job, name, value)
        if fields.submit:
            missing = [
                label for label, value in (
                    ("a description", job.description), ("a category", job.category_id),
                    ("the area", job.area_name), ("the pincode", job.pincode),
                ) if not value
            ]
            if missing:
                raise JobIncompleteError(missing)
            job.status = JobStatus.OPEN

    def _own_job(self, db: Session, user: AuthUser, job_id: str) -> Job:
        job = JobRepository(db).get(job_id)
        if job is None or job.customer_id != user.id:
            raise JobNotFoundError
        return job

    def _provider_profile(self, db: Session, user: AuthUser) -> ProviderProfile:
        profile = ProviderRepository(db).get_profile(user.id)
        if profile is None:
            raise ProviderProfileNotFoundError
        return profile

    def _matches(
        self, db: Session, user: AuthUser, profile: ProviderProfile, filters: NearbyFilters = NO_FILTERS
    ) -> list[tuple[Job, float | None]]:
        """Open jobs in the provider's skill categories and travel radius: emergencies first, then closest, then newest."""
        if profile.onboarding_status == OnboardingStatus.SKILLS:
            return []
        categories = {item.skill.category_id for item in profile.skills}
        if filters.category_id is not None:
            categories &= {filters.category_id}
        has_point = profile.latitude is not None and profile.longitude is not None and profile.radius_m is not None
        box = None
        if has_point:
            dlat = profile.radius_m / METRES_PER_DEGREE
            dlng = profile.radius_m / (METRES_PER_DEGREE * max(cos(radians(profile.latitude)), 0.01))
            box = (profile.latitude - dlat, profile.latitude + dlat, profile.longitude - dlng, profile.longitude + dlng)

        results: list[tuple[Job, float | None]] = []
        for job in JobRepository(db).open_candidates(categories, pincode=profile.pincode, box=box):
            if job.customer_id == user.id:
                continue
            if (filters.has_budget and job.budget_paise is None) or (filters.urgent_only and not job.is_emergency):
                continue
            metres = None
            if has_point and job.latitude is not None and job.longitude is not None:
                metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
                if metres > profile.radius_m:
                    continue
            # A distance limit drops jobs matched by pincode only: their distance is unknown
            if filters.max_km is not None and (metres is None or metres > filters.max_km * 1000):
                continue
            results.append((job, metres))

        results.sort(key=lambda item: (not item[0].is_emergency, item[1] is None, item[1] or 0, -item[0].created_at.timestamp()))
        return results

    def _attachments(self, job: Job) -> list[AttachmentResponse]:
        return [self._attachment_response(item) for item in job.attachments]

    def _attachment_response(self, attachment: JobAttachment) -> AttachmentResponse:
        return AttachmentResponse(id=attachment.id, content_type=attachment.content_type, url=attachment.url)

    def _customer_quote(self, job: Job, quote: JobQuote, profile: ProviderProfile | None) -> CustomerQuoteResponse:
        skills = [item for item in profile.skills if item.skill.category_id == job.category_id] if profile else []
        best = max(skills, key=lambda item: PROFICIENCY_RANK[item.proficiency], default=None)
        years = max((item.years_experience for item in skills if item.years_experience is not None), default=None)
        metres = None
        if profile and None not in (profile.latitude, profile.longitude, job.latitude, job.longitude):
            metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
        return CustomerQuoteResponse(
            **self._quote_response(quote).model_dump(),
            provider_label=short_name(quote.provider.name, "Helpio pro"),
            proficiency=best.proficiency if best else None,
            years_experience=years,
            approx_distance_km=approx_km(metres) if metres is not None else None,
        )

    def _nearby_response(self, job: Job, user: AuthUser, metres: float | None) -> NearbyJobResponse:
        mine = next((quote for quote in job.quotes if quote.provider_id == user.id), None)
        return NearbyJobResponse(
            id=job.id, title=job.title, description=job.description,
            category_id=job.category_id, category_name=job.category.name if job.category else None,
            area_name=job.area_name, approx_distance_km=approx_km(metres) if metres is not None else None,
            customer_label=short_name(job.customer.name, "Customer"), budget_paise=job.budget_paise,
            scheduled_at=job.scheduled_at, duration_mins=job.duration_mins, is_emergency=job.is_emergency,
            status=job.status, progress_pct=job.progress_pct, quote_count=len(pending_quotes(job)),
            my_quote=self._quote_response(mine) if mine else None,
            area_circle=fuzzed_circle(job), created_at=job.created_at,
        )

    def _job_response(self, job: Job) -> JobResponse:
        quotes = pending_quotes(job)
        return JobResponse(
            id=job.id, title=job.title, description=job.description,
            category_id=job.category_id, category_name=job.category.name if job.category else None,
            latitude=job.latitude, longitude=job.longitude, pincode=job.pincode, area_name=job.area_name,
            budget_paise=job.budget_paise, scheduled_at=job.scheduled_at, duration_mins=job.duration_mins,
            is_emergency=job.is_emergency, status=job.status, progress_pct=job.progress_pct,
            quote_count=len(quotes), lowest_quote_paise=min((quote.amount_paise for quote in quotes), default=None),
            created_at=job.created_at, updated_at=job.updated_at,
        )

    def _quote_response(self, quote: JobQuote) -> QuoteResponse:
        return QuoteResponse(
            id=quote.id, job_id=quote.job_id, amount_paise=quote.amount_paise,
            message=quote.message, status=quote.status, created_at=quote.created_at,
        )
