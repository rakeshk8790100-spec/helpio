"""Customers and providers in the admin console: find them, see everything about them, deactivate or sign them out."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.admin import audit
from app.modules.admin.access import label
from app.modules.admin.approvals import MEMBER_ROLES, provider_summary
from app.modules.admin.audit import AuditAction, RequestInfo
from app.modules.admin.exceptions import UserNotFoundError
from app.modules.admin.schema import (
    UserDetailResponse,
    UserJobResponse,
    UserPaymentResponse,
    UserReviewResponse,
    UserRowResponse,
)
from app.modules.auth.model import ApprovalStatus, AuthUser, UserRole
from app.modules.jobs.model import Job, JobQuote, QuoteStatus
from app.modules.payments.model import Payment, PaymentStatus, PayoutStatus
from app.modules.providers.repository import ProviderRepository
from app.modules.reviews.model import JobReview
from app.modules.reviews.repository import NO_RATING, ReviewRepository
from app.utils.pagination import Page, PageParams, paginate

LIST_LIMIT = 20


class PeopleService:
    def list(
        self, db: Session, params: PageParams, *, role: UserRole | None = None, approval: ApprovalStatus | None = None,
        active: bool | None = None, q: str | None = None,
    ) -> Page[UserRowResponse]:
        query = select(AuthUser).where(AuthUser.role.in_((role,) if role in MEMBER_ROLES else MEMBER_ROLES))
        if approval is not None:
            query = query.where(AuthUser.approval_status == approval)
        if active is not None:
            query = query.where(AuthUser.is_active.is_(active))
        if q and q.strip():
            term = f"%{q.strip().lower()}%"
            query = query.where(or_(func.lower(AuthUser.name).like(term), func.lower(AuthUser.email).like(term), AuthUser.phone.like(term)))
        users, total = paginate(db, query.order_by(AuthUser.created_at.desc()), params)
        ids = [u.id for u in users]
        posted = dict(db.execute(select(Job.customer_id, func.count()).where(Job.customer_id.in_(ids)).group_by(Job.customer_id)).all())
        hired = dict(db.execute(
            select(JobQuote.provider_id, func.count())
            .where(JobQuote.provider_id.in_(ids), JobQuote.status == QuoteStatus.ACCEPTED).group_by(JobQuote.provider_id)
        ).all())
        ratings = ReviewRepository(db).summaries(ids)
        return Page[UserRowResponse](
            items=[self._row(u, posted.get(u.id, 0) if u.role == UserRole.CUSTOMER else hired.get(u.id, 0), ratings) for u in users],
            total=total, page=params.page, page_size=params.page_size,
        )

    def detail(self, db: Session, user_id: str) -> UserDetailResponse:
        user = self._member(db, user_id)
        provider = user.role == UserRole.PROVIDER
        if provider:
            jobs = db.scalars(
                select(Job).join(JobQuote, JobQuote.job_id == Job.id)
                .where(JobQuote.provider_id == user.id, JobQuote.status == QuoteStatus.ACCEPTED)
                .order_by(Job.created_at.desc()).limit(LIST_LIMIT)
            ).all()
            quotes = {status.value: count for status, count in db.execute(
                select(JobQuote.status, func.count()).where(JobQuote.provider_id == user.id).group_by(JobQuote.status)
            ).all()}
        else:
            jobs = db.scalars(select(Job).where(Job.customer_id == user.id).order_by(Job.created_at.desc()).limit(LIST_LIMIT)).all()
            quotes = {}
        reviews = db.scalars(
            select(JobReview).where(JobReview.subject_id == user.id).order_by(JobReview.created_at.desc()).limit(LIST_LIMIT)
        ).all()
        titles = dict(db.execute(select(Job.id, Job.title).where(Job.id.in_({r.job_id for r in reviews}))).all())
        party = Payment.provider_id if provider else Payment.customer_id
        payments = db.scalars(select(Payment).where(party == user.id).order_by(Payment.created_at.desc()).limit(LIST_LIMIT)).all()
        payment_titles = dict(db.execute(select(Job.id, Job.title).where(Job.id.in_({p.job_id for p in payments}))).all())

        def paid(owed: bool) -> int:
            query = select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
                Payment.provider_id == user.id, Payment.status == PaymentStatus.PAID
            )
            if owed:
                query = query.where(Payment.payout_status == PayoutStatus.PENDING)
            return db.scalar(query) or 0

        profile = ProviderRepository(db).get_profile(user.id) if provider else None
        row = self._row(user, len(jobs), ReviewRepository(db).summaries([user.id]))
        return UserDetailResponse(
            **row.model_dump(),
            approval_note=user.approval_note, approved_at=user.approved_at,
            provider=provider_summary(profile) if profile else None,
            quotes=quotes,
            job_list=[
                UserJobResponse(
                    id=job.id, title=job.title, status=job.status.value,
                    amount_paise=next((q.amount_paise for q in job.quotes if q.status == QuoteStatus.ACCEPTED), job.budget_paise),
                    created_at=job.created_at,
                )
                for job in jobs
            ],
            reviews_received=[
                UserReviewResponse(
                    id=r.id, job_title=titles.get(r.job_id, ""), author=r.author.name or r.author.email, stars=r.stars,
                    comment=r.comment, hidden=r.hidden_at is not None, created_at=r.created_at,
                )
                for r in reviews
            ],
            reviews_given=db.scalar(select(func.count()).select_from(JobReview).where(JobReview.author_id == user.id)) or 0,
            payments=[
                UserPaymentResponse(
                    id=p.id, job_title=payment_titles.get(p.job_id, ""), status=p.status.value, amount_paise=p.amount_paise,
                    payout_status=p.payout_status.value, paid_at=p.paid_at, created_at=p.created_at,
                )
                for p in payments
            ],
            earned_paise=paid(False) if provider else 0,
            owed_paise=paid(True) if provider else 0,
        )

    def set_active(
        self, db: Session, admin: AuthUser, user_id: str, active: bool, reason: str | None, request: RequestInfo
    ) -> UserDetailResponse:
        user = self._member(db, user_id)
        if user.is_active != active:
            user.is_active = active
            if not active:
                # Signed out everywhere, and they can't log in until reactivated
                user.token_version += 1
            audit.record(
                db, action=AuditAction.USER_ACTIVATED if active else AuditAction.USER_DEACTIVATED, admin=admin,
                target_type="user", target_id=user.id,
                summary=f"{'Reactivated' if active else 'Deactivated'} {user.role.value} {label(user)}", request=request,
                **({"reason": reason} if reason else {}),
            )
            db.commit()
        return self.detail(db, user.id)

    def sign_out(self, db: Session, admin: AuthUser, user_id: str, request: RequestInfo) -> UserDetailResponse:
        """Ends every session (a lost phone, a shared password); they can log in again."""
        user = self._member(db, user_id)
        user.token_version += 1
        audit.record(
            db, action=AuditAction.USER_SIGNED_OUT, admin=admin, target_type="user", target_id=user.id,
            summary=f"Signed {label(user)} out everywhere", request=request,
        )
        db.commit()
        return self.detail(db, user.id)

    # ----- Helpers -----

    def _member(self, db: Session, user_id: str) -> AuthUser:
        user = db.get(AuthUser, user_id)
        if user is None or user.role not in MEMBER_ROLES:
            raise UserNotFoundError
        return user

    def _row(self, user: AuthUser, jobs: int, ratings: dict) -> UserRowResponse:
        rating = ratings.get(user.id, NO_RATING)
        return UserRowResponse(
            id=user.id, role=user.role, name=user.name, email=user.email, phone=user.phone,
            approval_status=user.approval_status, is_active=user.is_active, created_at=user.created_at, jobs=jobs,
            rating_average=rating.average, rating_count=rating.count,
        )
