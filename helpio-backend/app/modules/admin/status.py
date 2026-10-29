"""The console's dashboard (today's numbers, recent activity) and status page (is everything running?)."""
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta, timezone
from importlib.metadata import PackageNotFoundError, version

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import utc_now
from app.core.monitoring import EMAIL, OVERDUE_CHECK, PAYMENT_SYNC, RAZORPAY_WEBHOOK, STARTED_AT, SystemErrorLog, SystemHeartbeat
from app.core.runtime_settings import runtime_settings
from app.modules.admin import checks
from app.modules.admin.schema import (
    ActivityItemResponse,
    AttentionResponse,
    DashboardResponse,
    EmailStatusResponse,
    HeartbeatResponse,
    JobCounts,
    MoneyCounts,
    ReviewCounts,
    ServerErrorResponse,
    StatusResponse,
    UserCounts,
)
from app.modules.admin.settings import to_check
from app.modules.auth.model import ApprovalStatus, AuthUser, UserRole
from app.modules.jobs.model import Job, JobEvent, JobQuote, JobStatus, QuoteStatus
from app.modules.payments.model import AttemptStatus, Payment, PaymentAttempt, PaymentStatus, PayoutStatus
from app.modules.reviews.model import JobReview

# "Today" is India's day
IST = timezone(timedelta(hours=5, minutes=30))
ACTIVITY_LIMIT = 15
ERRORS_LIMIT = 20

HEARTBEATS = (
    (OVERDUE_CHECK, "Late-update check", "Flags stages that passed their target time and tells both sides"),
    (RAZORPAY_WEBHOOK, "Razorpay webhooks", "Payment events Razorpay sends to the server"),
    (PAYMENT_SYNC, "Payment checks", "The server asking Razorpay about open payments"),
)

try:
    VERSION = version("helpio-backend")
except PackageNotFoundError:
    VERSION = "dev"


def start_of_today():
    return utc_now().astimezone(IST).replace(hour=0, minute=0, second=0, microsecond=0)


class StatusService:
    def status(self, db: Session) -> StatusResponse:
        # Outside services are checked side by side (and reused for 30 s), so the page stays quick
        with ThreadPoolExecutor(max_workers=len(checks.CHECKS)) as pool:
            integrations = list(pool.map(checks.cached_check, checks.CHECKS))
        database = checks.check_database(db)
        rows = {row.name: row for row in db.scalars(select(SystemHeartbeat)).all()}
        now = utc_now()
        interval = runtime_settings().overdue_check_seconds

        def healthy(name: str, row: SystemHeartbeat | None) -> bool | None:
            if name == OVERDUE_CHECK:
                if not interval:
                    return None
                # Running if it worked within three intervals (plus a minute for a busy server)
                return bool(row and row.last_ok_at and now - row.last_ok_at < timedelta(seconds=3 * interval + 60)
                            and not (row.last_error_at and row.last_error_at > row.last_ok_at))
            if row is None or (row.last_ok_at is None and row.last_error_at is None):
                return None
            return not (row.last_error_at and (row.last_ok_at is None or row.last_error_at > row.last_ok_at))

        stuck = db.scalar(
            select(func.count()).select_from(Payment)
            .where(Payment.status == PaymentStatus.PENDING, Payment.created_at < now - timedelta(days=1))
        ) or 0
        payouts = db.execute(
            select(func.count(), func.coalesce(func.sum(Payment.amount_paise), 0))
            .where(Payment.status == PaymentStatus.PAID, Payment.payout_status == PayoutStatus.PENDING)
        ).one()
        waiting = db.scalar(
            select(func.count()).select_from(AuthUser).where(
                AuthUser.role.in_((UserRole.CUSTOMER, UserRole.PROVIDER)), AuthUser.approval_status == ApprovalStatus.PENDING
            )
        ) or 0
        return StatusResponse(
            env=get_settings().app_env, version=VERSION, started_at=STARTED_AT,
            database=to_check(database), integrations=[to_check(check) for check in integrations],
            heartbeats=[
                HeartbeatResponse(
                    name=name, label=label, description=description,
                    last_ok_at=rows[name].last_ok_at if name in rows else None,
                    last_error_at=rows[name].last_error_at if name in rows else None,
                    last_error=rows[name].last_error if name in rows else None,
                    healthy=healthy(name, rows.get(name)), details=rows[name].details if name in rows else {},
                )
                for name, label, description in HEARTBEATS
            ],
            email=EmailStatusResponse(
                sent=EMAIL.sent, failed=EMAIL.failed, last_ok_at=EMAIL.last_ok_at, last_error_at=EMAIL.last_error_at,
                last_error=EMAIL.last_error,
            ),
            errors=[
                ServerErrorResponse(
                    id=row.id, method=row.method, path=row.path, error_type=row.error_type, message=row.message,
                    count=row.count, first_seen=row.first_seen, last_seen=row.last_seen,
                )
                for row in db.scalars(select(SystemErrorLog).order_by(SystemErrorLog.last_seen.desc()).limit(ERRORS_LIMIT))
            ],
            attention=AttentionResponse(
                approvals_waiting=waiting, payments_stuck=stuck, payouts_waiting=payouts[0], payouts_waiting_paise=payouts[1],
            ),
        )

    def dashboard(self, db: Session) -> DashboardResponse:
        now, today = utc_now(), start_of_today()
        week = now - timedelta(days=7)
        members = (UserRole.CUSTOMER, UserRole.PROVIDER)

        roles = dict(db.execute(select(AuthUser.role, func.count()).group_by(AuthUser.role)).all())
        pending = dict(db.execute(
            select(AuthUser.role, func.count()).where(AuthUser.approval_status == ApprovalStatus.PENDING).group_by(AuthUser.role)
        ).all())

        def signups(since) -> int:
            return db.scalar(
                select(func.count()).select_from(AuthUser).where(AuthUser.role.in_(members), AuthUser.created_at >= since)
            ) or 0

        statuses = dict(db.execute(select(Job.status, func.count()).group_by(Job.status)).all())
        posted_today = db.scalar(
            select(func.count()).select_from(Job).where(Job.created_at >= today, Job.status != JobStatus.DRAFT)
        ) or 0
        due = db.execute(
            select(func.count(), func.coalesce(func.sum(JobQuote.amount_paise), 0))
            .select_from(Job).join(JobQuote, (JobQuote.job_id == Job.id) & (JobQuote.status == QuoteStatus.ACCEPTED))
            .where(Job.status == JobStatus.PAYMENT_DUE)
        ).one()
        paid_today = db.execute(
            select(func.count(), func.coalesce(func.sum(Payment.amount_paise), 0))
            .where(Payment.status == PaymentStatus.PAID, Payment.paid_at >= today)
        ).one()
        failed_day = db.scalar(
            select(func.count()).select_from(PaymentAttempt)
            .where(PaymentAttempt.status == AttemptStatus.FAILED, PaymentAttempt.attempted_at >= now - timedelta(days=1))
        ) or 0
        payouts = db.execute(
            select(func.count(), func.coalesce(func.sum(Payment.amount_paise), 0))
            .where(Payment.status == PaymentStatus.PAID, Payment.payout_status == PayoutStatus.PENDING)
        ).one()
        rating = db.execute(
            select(func.avg(JobReview.stars), func.count()).select_from(JobReview).where(JobReview.hidden_at.is_(None))
        ).one()

        events = db.execute(
            select(JobEvent, Job.title, AuthUser.name, AuthUser.email)
            .join(Job, Job.id == JobEvent.job_id)
            .outerjoin(AuthUser, AuthUser.id == JobEvent.actor_id)
            .order_by(JobEvent.created_at.desc())
            .limit(ACTIVITY_LIMIT)
        ).all()
        return DashboardResponse(
            users=UserCounts(
                customers=roles.get(UserRole.CUSTOMER, 0), providers=roles.get(UserRole.PROVIDER, 0),
                admins=roles.get(UserRole.ADMIN, 0), pending_customers=pending.get(UserRole.CUSTOMER, 0),
                pending_providers=pending.get(UserRole.PROVIDER, 0), signups_today=signups(today), signups_week=signups(week),
            ),
            jobs=JobCounts(by_status={status.value: statuses.get(status, 0) for status in JobStatus}, posted_today=posted_today),
            money=MoneyCounts(
                payment_due_count=due[0], payment_due_paise=due[1], paid_today_count=paid_today[0],
                paid_today_paise=paid_today[1], failed_tries_day=failed_day, payouts_waiting_count=payouts[0],
                payouts_waiting_paise=payouts[1],
            ),
            reviews=ReviewCounts(average=round(float(rating[0]), 1) if rating[0] is not None else None, count=rating[1]),
            activity=[
                ActivityItemResponse(
                    id=event.id, type=event.type.value, actor=name or email, job_id=event.job_id, job_title=title,
                    data=event.data or {}, at=event.created_at,
                )
                for event, title, name, email in events
            ],
        )
