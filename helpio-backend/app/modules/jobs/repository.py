from collections.abc import Collection, Sequence

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.jobs.model import ACTIVE_STATUSES, InviteStatus, Job, JobInvite, JobQuote, JobStatus, QuoteStatus


class JobRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, job: Job) -> Job:
        self.db.add(job)
        self.db.flush()
        return job

    def get(self, job_id: str) -> Job | None:
        return self.db.scalar(select(Job).where(Job.id == job_id).options(selectinload(Job.quotes)))

    def list_for_customer(self, customer_id: str) -> Sequence[Job]:
        return self.db.scalars(
            select(Job)
            .where(Job.customer_id == customer_id)
            .options(selectinload(Job.quotes))
            .order_by(Job.updated_at.desc())
        ).unique().all()

    def open_candidates(
        self, category_ids: Collection[str], *, pincode: str | None,
        box: tuple[float, float, float, float] | None,
    ) -> Sequence[Job]:
        """Open jobs in the given categories, inside the lat/lng box or (without coordinates) in the pincode."""
        if not category_ids:
            return []
        places = []
        if box is not None:
            min_lat, max_lat, min_lng, max_lng = box
            places.append(and_(Job.latitude.between(min_lat, max_lat), Job.longitude.between(min_lng, max_lng)))
        if pincode is not None:
            # With a box, pincode matching only covers jobs saved without coordinates
            places.append(and_(Job.latitude.is_(None), Job.pincode == pincode) if box is not None else Job.pincode == pincode)
        if not places:
            return []
        return self.db.scalars(
            select(Job)
            .where(Job.status == JobStatus.OPEN, Job.category_id.in_(category_ids), or_(*places))
            .options(selectinload(Job.quotes))
        ).unique().all()

    def get_quote(self, job_id: str, provider_id: str) -> JobQuote | None:
        return self.db.scalar(select(JobQuote).where(JobQuote.job_id == job_id, JobQuote.provider_id == provider_id))

    def add_quote(self, quote: JobQuote) -> JobQuote:
        self.db.add(quote)
        self.db.flush()
        return quote

    def quote_counts(self, provider_id: str) -> dict[QuoteStatus, int]:
        rows = self.db.execute(
            select(JobQuote.status, func.count()).where(JobQuote.provider_id == provider_id).group_by(JobQuote.status)
        )
        return {status: count for status, count in rows}

    def active_job_for_provider(self, provider_id: str) -> Job | None:
        return self.db.scalar(
            select(Job)
            .join(JobQuote, JobQuote.job_id == Job.id)
            .where(
                JobQuote.provider_id == provider_id,
                JobQuote.status == QuoteStatus.ACCEPTED,
                Job.status.in_(ACTIVE_STATUSES),
            )
            .options(selectinload(Job.quotes))
            .order_by(Job.updated_at.desc())
            .limit(1)
        )

    def invited_open_jobs(self, provider_id: str) -> Sequence[Job]:
        """Open jobs whose customer asked this provider directly (and the provider hasn't declined)."""
        return self.db.scalars(
            select(Job)
            .join(JobInvite, JobInvite.job_id == Job.id)
            .where(
                JobInvite.provider_id == provider_id,
                JobInvite.status != InviteStatus.DECLINED,
                Job.status == JobStatus.OPEN,
            )
            .options(selectinload(Job.quotes))
        ).unique().all()
