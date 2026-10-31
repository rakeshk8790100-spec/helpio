from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import Row, func, select
from sqlalchemy.orm import Session

from app.modules.jobs.model import Job
from app.modules.payments.model import Payment, PaymentStatus, PayoutStatus


class PaymentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, payment: Payment) -> Payment:
        self.db.add(payment)
        self.db.flush()
        return payment

    def for_job(self, job_id: str) -> Sequence[Payment]:
        """Oldest first; the last one is the current link."""
        return self.db.scalars(select(Payment).where(Payment.job_id == job_id).order_by(Payment.created_at)).all()

    def live(self, job_id: str) -> Payment | None:
        """The open or paid link; there is at most one."""
        return self.db.scalar(
            select(Payment).where(Payment.job_id == job_id, Payment.status.in_((PaymentStatus.PENDING, PaymentStatus.PAID)))
        )

    def by_link(self, link_id: str) -> Payment | None:
        return self.db.scalar(select(Payment).where(Payment.razorpay_link_id == link_id))

    def by_order(self, order_id: str) -> Payment | None:
        return self.db.scalar(select(Payment).where(Payment.razorpay_order_id == order_id))

    def lock(self, payment_id: str) -> Payment:
        """Re-read the row and hold it until commit, so two syncs of one payment run one after the other."""
        return self.db.scalars(
            select(Payment).where(Payment.id == payment_id).with_for_update().execution_options(populate_existing=True)
        ).one()

    def payouts(self, status: PayoutStatus) -> Sequence[Payment]:
        return self.db.scalars(
            select(Payment)
            .where(Payment.status == PaymentStatus.PAID, Payment.payout_status == status)
            .order_by(Payment.paid_at)
        ).all()

    def earnings_for_provider(self, provider_id: str) -> Sequence[Row[tuple[Payment, str]]]:
        """The pro's paid jobs with their titles, latest payment first."""
        return self.db.execute(
            select(Payment, Job.title)
            .join(Job, Job.id == Payment.job_id)
            .where(Payment.provider_id == provider_id, Payment.status == PaymentStatus.PAID)
            .order_by(Payment.paid_at.desc())
        ).all()

    def paid_total(self, provider_id: str, *, payout: PayoutStatus | None = None, since: datetime | None = None) -> int:
        query = select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
            Payment.provider_id == provider_id, Payment.status == PaymentStatus.PAID
        )
        if payout is not None:
            query = query.where(Payment.payout_status == payout)
        if since is not None:
            query = query.where(Payment.paid_at >= since)
        return self.db.scalar(query) or 0
