"""Jobs, payments and payouts in the admin console: see everything, cancel a job before it starts, re-check a payment."""
from fastapi import BackgroundTasks
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.admin import audit
from app.modules.admin.audit import AuditAction, RequestInfo
from app.modules.admin.exceptions import AdminJobNotFoundError, JobNotCancellableError
from app.modules.admin.schema import (
    AdminAttemptResponse,
    AdminEventResponse,
    AdminJobDetailResponse,
    AdminJobPaymentResponse,
    AdminJobRowResponse,
    AdminMessageResponse,
    AdminPaymentRowResponse,
    AdminQuoteResponse,
    AdminStageResponse,
    PartyResponse,
    UserReviewResponse,
)
from app.modules.auth.model import AuthUser
from app.modules.jobs.chat import hired_provider_id
from app.modules.jobs.milestones import customer_link, provider_link
from app.modules.jobs.model import Job, JobEvent, JobMessage, JobStatus, QuoteStatus
from app.modules.jobs.repository import JobRepository
from app.modules.notifications.service import NotificationService
from app.modules.payments.model import AttemptStatus, Payment, PaymentStatus, PayoutStatus
from app.modules.payments.schema import PayoutItemResponse
from app.modules.payments.service import PaymentService
from app.modules.reviews.model import JobReview
from app.utils.pagination import Page, PageParams, paginate

# Cancelling is for jobs that haven't started: no work done, no money involved
CANCELLABLE = (JobStatus.OPEN, JobStatus.ACCEPTED, JobStatus.FUNDED)


def person(user: AuthUser | None) -> str:
    return (user.name or user.email) if user else "Unknown"


class WorkService:
    def __init__(self, *, payments: PaymentService | None = None, notifications: NotificationService | None = None) -> None:
        self.payments = payments or PaymentService()
        self.notifications = notifications or NotificationService()

    # ----- Jobs -----

    def jobs(self, db: Session, params: PageParams, *, status: JobStatus | None = None, q: str | None = None) -> Page[AdminJobRowResponse]:
        query = select(Job).join(AuthUser, AuthUser.id == Job.customer_id)
        if status is not None:
            query = query.where(Job.status == status)
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.where(or_(func.lower(Job.title).like(term), func.lower(AuthUser.name).like(term), func.lower(AuthUser.email).like(term)))
        jobs, total = paginate(db, query.order_by(Job.updated_at.desc()), params)
        pros = self._pros(db, jobs)
        return Page[AdminJobRowResponse](items=[self._row(job, pros) for job in jobs], total=total, page=params.page, page_size=params.page_size)

    def job(self, db: Session, job_id: str) -> AdminJobDetailResponse:
        job = self._job(db, job_id)
        pros = self._pros(db, [job])
        provider_id = hired_provider_id(job)
        provider = db.get(AuthUser, provider_id) if provider_id else None
        actors = {u.id: person(u) for u in db.scalars(
            select(AuthUser).where(AuthUser.id.in_({e.actor_id for e in self._events(db, job) if e.actor_id}))
        )}
        payments = db.scalars(select(Payment).where(Payment.job_id == job.id).order_by(Payment.created_at)).all()
        reviews = db.scalars(select(JobReview).where(JobReview.job_id == job.id).order_by(JobReview.created_at)).all()
        return AdminJobDetailResponse(
            **self._row(job, pros).model_dump(),
            description=job.description, pincode=job.pincode, latitude=job.latitude, longitude=job.longitude,
            budget_paise=job.budget_paise, scheduled_at=job.scheduled_at, is_emergency=job.is_emergency,
            started_at=job.started_at,
            customer_party=self._party(job.customer), pro_party=self._party(provider) if provider else None,
            quotes=[
                AdminQuoteResponse(pro=person(q.provider), amount_paise=q.amount_paise, status=q.status.value, message=q.message, created_at=q.created_at)
                for q in job.quotes
            ],
            stages=[
                AdminStageResponse(
                    stage=m.stage, percent=m.percent, status=m.status.value,
                    attempts=[
                        AdminAttemptResponse(
                            note=s.note, review_status=s.review_status.value, review_note=s.review_note,
                            submitted_at=s.submitted_at, photos=[p.url for p in s.photos],
                        )
                        for s in m.submissions
                    ],
                )
                for m in job.milestones
            ],
            events=[
                AdminEventResponse(type=e.type.value, actor=actors.get(e.actor_id) if e.actor_id else None, data=e.data or {}, at=e.created_at)
                for e in self._events(db, job)
            ],
            payments=[
                AdminJobPaymentResponse(
                    id=p.id, status=p.status.value, amount_paise=p.amount_paise, last_error=p.last_error, tries=len(p.attempts),
                    paid_at=p.paid_at, payout_status=p.payout_status.value, payout_reference=p.payout_reference,
                )
                for p in payments
            ],
            reviews=[
                UserReviewResponse(
                    id=r.id, job_title=job.title, author=person(r.author), stars=r.stars, comment=r.comment,
                    hidden=r.hidden_at is not None, created_at=r.created_at,
                )
                for r in reviews
            ],
            can_cancel=job.status in CANCELLABLE and job.started_at is None,
        )

    def messages(self, db: Session, admin: AuthUser, job_id: str, request: RequestInfo) -> list[AdminMessageResponse]:
        """The chat between the customer and the pro, read-only; reading it is logged."""
        job = self._job(db, job_id)
        rows = db.execute(
            select(JobMessage, AuthUser).join(AuthUser, AuthUser.id == JobMessage.sender_id)
            .where(JobMessage.job_id == job.id).order_by(JobMessage.created_at)
        ).all()
        audit.record(
            db, action=AuditAction.CHAT_VIEWED, admin=admin, target_type="job", target_id=job.id,
            summary=f'Read the chat on "{job.title}"', request=request, messages=len(rows),
        )
        db.commit()
        return [AdminMessageResponse(id=m.id, sender=person(u), body=m.body, at=m.created_at) for m, u in rows]

    def cancel(
        self, db: Session, admin: AuthUser, job_id: str, reason: str, request: RequestInfo,
        background: BackgroundTasks | None = None,
    ) -> AdminJobDetailResponse:
        job = self._job(db, job_id)
        if job.status not in CANCELLABLE or job.started_at is not None:
            raise JobNotCancellableError
        provider_id = hired_provider_id(job)
        job.status = JobStatus.CANCELLED
        for quote in job.quotes:
            if quote.status == QuoteStatus.PENDING:
                quote.status = QuoteStatus.REJECTED
        audit.record(
            db, action=AuditAction.JOB_CANCELLED, admin=admin, target_type="job", target_id=job.id,
            summary=f'Cancelled "{job.title}"', request=request, reason=reason,
        )
        body = f'Helpio cancelled "{job.title}": {reason}'
        self.notifications.notify(
            db, job.customer, type="job_cancelled", title="Your job was cancelled", body=body,
            job_id=job.id, link=customer_link(job.id), background=background,
        )
        provider = db.get(AuthUser, provider_id) if provider_id else None
        if provider is not None:
            self.notifications.notify(
                db, provider, type="job_cancelled", title="A job you were hired for was cancelled", body=body,
                job_id=job.id, link=provider_link(job.id), background=background,
            )
        db.commit()
        return self.job(db, job.id)

    # ----- Payments and payouts -----

    def payment_list(self, db: Session, params: PageParams, *, status: PaymentStatus | None = None) -> Page[AdminPaymentRowResponse]:
        query = select(Payment)
        if status is not None:
            query = query.where(Payment.status == status)
        rows, total = paginate(db, query.order_by(Payment.created_at.desc()), params)
        return Page[AdminPaymentRowResponse](items=self._payment_rows(db, rows), total=total, page=params.page, page_size=params.page_size)

    def recheck(self, db: Session, admin: AuthUser, payment_id: str, request: RequestInfo) -> AdminPaymentRowResponse:
        payment = self.payments.resync(db, payment_id)
        audit.record(
            db, action=AuditAction.PAYMENT_RECHECKED, admin=admin, target_type="payment", target_id=payment.id,
            summary=f"Re-checked a {payment.amount_paise / 100:,.0f} rupee payment with Razorpay", request=request,
            status=payment.status.value,
        )
        db.commit()
        return self._payment_rows(db, [payment])[0]

    def payouts(self, db: Session, status: PayoutStatus) -> list[PayoutItemResponse]:
        return self.payments.payouts(db, status)

    def mark_payout(
        self, db: Session, admin: AuthUser, payment_id: str, reference: str, request: RequestInfo,
        background: BackgroundTasks | None = None,
    ) -> PayoutItemResponse:
        item = self.payments.mark_payout(db, admin, payment_id, reference, background)
        audit.record(
            db, action=AuditAction.PAYOUT_SENT, admin=admin, target_type="payment", target_id=payment_id,
            summary=f"Sent {item.provider_name or item.provider_email} {item.amount_paise / 100:,.0f} rupees for \"{item.job_title}\"",
            request=request, reference=reference,
        )
        db.commit()
        return item

    # ----- Helpers -----

    def _job(self, db: Session, job_id: str) -> Job:
        job = JobRepository(db).get(job_id)
        if job is None:
            raise AdminJobNotFoundError
        return job

    def _events(self, db: Session, job: Job) -> list[JobEvent]:
        return list(db.scalars(select(JobEvent).where(JobEvent.job_id == job.id).order_by(JobEvent.created_at.desc())))

    def _pros(self, db: Session, jobs: list[Job]) -> dict[str, AuthUser]:
        ids = {hired_provider_id(job) for job in jobs} - {None}
        return {u.id: u for u in db.scalars(select(AuthUser).where(AuthUser.id.in_(ids)))} if ids else {}

    def _row(self, job: Job, pros: dict[str, AuthUser]) -> AdminJobRowResponse:
        provider_id = hired_provider_id(job)
        hired = next((q.amount_paise for q in job.quotes if q.status == QuoteStatus.ACCEPTED), None)
        return AdminJobRowResponse(
            id=job.id, title=job.title, status=job.status.value, category=job.category.name if job.category else None,
            area=job.area_name, customer=person(job.customer), pro=person(pros.get(provider_id)) if provider_id else None,
            amount_paise=hired if hired is not None else job.budget_paise, progress_pct=job.progress_pct,
            created_at=job.created_at, updated_at=job.updated_at,
        )

    def _party(self, user: AuthUser) -> PartyResponse:
        return PartyResponse(id=user.id, name=user.name, email=user.email, phone=user.phone)

    def _payment_rows(self, db: Session, payments: list[Payment]) -> list[AdminPaymentRowResponse]:
        users = {u.id: u for u in db.scalars(
            select(AuthUser).where(AuthUser.id.in_({p.customer_id for p in payments} | {p.provider_id for p in payments}))
        )}
        titles = dict(db.execute(select(Job.id, Job.title).where(Job.id.in_({p.job_id for p in payments}))).all())
        return [
            AdminPaymentRowResponse(
                id=p.id, job_id=p.job_id, job_title=titles.get(p.job_id, ""), customer=person(users.get(p.customer_id)),
                pro=person(users.get(p.provider_id)), amount_paise=p.amount_paise, status=p.status.value, method=p.method,
                last_error=p.last_error, tries=len(p.attempts),
                failed_tries=sum(1 for a in p.attempts if a.status == AttemptStatus.FAILED),
                payout_status=p.payout_status.value, created_at=p.created_at, paid_at=p.paid_at,
            )
            for p in payments
        ]
