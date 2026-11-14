import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import timedelta
from math import cos, pi, radians, sin
from uuid import uuid4

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import utc_now
from app.core.geo import METRES_PER_DEGREE, approx_km, bounding_box, distance_m, short_name
from app.integrations.cloudinary import JOB_ATTACHMENTS_FOLDER, CloudinaryStorage, FileStorage
from app.modules.auth.model import AuthUser
from app.modules.catalog.model import CatalogCategory
from app.modules.jobs.exceptions import (
    AlreadyInvitedError,
    AlreadyQuotedError,
    InviteNotAllowedError,
    InviteNotFoundError,
    JobNotFoundForQuoteError,
    JobNotStartableError,
    PinLockedError,
    ProviderNotVerifiedError,
    WrongPinError,
    QuoteNotPendingError,
    ProviderUnavailableError,
    TooManyInvitesError,
    AttachmentNotFoundError,
    JobClosedForChangesError,
    JobIncompleteError,
    JobNotDeletableError,
    JobNotEditableError,
    JobNotFoundError,
    JobNotOpenError,
    PastScheduleError,
    ProviderNotReadyError,
    QuoteNotFoundError,
    QuoteNotWithdrawableError,
    TooManyAttachmentsError,
    UnsupportedAttachmentError,
    UnknownCategoryError,
)
from app.modules.jobs.model import (
    ACTIVE_STATUSES,
    InviteStatus,
    Job,
    JobAttachment,
    JobEventType,
    JobInvite,
    JobQuote,
    JobStatus,
    QuoteStatus,
)
from app.modules.jobs.chat import unread_count
from app.modules.jobs.milestones import (
    add_event,
    create_milestones,
    current_milestone,
    customer_link,
    earned,
    hired_amount,
    provider_link,
    schedule_stages,
)
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.schema import (
    ATTACHMENT_TYPES,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS,
    AttachmentResponse,
    CategoryOption,
    ChecklistItem,
    CreateJobRequest,
    CreateInviteRequest,
    CreateQuoteRequest,
    InviteResponse,
    CustomerHomeResponse,
    CustomerQuoteResponse,
    ExactLocation,
    HiredProResponse,
    EarningsSummary,
    JobDetailResponse,
    JobFields,
    JobResponse,
    MapCircle,
    NearbyJobDetailResponse,
    NearbyJobResponse,
    NearbyJobsResponse,
    ProviderHomeResponse,
    ProviderJobResponse,
    QuoteCounts,
    QuoteResponse,
    UpdateJobRequest,
)
from app.modules.auth.model import ApprovalStatus
from app.modules.providers.access import provider_can_work
from app.modules.providers.exceptions import ProviderProfileNotFoundError
from app.modules.providers.model import OnboardingStatus, Proficiency, ProviderProfile
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService
from app.modules.payments.model import PayoutStatus
from app.modules.payments.repository import PaymentRepository
from app.modules.providers.directory import Place, ProviderDirectory
from app.modules.providers.repository import ProviderRepository
from app.modules.reviews.repository import ReviewRepository

HOME_NEARBY_LIMIT = 3
# Approximate job area on the map: the real spot sits 200–400 m from the centre, inside a 600 m circle
FUZZ_MIN_M, FUZZ_SPREAD_M, FUZZ_RADIUS_M = 200, 200, 600
# Photos may change until a pro is hired
EDITABLE_PHOTO_STATUSES = (JobStatus.DRAFT, JobStatus.OPEN)
PROFICIENCY_RANK = {Proficiency.BEGINNER: 0, Proficiency.INTERMEDIATE: 1, Proficiency.EXPERT: 2}
MAX_PIN_ATTEMPTS = 5
MAX_INVITES = 5
# A posted job alerts the closest pros who do the work; each pro gets at most one such email per half hour
NEARBY_NOTIFY_LIMIT = 10
JOB_ALERT_EMAIL_GAP = timedelta(minutes=30)
# Time to fill in the form: a slot picked as "now" is still fine a few minutes later
SCHEDULE_SLACK = timedelta(minutes=5)
TITLE_LENGTH = 60


@dataclass(frozen=True)
class Match:
    job: Job
    # Metres from the provider; None when matched by pincode or only by invitation
    metres: float | None


@dataclass(frozen=True)
class NearbyFilters:
    category_id: str | None = None
    max_km: float | None = None
    has_budget: bool = False
    urgent_only: bool = False


NO_FILTERS = NearbyFilters()


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


def format_minutes(minutes: int) -> str:
    """90 → "1 hr 30 min" """
    hours, mins = divmod(minutes, 60)
    return " ".join(part for part in (f"{hours} hr" if hours else "", f"{mins} min" if mins else "") if part)


def derive_title(description: str | None, category_name: str | None) -> str:
    """A short title from the description's first sentence: "Kitchen tap leaking since yesterday"."""
    first = re.split(r"[.!?\n]", (description or "").strip(), maxsplit=1)[0].strip()
    if len(first) > TITLE_LENGTH:
        first = first[:TITLE_LENGTH].rsplit(" ", 1)[0].rstrip(",;:- ")
    if len(first) >= 3:
        return first[0].upper() + first[1:]
    return f"{category_name} job" if category_name else "New job"


def rupees(paise: int) -> str:
    return f"₹{paise / 100:,.0f}"


def new_pin() -> str:
    return f"{secrets.randbelow(10_000):04d}"


def pending_quotes(job: Job) -> list[JobQuote]:
    return [quote for quote in job.quotes if quote.status == QuoteStatus.PENDING]


class JobService:
    def __init__(self, *, storage: FileStorage | None = None, notifications: NotificationService | None = None) -> None:
        self._storage_client = storage
        self.notifications = notifications or NotificationService()

    @property
    def storage(self) -> FileStorage:
        # Created on first use, so screens without photos work without Cloudinary configured
        if self._storage_client is None:
            self._storage_client = CloudinaryStorage()
        return self._storage_client

    # ----- Customer -----

    def create_job(
        self, db: Session, user: AuthUser, payload: CreateJobRequest, background: BackgroundTasks | None = None
    ) -> JobResponse:
        job = Job(customer_id=user.id, title=payload.title or "", quotes=[])
        self._apply(db, job, payload)
        if not payload.title:
            category = db.get(CatalogCategory, job.category_id) if job.category_id else None
            job.title = derive_title(job.description, category.name if category else None)
        JobRepository(db).add(job)
        if job.status == JobStatus.OPEN:
            self._announce(db, job, background)
        db.commit()
        return self._job_response(job)

    def update_job(
        self, db: Session, user: AuthUser, job_id: str, payload: UpdateJobRequest,
        background: BackgroundTasks | None = None,
    ) -> JobResponse:
        job = self._own_job(db, user, job_id)
        # Editable until a pro is hired; quotes already sent stay, and their pros see the job was changed
        if job.status not in (JobStatus.DRAFT, JobStatus.OPEN):
            raise JobNotEditableError
        posted = job.status == JobStatus.OPEN
        if payload.title is not None:
            job.title = payload.title
        # A posted job must keep everything posting needs
        self._apply(db, job, payload, require_complete=posted)
        if posted:
            job.edited_at = utc_now()
            self._tell_quoted_pros(db, job)
        elif job.status == JobStatus.OPEN:
            self._announce(db, job, background)
        db.commit()
        return self._job_response(job)

    def delete_draft(self, db: Session, user: AuthUser, job_id: str) -> None:
        job = self._own_job(db, user, job_id)
        if job.status != JobStatus.DRAFT:
            raise JobNotDeletableError
        for attachment in job.attachments:
            self.storage.delete(attachment.public_id, attachment.resource_type)
        db.delete(job)
        db.commit()

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
            hired=self._hired(job),
            start_pin=job.start_pin if job.status == JobStatus.ACCEPTED else None,
            pin_locked=job.status == JobStatus.ACCEPTED and job.start_pin_attempts >= MAX_PIN_ATTEMPTS,
            started_at=job.started_at,
            unread_messages=unread_count(db, job.id, user.id),
            invites=[
                InviteResponse(
                    provider_id=invite.provider_id, provider_label=short_name(invite.provider.name, "Helpio pro"),
                    avatar_url=invite.provider.avatar_url, status=invite.status, created_at=invite.created_at,
                )
                for invite in job.invites
            ],
        )

    def accept_quote(
        self, db: Session, user: AuthUser, job_id: str, quote_id: str, background: BackgroundTasks | None = None
    ) -> JobDetailResponse:
        """Hire the pro: their quote is accepted, every other pending quote declined. Payment comes after the work."""
        job, quote = self._own_pending_quote(db, user, job_id, quote_id)
        quote.status = QuoteStatus.ACCEPTED
        for other in job.quotes:
            if other.id != quote.id and other.status == QuoteStatus.PENDING:
                other.status = QuoteStatus.REJECTED
        job.status = JobStatus.ACCEPTED
        job.start_pin = new_pin()
        job.start_pin_attempts = 0
        create_milestones(db, job, user.id)
        self.notifications.notify(
            db, quote.provider, type="hired", title="You're hired!",
            body=f"{short_name(user.name, 'A customer')} accepted your quote for \"{job.title}\". "
                 "Ask them for the start PIN when you arrive.",
            job_id=job.id, link=provider_link(job.id), background=background,
        )
        db.commit()
        return self.get_job(db, user, job.id)

    def reset_start_pin(self, db: Session, user: AuthUser, job_id: str) -> JobDetailResponse:
        job = self._own_job(db, user, job_id)
        if job.status != JobStatus.ACCEPTED:
            raise JobNotStartableError
        job.start_pin = new_pin()
        job.start_pin_attempts = 0
        db.commit()
        return self.get_job(db, user, job.id)

    def start_job(
        self, db: Session, user: AuthUser, job_id: str, pin: str, estimated_mins: int,
        background: BackgroundTasks | None = None,
    ) -> NearbyJobDetailResponse:
        """The hired pro starts work with the PIN the customer shares in person."""
        job = JobRepository(db).get(job_id)
        if job is None or not self._is_hired(job, user.id):
            raise JobNotFoundError
        if job.status != JobStatus.ACCEPTED or job.start_pin is None:
            raise JobNotStartableError
        if job.start_pin_attempts >= MAX_PIN_ATTEMPTS:
            raise PinLockedError
        if not hmac.compare_digest(pin, job.start_pin):
            job.start_pin_attempts += 1
            left = MAX_PIN_ATTEMPTS - job.start_pin_attempts
            if left <= 0:
                self.notifications.notify(
                    db, job.customer, type="pin_locked", title="Get a new start PIN",
                    body=f"{short_name(user.name, 'Your pro')} entered a wrong PIN too many times for \"{job.title}\". "
                         "Open the job to get a new PIN and share it in person.",
                    job_id=job.id, link=customer_link(job.id), background=background,
                )
            db.commit()
            if left <= 0:
                raise PinLockedError
            raise WrongPinError(left)
        job.status = JobStatus.IN_PROGRESS
        job.started_at = utc_now()
        job.start_pin = None
        job.estimated_mins = estimated_mins
        if not job.milestones:
            # Hired before milestones existed
            create_milestones(db, job, job.customer_id)
        schedule_stages(job)
        add_event(db, job, user.id, JobEventType.STARTED, estimated_mins=estimated_mins)
        self.notifications.notify(
            db, job.customer, type="job_started", title="Work has started",
            body=f"{short_name(user.name, 'Your pro')} started \"{job.title}\" and expects it to take "
                 f"{format_minutes(estimated_mins)}. You'll approve each 25% of the work as it's done.",
            job_id=job.id, link=customer_link(job.id), background=background,
        )
        db.commit()
        return self.nearby_job(db, user, job.id)

    def decline_quote(self, db: Session, user: AuthUser, job_id: str, quote_id: str) -> JobDetailResponse:
        """Turn one quote down; the job stays open for others."""
        job, quote = self._own_pending_quote(db, user, job_id, quote_id)
        quote.status = QuoteStatus.REJECTED
        db.commit()
        return self.get_job(db, user, job.id)

    def _own_pending_quote(self, db: Session, user: AuthUser, job_id: str, quote_id: str) -> tuple[Job, JobQuote]:
        job = self._own_job(db, user, job_id)
        quote = next((q for q in job.quotes if q.id == quote_id), None)
        if quote is None:
            raise JobNotFoundForQuoteError
        if job.status != JobStatus.OPEN:
            raise JobNotOpenError
        if quote.status != QuoteStatus.PENDING:
            raise QuoteNotPendingError
        return job, quote

    def invite_provider(
        self, db: Session, user: AuthUser, job_id: str, payload: CreateInviteRequest,
        background: BackgroundTasks | None = None,
    ) -> JobDetailResponse:
        """Send an open job straight to a chosen pro; they see it first, wherever they work, and reply with a quote."""
        job = self._own_job(db, user, job_id)
        if job.status != JobStatus.OPEN:
            raise InviteNotAllowedError
        if any(invite.provider_id == payload.provider_id for invite in job.invites):
            raise AlreadyInvitedError
        if len(job.invites) >= MAX_INVITES:
            raise TooManyInvitesError(MAX_INVITES)
        profile = ProviderRepository(db).get_profile(payload.provider_id)
        provider = db.get(AuthUser, payload.provider_id)
        if not provider_can_work(profile, provider):
            raise ProviderUnavailableError
        quoted = any(q.provider_id == provider.id and q.status == QuoteStatus.PENDING for q in job.quotes)
        job.invites.append(JobInvite(
            provider_id=provider.id, message=payload.message,
            status=InviteStatus.QUOTED if quoted else InviteStatus.PENDING,
        ))
        if not quoted:
            where = f" in {job.area_name}" if job.area_name else ""
            self.notifications.notify(
                db, provider, type="job_invite", title="A customer asked you for a quote",
                body=f"{short_name(user.name, 'A customer')} sent you \"{job.title}\"{where}. Reply with your price.",
                job_id=job.id, link=provider_link(job.id), background=background,
            )
        db.commit()
        return self.get_job(db, user, job.id)

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
            jobs=[self._nearby_response(m.job, user, m.metres) for m in self._matches(db, user, profile, filters)],
        )

    def nearby_job(self, db: Session, user: AuthUser, job_id: str) -> NearbyJobDetailResponse:
        profile = self._provider_profile(db, user)
        match = next((m for m in self._matches(db, user, profile) if m.job.id == job_id), None)
        if match is None:
            # After hire the job leaves the open list; only the hired pro can still open it
            job = JobRepository(db).get(job_id)
            if job is None or not self._is_hired(job, user.id):
                raise JobNotFoundError
            metres = None
            if None not in (profile.latitude, profile.longitude, job.latitude, job.longitude):
                metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
            match = Match(job, metres)
        job = match.job
        hired = self._is_hired(job, user.id)
        return NearbyJobDetailResponse(
            **self._nearby_response(job, user, match.metres).model_dump(),
            attachments=self._attachments(job),
            # Sign-up and verification only; quoting on a job that isn't open is refused separately
            can_quote=provider_can_work(profile, user),
            hired=hired,
            exact_location=ExactLocation(
                latitude=job.latitude, longitude=job.longitude, pincode=job.pincode, area_name=job.area_name,
                address_line=job.address_line,
            ) if hired else None,
            customer_name=job.customer.name if hired else None,
            started_at=job.started_at if hired else None,
            unread_messages=unread_count(db, job.id, user.id) if hired else 0,
            customer_rating=ReviewRepository(db).summary(job.customer_id),
        )

    def create_quote(
        self, db: Session, user: AuthUser, job_id: str, payload: CreateQuoteRequest,
        background: BackgroundTasks | None = None,
    ) -> QuoteResponse:
        profile = self._provider_profile(db, user)
        if profile.onboarding_status != OnboardingStatus.COMPLETE:
            raise ProviderNotReadyError
        if not provider_can_work(profile, user):
            raise ProviderNotVerifiedError
        repo = JobRepository(db)
        job = repo.get(job_id)
        if job is None:
            raise JobNotFoundError
        if job.status != JobStatus.OPEN:
            raise JobNotOpenError
        # Providers may only quote on jobs they can see: nearby, or sent to them directly
        if job.id not in {m.job.id for m in self._matches(db, user, profile)}:
            raise JobNotFoundError
        quote = repo.get_quote(job.id, user.id)
        if quote is not None and quote.status != QuoteStatus.WITHDRAWN:
            raise AlreadyQuotedError
        first_quote = not pending_quotes(job)
        if quote is None:
            quote = repo.add_quote(
                JobQuote(job_id=job.id, provider_id=user.id, amount_paise=payload.amount_paise, message=payload.message)
            )
        else:
            # A withdrawn quote can be sent again
            quote.amount_paise = payload.amount_paise
            quote.message = payload.message
            quote.status = QuoteStatus.PENDING
            # `created_at` means "last sent", so an earlier job edit no longer counts as newer
            quote.created_at = utc_now()
        self._set_invite(job, user.id, InviteStatus.QUOTED)
        self.notifications.notify(
            db, job.customer, type="quote_received", title=f"New quote: {rupees(payload.amount_paise)}",
            body=f"{short_name(user.name, 'A pro')} sent a quote for \"{job.title}\". "
                 "Compare quotes and hire when you're ready.",
            job_id=job.id, link=customer_link(job.id),
            # The first quote (or any on an emergency) is emailed; later ones show in the app
            background=background if first_quote or job.is_emergency else None,
        )
        db.commit()
        return self._quote_response(quote)

    def decline_invite(self, db: Session, user: AuthUser, job_id: str) -> None:
        job = JobRepository(db).get(job_id)
        invite = next((i for i in job.invites if i.provider_id == user.id), None) if job else None
        if invite is None:
            raise InviteNotFoundError
        if job.status != JobStatus.OPEN:
            raise JobNotOpenError
        invite.status = InviteStatus.DECLINED
        # A pending quote goes too: declining means "not for me"
        quote = next((q for q in job.quotes if q.provider_id == user.id and q.status == QuoteStatus.PENDING), None)
        if quote is not None:
            quote.status = QuoteStatus.WITHDRAWN
        self.notifications.notify(
            db, job.customer, type="invite_declined", title="A pro can't take your job",
            body=f"{short_name(user.name, 'The pro')} can't take \"{job.title}\". Other pros nearby can still quote.",
            job_id=job.id, link=customer_link(job.id),
        )
        db.commit()

    def withdraw_quote(self, db: Session, user: AuthUser, job_id: str) -> QuoteResponse:
        quote = JobRepository(db).get_quote(job_id, user.id)
        if quote is None:
            raise QuoteNotFoundError
        if quote.status != QuoteStatus.PENDING:
            raise QuoteNotWithdrawableError
        quote.status = QuoteStatus.WITHDRAWN
        # A direct request waits for a new quote again
        job = JobRepository(db).get(job_id)
        if job is not None and any(i.provider_id == user.id and i.status == InviteStatus.QUOTED for i in job.invites):
            self._set_invite(job, user.id, InviteStatus.PENDING)
        if job is not None and job.status == JobStatus.OPEN:
            self.notifications.notify(
                db, job.customer, type="quote_withdrawn", title="A quote was withdrawn",
                body=f"{short_name(user.name, 'A pro')} withdrew their quote for \"{job.title}\".",
                job_id=job.id, link=customer_link(job.id),
            )
        db.commit()
        return self._quote_response(quote)

    def provider_jobs(self, db: Session, user: AuthUser, completed: bool = False) -> list[ProviderJobResponse]:
        """Jobs I was hired for: active ones (hired, in progress) or completed ones."""
        statuses = (JobStatus.COMPLETED,) if completed else ACTIVE_STATUSES
        responses = []
        for job in JobRepository(db).jobs_for_provider(user.id, statuses):
            current = current_milestone(job)
            responses.append(ProviderJobResponse(
                **self._nearby_response(job, user, None).model_dump(),
                customer_name=job.customer.name, started_at=job.started_at,
                amount_paise=hired_amount(job), earned_paise=earned(job),
                milestone_stage=current.stage if current else None,
                milestone_status=current.status if current else None,
                next_due_at=current.due_at if current else None,
                unread_messages=unread_count(db, job.id, user.id),
            ))
        return responses

    def provider_home(self, db: Session, user: AuthUser) -> ProviderHomeResponse:
        profile = self._provider_profile(db, user)
        repo = JobRepository(db)
        status = profile.onboarding_status
        nearby = self._matches(db, user, profile)
        counts = repo.quote_counts(user.id)
        active = repo.active_job_for_provider(user.id)
        payments = PaymentRepository(db)
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
                ChecklistItem(
                    key="verification", label="Helpio verification",
                    state="done" if user.approval_status == ApprovalStatus.APPROVED else "pending",
                ),
            ],
            can_quote=provider_can_work(profile, user),
            active_job=self._nearby_response(active, user, None) if active else None,
            quotes=QuoteCounts(
                pending=counts.get(QuoteStatus.PENDING, 0),
                accepted=counts.get(QuoteStatus.ACCEPTED, 0),
                rejected=counts.get(QuoteStatus.REJECTED, 0),
            ),
            invites=[
                self._nearby_response(m.job, user, m.metres) for m in nearby
                if self._invite_for(m.job, user.id) is not None
                and self._invite_for(m.job, user.id).status == InviteStatus.PENDING
            ],
            nearby=[self._nearby_response(m.job, user, m.metres) for m in nearby[:HOME_NEARBY_LIMIT]],
            nearby_count=len(nearby),
            earnings=EarningsSummary(
                week_paise=payments.paid_total(user.id, since=utc_now() - timedelta(days=7)),
                # Paid by customers, not yet sent on by Helpio
                wallet_paise=payments.paid_total(user.id, payout=PayoutStatus.PENDING),
            ),
        )

    # ----- Helpers -----

    def _apply(self, db: Session, job: Job, fields: JobFields, *, require_complete: bool = False) -> None:
        values = fields.model_dump(exclude_unset=True, exclude={"title", "submit"})
        category_id = values.get("category_id")
        # A category switched off in the admin console can't be picked anew; a job that has it keeps it
        if category_id is not None and category_id != job.category_id:
            category = db.get(CatalogCategory, category_id)
            if category is None or not category.is_active:
                raise UnknownCategoryError
        scheduled_at = values.get("scheduled_at")
        if scheduled_at is not None and scheduled_at != job.scheduled_at and scheduled_at < utc_now() - SCHEDULE_SLACK:
            raise PastScheduleError
        for name, value in values.items():
            setattr(job, name, value)
        if fields.submit and job.scheduled_at is not None and job.scheduled_at < utc_now() - SCHEDULE_SLACK:
            # A draft saved for a time that has since passed
            raise PastScheduleError
        if fields.submit or require_complete:
            missing = [
                label for label, value in (
                    ("a description", job.description), ("a category", job.category_id),
                    ("the area", job.area_name), ("the pincode", job.pincode),
                ) if not value
            ]
            if missing:
                raise JobIncompleteError(missing)
            job.status = JobStatus.OPEN

    def _announce(self, db: Session, job: Job, background: BackgroundTasks | None) -> None:
        """Tell the closest pros who do this kind of work about a newly posted job."""
        candidates = []
        place = Place(job.latitude, job.longitude, job.pincode, job.area_name)
        for profile, provider in ProviderDirectory().serving(db, place):
            if provider.id == job.customer_id or all(item.skill.category_id != job.category_id for item in profile.skills):
                continue
            metres = None
            if None not in (profile.latitude, profile.longitude, job.latitude, job.longitude):
                metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
            candidates.append((metres is None, metres or 0, provider))
        candidates.sort(key=lambda item: item[:2])

        recent = NotificationRepository(db)
        since = utc_now() - JOB_ALERT_EMAIL_GAP
        where = f" in {job.area_name}" if job.area_name else " near you"
        for _, _, provider in candidates[:NEARBY_NOTIFY_LIMIT]:
            # Always in the app; emailed at most once per gap, except emergencies
            email = job.is_emergency or recent.recent_count(provider.id, "job_nearby", since) == 0
            self.notifications.notify(
                db, provider, type="job_nearby", title="Urgent job near you" if job.is_emergency else "New job near you",
                body=f"\"{job.title}\"{where}. Send your quote before others do.",
                job_id=job.id, link=provider_link(job.id), background=background if email else None,
            )

    def _tell_quoted_pros(self, db: Session, job: Job) -> None:
        """Pros who already quoted hear the job changed (once until they look), so they can check their price."""
        recent = NotificationRepository(db)
        for quote in pending_quotes(job):
            if recent.has_unread(quote.provider_id, "job_updated", job.id):
                continue
            self.notifications.notify(
                db, quote.provider, type="job_updated", title="A job you quoted on changed",
                body=f"The customer edited \"{job.title}\". Check your quote still fits.",
                job_id=job.id, link=provider_link(job.id),
            )

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
    ) -> list[Match]:
        """
        Jobs sent to the provider directly (any distance or category), then open jobs in their skill categories
        and travel radius: direct requests first, then emergencies, then closest, then newest.
        """
        if profile.onboarding_status == OnboardingStatus.SKILLS:
            return []
        categories = {item.skill.category_id for item in profile.skills}
        if filters.category_id is not None:
            categories &= {filters.category_id}
        has_point = profile.latitude is not None and profile.longitude is not None and profile.radius_m is not None
        box = None
        if has_point:
            box = bounding_box(profile.latitude, profile.longitude, profile.radius_m)

        results: list[Match] = []
        repo = JobRepository(db)
        for job in repo.invited_open_jobs(user.id):
            if (filters.category_id and job.category_id != filters.category_id) or self._excluded(job, filters):
                continue
            metres = None
            if has_point and job.latitude is not None and job.longitude is not None:
                metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
            results.append(Match(job, metres))
        invited = {m.job.id for m in results}

        for job in repo.open_candidates(categories, pincode=profile.pincode, box=box):
            if job.id in invited:
                continue
            if job.customer_id == user.id:
                continue
            if self._excluded(job, filters):
                continue
            metres = None
            if has_point and job.latitude is not None and job.longitude is not None:
                metres = distance_m(profile.latitude, profile.longitude, job.latitude, job.longitude)
                if metres > profile.radius_m:
                    continue
            # A distance limit drops jobs matched by pincode only: their distance is unknown
            if filters.max_km is not None and (metres is None or metres > filters.max_km * 1000):
                continue
            results.append(Match(job, metres))

        results.sort(key=lambda m: (
            m.job.id not in invited, not m.job.is_emergency, m.metres is None, m.metres or 0, -m.job.created_at.timestamp(),
        ))
        return results

    def _is_hired(self, job: Job, provider_id: str) -> bool:
        return any(q.provider_id == provider_id and q.status == QuoteStatus.ACCEPTED for q in job.quotes)

    def _hired(self, job: Job) -> HiredProResponse | None:
        quote = next((q for q in job.quotes if q.status == QuoteStatus.ACCEPTED), None)
        if quote is None:
            return None
        return HiredProResponse(
            provider_id=quote.provider_id, provider_label=short_name(quote.provider.name, "Helpio pro"),
            avatar_url=quote.provider.avatar_url, amount_paise=quote.amount_paise,
        )

    def _excluded(self, job: Job, filters: NearbyFilters) -> bool:
        return (filters.has_budget and job.budget_paise is None) or (filters.urgent_only and not job.is_emergency)

    def _invite_for(self, job: Job, provider_id: str) -> JobInvite | None:
        return next((invite for invite in job.invites if invite.provider_id == provider_id), None)

    def _set_invite(self, job: Job, provider_id: str, status: InviteStatus) -> None:
        invite = self._invite_for(job, provider_id)
        if invite is not None and invite.status != InviteStatus.DECLINED:
            invite.status = status

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
            provider_id=quote.provider_id,
            provider_label=short_name(quote.provider.name, "Helpio pro"),
            avatar_url=quote.provider.avatar_url,
            proficiency=best.proficiency if best else None,
            years_experience=years,
            approx_distance_km=approx_km(metres) if metres is not None else None,
        )

    def _nearby_response(self, job: Job, user: AuthUser, metres: float | None) -> NearbyJobResponse:
        mine = next((quote for quote in job.quotes if quote.provider_id == user.id), None)
        invite = self._invite_for(job, user.id)
        return NearbyJobResponse(
            id=job.id, title=job.title, description=job.description,
            category_id=job.category_id, category_name=job.category.name if job.category else None,
            area_name=job.area_name, approx_distance_km=approx_km(metres) if metres is not None else None,
            customer_label=short_name(job.customer.name, "Customer"), budget_paise=job.budget_paise,
            scheduled_at=job.scheduled_at, duration_mins=job.duration_mins, is_emergency=job.is_emergency,
            status=job.status, progress_pct=job.progress_pct, quote_count=len(pending_quotes(job)),
            my_quote=self._quote_response(mine) if mine else None,
            edited_after_my_quote=bool(mine and job.edited_at and job.edited_at > mine.created_at),
            invite_status=invite.status if invite and invite.status != InviteStatus.DECLINED else None,
            invite_message=invite.message if invite and invite.status != InviteStatus.DECLINED else None,
            area_circle=fuzzed_circle(job), created_at=job.created_at,
        )

    def _job_response(self, job: Job) -> JobResponse:
        quotes = pending_quotes(job)
        current = current_milestone(job)
        return JobResponse(
            id=job.id, title=job.title, description=job.description,
            category_id=job.category_id, category_name=job.category.name if job.category else None,
            latitude=job.latitude, longitude=job.longitude, pincode=job.pincode, area_name=job.area_name,
            address_line=job.address_line, budget_paise=job.budget_paise, scheduled_at=job.scheduled_at, duration_mins=job.duration_mins,
            is_emergency=job.is_emergency, status=job.status, progress_pct=job.progress_pct,
            quote_count=len(quotes), lowest_quote_paise=min((quote.amount_paise for quote in quotes), default=None),
            created_at=job.created_at, updated_at=job.updated_at, edited_at=job.edited_at,
            milestone_stage=current.stage if current else None,
            milestone_status=current.status if current else None,
        )

    def _quote_response(self, quote: JobQuote) -> QuoteResponse:
        return QuoteResponse(
            id=quote.id, job_id=quote.job_id, amount_paise=quote.amount_paise,
            message=quote.message, status=quote.status, created_at=quote.created_at,
        )
