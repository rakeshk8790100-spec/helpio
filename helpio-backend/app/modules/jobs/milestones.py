"""Four 25% stages per hired job: the pro sends photos and a note, the customer approves or asks for changes."""
from datetime import timedelta
from uuid import uuid4

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import utc_now
from app.core.geo import short_name
from app.integrations.cloudinary import JOB_ATTACHMENTS_FOLDER, CloudinaryStorage, FileStorage
from app.modules.auth.model import AuthUser
from app.modules.jobs.chat import hired_provider_id
from app.modules.jobs.exceptions import (
    EstimateAlreadySetError,
    JobNotFoundError,
    JobNotInProgressError,
    MilestoneLockedError,
    MilestoneNotFoundError,
    MilestoneNotOpenError,
    MilestoneNotSubmittedError,
    MilestonePhotosRequiredError,
    UnsupportedAttachmentError,
)
from app.modules.jobs.model import (
    MILESTONE_STAGES,
    STAGE_PERCENT,
    Job,
    JobEvent,
    JobEventType,
    JobMilestone,
    JobMilestonePhoto,
    JobMilestoneSubmission,
    JobStatus,
    MilestoneStatus,
    QuoteStatus,
)
from app.modules.jobs.repository import JobRepository
from app.modules.jobs.schema import (
    ATTACHMENT_TYPES,
    MAX_ATTACHMENT_BYTES,
    MAX_ATTACHMENTS,
    JobEventResponse,
    MilestonePhotoResponse,
    MilestoneResponse,
    MilestonesResponse,
    MilestoneSubmissionResponse,
)
from app.modules.notifications.service import NotificationService, send_email


def hired_amount(job: Job) -> int:
    return next((q.amount_paise for q in job.quotes if q.status == QuoteStatus.ACCEPTED), 0)


def stage_amount(total: int, stage: int) -> int:
    """A stage's share of the quote; the last stage takes the rounding remainder."""
    share = total * STAGE_PERCENT // 100
    return total - share * (len(MILESTONE_STAGES) - 1) if stage == MILESTONE_STAGES[-1] else share


def earned(job: Job) -> int:
    total = hired_amount(job)
    return sum(stage_amount(total, m.stage) for m in job.milestones if m.status == MilestoneStatus.APPROVED)


def current_milestone(job: Job) -> JobMilestone | None:
    return next((m for m in job.milestones if m.status != MilestoneStatus.APPROVED), None)


def customer_link(job_id: str) -> str:
    return f"/jobs/{job_id}"


def provider_link(job_id: str) -> str:
    return f"/pro/jobs/{job_id}"


def stage_label(milestone: JobMilestone) -> str:
    return f"Stage {milestone.stage} ({milestone.percent}%)"


def add_event(db: Session, job: Job, actor_id: str | None, type: JobEventType, **data: object) -> None:
    db.add(JobEvent(job_id=job.id, actor_id=actor_id, type=type, data=data))


def job_for_party(db: Session, user: AuthUser, job_id: str) -> tuple[Job, str]:
    """The job and its hired pro; only the customer and that pro may see what happens after hire."""
    job = JobRepository(db).get(job_id)
    provider_id = hired_provider_id(job) if job else None
    if job is None or provider_id is None or user.id not in (job.customer_id, provider_id):
        raise JobNotFoundError
    return job, provider_id


def schedule_stages(job: Job) -> None:
    """Each stage's target: a quarter of the estimate after another, counted from the start. Set once, never moved."""
    if job.started_at is None or job.estimated_mins is None:
        return
    for m in job.milestones:
        m.due_at = job.started_at + timedelta(minutes=round(job.estimated_mins * m.stage / len(MILESTONE_STAGES)))


def fixing_minutes(milestone: JobMilestone) -> int:
    """Time between the customer sending a stage back and the pro's next update: fixing, not charged."""
    total = 0
    for previous, nxt in zip(milestone.submissions, milestone.submissions[1:]):
        if previous.reviewed_at is not None:
            total += max(0, round((nxt.submitted_at - previous.reviewed_at).total_seconds() / 60))
    last = milestone.submissions[-1] if milestone.submissions else None
    # Still fixing: count up to now
    if last is not None and last.review_status == MilestoneStatus.CHANGES_REQUESTED and last.reviewed_at is not None:
        total += max(0, round((utc_now() - last.reviewed_at).total_seconds() / 60))
    return total


def notify_overdue(db: Session, notifications: NotificationService | None = None) -> int:
    """
    Tell the customer and the pro, once per stage, that an in-progress job's current stage passed its target
    without an update. Emails go out directly: there's no request to attach them to. Returns how many were flagged.
    """
    notifications = notifications or NotificationService()
    late = db.scalars(
        select(JobMilestone)
        .join(Job, Job.id == JobMilestone.job_id)
        .where(
            Job.status == JobStatus.IN_PROGRESS,
            JobMilestone.due_at.is_not(None),
            JobMilestone.due_at < utc_now(),
            JobMilestone.overdue_notified_at.is_(None),
            JobMilestone.status.in_((MilestoneStatus.PENDING, MilestoneStatus.CHANGES_REQUESTED)),
        )
    ).all()
    flagged = 0
    emails: list[tuple[AuthUser, str, str, str]] = []
    for milestone in late:
        job = JobRepository(db).get(milestone.job_id)
        # Only the stage being worked on; later stages wait for their turn
        if job is None or current_milestone(job) is not milestone:
            continue
        provider_id = hired_provider_id(job)
        provider = db.get(AuthUser, provider_id) if provider_id else None
        milestone.overdue_notified_at = utc_now()
        add_event(db, job, None, JobEventType.STAGE_OVERDUE, stage=milestone.stage)
        due = f"{milestone.percent}% of \"{job.title}\" was due"
        sides = [(job.customer, customer_link(job.id), f"{due}. Your pro hasn't sent the update yet.")]
        if provider is not None:
            sides.append((provider, provider_link(job.id), f"{due}. Send photos for approval as soon as it's done."))
        for user, link, body in sides:
            title = f"{stage_label(milestone)} update is late"
            notifications.notify(db, user, type="stage_overdue", title=title, body=body, job_id=job.id, link=link)
            emails.append((user, title, body, link))
        flagged += 1
    db.commit()
    base = get_settings().app_web_url.rstrip("/")
    for user, title, body, link in emails:
        if user.email:
            send_email(notifications.email_client, user.email, title, body, f"{base}{link}" if base else None)
    return flagged


def create_milestones(db: Session, job: Job, actor_id: str) -> None:
    """On hire: four pending 25% stages, and the first timeline entry."""
    if not job.milestones:
        job.milestones.extend(
            JobMilestone(stage=stage, percent=stage * STAGE_PERCENT) for stage in MILESTONE_STAGES
        )
    add_event(db, job, actor_id, JobEventType.HIRED)


class MilestoneService:
    def __init__(
        self, *, storage: FileStorage | None = None, notifications: NotificationService | None = None
    ) -> None:
        self._storage_client = storage
        self.notifications = notifications or NotificationService()

    @property
    def storage(self) -> FileStorage:
        if self._storage_client is None:
            self._storage_client = CloudinaryStorage()
        return self._storage_client

    def view(self, db: Session, user: AuthUser, job_id: str) -> MilestonesResponse:
        job, _ = self._job_for(db, user, job_id)
        return self._response(db, job, user)

    def set_estimate(self, db: Session, user: AuthUser, job_id: str, minutes: int) -> MilestonesResponse:
        """For jobs started before estimates existed: the pro sets it once; targets count from the start."""
        job, provider_id = self._job_for(db, user, job_id)
        if user.id != provider_id:
            raise JobNotFoundError
        if job.status != JobStatus.IN_PROGRESS:
            raise JobNotInProgressError
        if job.estimated_mins is not None:
            raise EstimateAlreadySetError
        job.estimated_mins = minutes
        schedule_stages(job)
        db.commit()
        return self._response(db, job, user)

    def submit(
        self, db: Session, user: AuthUser, job_id: str, stage: int, note: str,
        files: list[tuple[bytes, str]], background: BackgroundTasks | None = None,
    ) -> MilestonesResponse:
        job, provider_id = self._job_for(db, user, job_id)
        if user.id != provider_id:
            raise JobNotFoundError
        if job.status != JobStatus.IN_PROGRESS:
            raise JobNotInProgressError
        milestone = self._milestone(job, stage)
        if any(m.stage < stage and m.status != MilestoneStatus.APPROVED for m in job.milestones):
            raise MilestoneLockedError
        if milestone.status not in (MilestoneStatus.PENDING, MilestoneStatus.CHANGES_REQUESTED):
            raise MilestoneNotOpenError
        if not 1 <= len(files) <= MAX_ATTACHMENTS:
            raise MilestonePhotosRequiredError(MAX_ATTACHMENTS)
        # Check every file before uploading any, so a bad one doesn't leave others orphaned
        if any(kind not in ATTACHMENT_TYPES or not 0 < len(content) <= MAX_ATTACHMENT_BYTES for content, kind in files):
            raise UnsupportedAttachmentError

        submission = JobMilestoneSubmission(id=str(uuid4()), provider_id=user.id, note=note)
        for content, kind in files:
            photo = JobMilestonePhoto(id=str(uuid4()), content_type=kind)
            stored = self.storage.upload(
                content, content_type=kind,
                folder=f"{JOB_ATTACHMENTS_FOLDER}/{job.id}/progress", public_id=photo.id,
            )
            photo.url, photo.public_id, photo.resource_type = stored.url, stored.public_id, stored.resource_type
            submission.photos.append(photo)
        milestone.submissions.append(submission)
        milestone.status = MilestoneStatus.SUBMITTED
        add_event(db, job, user.id, JobEventType.MILESTONE_SUBMITTED, stage=stage, photos=len(files))
        self.notifications.notify(
            db, job.customer, type="milestone_submitted",
            title=f"{stage_label(milestone)} ready for your approval",
            body=f"{short_name(user.name, 'Your pro')} finished {milestone.percent}% of \"{job.title}\" "
                 "and sent photos. Review and approve, or ask for changes.",
            job_id=job.id, link=customer_link(job.id), background=background,
        )
        db.commit()
        return self._response(db, job, user)

    def approve(
        self, db: Session, user: AuthUser, job_id: str, stage: int, background: BackgroundTasks | None = None
    ) -> MilestonesResponse:
        job, provider_id = self._own_job(db, user, job_id)
        milestone, submission = self._waiting(job, stage)
        now = utc_now()
        submission.review_status = MilestoneStatus.APPROVED
        submission.reviewed_at = now
        milestone.status = MilestoneStatus.APPROVED
        milestone.approved_at = now
        job.progress_pct = milestone.percent
        add_event(db, job, user.id, JobEventType.MILESTONE_APPROVED, stage=stage)
        provider = db.get(AuthUser, provider_id)
        amount = stage_amount(hired_amount(job), stage)
        last = stage == MILESTONE_STAGES[-1]
        self.notifications.notify(
            db, provider, type="milestone_approved",
            title=f"{stage_label(milestone)} approved",
            body=f"The customer approved {milestone.percent}% of \"{job.title}\" (₹{amount / 100:,.0f} of your quote)."
                 + (" The customer pays next, then Helpio sends the money to you." if last else " You can start the next stage."),
            job_id=job.id, link=provider_link(job.id), background=background,
        )
        if last:
            # Paying completes the job (see PaymentService)
            job.status = JobStatus.PAYMENT_DUE
            self.notifications.notify(
                db, job.customer, type="payment_due", title="Work done: time to pay",
                body=f"All four stages of \"{job.title}\" are approved. Pay ₹{hired_amount(job) / 100:,.0f} "
                     "with UPI or netbanking to complete the job, and rate your pro.",
                job_id=job.id, link=customer_link(job.id), background=background,
            )
        db.commit()
        return self._response(db, job, user)

    def request_changes(
        self, db: Session, user: AuthUser, job_id: str, stage: int, reason: str,
        background: BackgroundTasks | None = None,
    ) -> MilestonesResponse:
        job, provider_id = self._own_job(db, user, job_id)
        milestone, submission = self._waiting(job, stage)
        submission.review_status = MilestoneStatus.CHANGES_REQUESTED
        submission.review_note = reason
        submission.reviewed_at = utc_now()
        milestone.status = MilestoneStatus.CHANGES_REQUESTED
        add_event(db, job, user.id, JobEventType.CHANGES_REQUESTED, stage=stage, reason=reason)
        self.notifications.notify(
            db, db.get(AuthUser, provider_id), type="changes_requested",
            title=f"Changes requested on {stage_label(milestone).lower()}",
            body=f"The customer asked for changes on \"{job.title}\": {reason}",
            job_id=job.id, link=provider_link(job.id), background=background,
        )
        db.commit()
        return self._response(db, job, user)

    # ----- Helpers -----

    def _job_for(self, db: Session, user: AuthUser, job_id: str) -> tuple[Job, str]:
        return job_for_party(db, user, job_id)

    def _own_job(self, db: Session, user: AuthUser, job_id: str) -> tuple[Job, str]:
        job, provider_id = self._job_for(db, user, job_id)
        if user.id != job.customer_id:
            raise JobNotFoundError
        return job, provider_id

    def _milestone(self, job: Job, stage: int) -> JobMilestone:
        milestone = next((m for m in job.milestones if m.stage == stage), None)
        if milestone is None:
            raise MilestoneNotFoundError
        return milestone

    def _waiting(self, job: Job, stage: int) -> tuple[JobMilestone, JobMilestoneSubmission]:
        milestone = self._milestone(job, stage)
        if milestone.status != MilestoneStatus.SUBMITTED or not milestone.submissions:
            raise MilestoneNotSubmittedError
        return milestone, milestone.submissions[-1]

    def _response(self, db: Session, job: Job, user: AuthUser) -> MilestonesResponse:
        total = hired_amount(job)
        current = current_milestone(job)
        events = db.scalars(
            select(JobEvent).where(JobEvent.job_id == job.id).order_by(JobEvent.created_at.desc())
        ).all()
        provider_id = hired_provider_id(job)
        provider = db.get(AuthUser, provider_id) if provider_id else None
        labels = {
            job.customer_id: short_name(job.customer.name, "Customer"),
            **({provider.id: short_name(provider.name, "Helpio pro")} if provider else {}),
            user.id: "You",
        }
        return MilestonesResponse(
            job_id=job.id, job_title=job.title, job_status=job.status, progress_pct=job.progress_pct,
            amount_paise=total, earned_paise=earned(job), current_stage=current.stage if current else None,
            estimated_mins=job.estimated_mins, started_at=job.started_at,
            extra_mins_total=sum(fixing_minutes(m) for m in job.milestones),
            milestones=[
                MilestoneResponse(
                    stage=m.stage, percent=m.percent, status=m.status, amount_paise=stage_amount(total, m.stage),
                    approved_at=m.approved_at, due_at=m.due_at, extra_mins=fixing_minutes(m),
                    submissions=[
                        MilestoneSubmissionResponse(
                            id=s.id, note=s.note, submitted_at=s.submitted_at, review_status=s.review_status,
                            review_note=s.review_note, reviewed_at=s.reviewed_at,
                            photos=[MilestonePhotoResponse(id=p.id, content_type=p.content_type, url=p.url) for p in s.photos],
                        )
                        for s in m.submissions
                    ],
                )
                for m in job.milestones
            ],
            events=[
                JobEventResponse(
                    id=e.id, type=e.type, actor_label=labels.get(e.actor_id) if e.actor_id else None,
                    data=e.data or {}, created_at=e.created_at,
                )
                for e in events
            ],
        )
