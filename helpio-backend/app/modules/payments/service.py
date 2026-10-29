"""
After all four stages are approved the customer pays the hired quote on a Razorpay Payment Link (UPI or netbanking).
Razorpay's API is the source of truth: `_sync` reads the link and every try on it, and is the only place a payment
changes state, whether a webhook, the return from Razorpay or a page view asked. Paying completes the job; Helpio then
sends the pro their money by hand and marks the payout.
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import BackgroundTasks
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.monitoring import PAYMENT_SYNC, RAZORPAY_WEBHOOK, beat
from app.core.runtime_settings import runtime_settings
from app.core.database import utc_now
from app.integrations.payment import PaymentGateway, PaymentGatewayError, RazorpayGateway
from app.modules.auth.model import AuthUser
from app.modules.jobs.exceptions import JobNotFoundError
from app.modules.jobs.milestones import add_event, customer_link, hired_amount, job_for_party, provider_link
from app.modules.jobs.model import Job, JobEventType, JobStatus
from app.modules.jobs.repository import JobRepository
from app.modules.notifications.service import NotificationService
from app.modules.payments.exceptions import (
    AlreadyPaidError,
    PaymentNotDueError,
    PaymentNotFoundError,
    PaymentNotPaidError,
    PaymentSignatureError,
    PayoutAlreadySentError,
    WebhookSignatureError,
)
from app.modules.payments.model import AttemptStatus, Payment, PaymentAttempt, PaymentStatus, PayoutStatus
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schema import (
    ConfirmPaymentRequest,
    JobPaymentResponse,
    PaymentAttemptResponse,
    PayoutItemResponse,
    PayoutResponse,
    StartPaymentResponse,
)

logger = logging.getLogger(__name__)

# A page view asks Razorpay again at most this often; webhooks and the return from Razorpay sync right away
SYNC_EVERY = timedelta(minutes=1)
# Razorpay's link states that close it; "created" and "partially_paid" leave it open
LINK_CLOSED = {"paid": PaymentStatus.PAID, "expired": PaymentStatus.EXPIRED, "cancelled": PaymentStatus.CANCELLED}
PAID_ATTEMPTS = (AttemptStatus.CAPTURED, AttemptStatus.REFUNDED)


def rupees(paise: int) -> str:
    return f"₹{paise / 100:,.0f}"


def from_unix(seconds: int | None) -> datetime:
    return datetime.fromtimestamp(seconds, timezone.utc) if seconds else utc_now()


class PaymentService:
    def __init__(
        self, *, gateway: PaymentGateway | None = None, notifications: NotificationService | None = None
    ) -> None:
        self._gateway = gateway
        self.notifications = notifications or NotificationService()

    @property
    def gateway(self) -> PaymentGateway:
        if self._gateway is None:
            self._gateway = RazorpayGateway()
        return self._gateway

    def view(self, db: Session, user: AuthUser, job_id: str) -> JobPaymentResponse:
        """The customer or the hired pro. An open payment is checked with Razorpay, so a missed webhook catches up."""
        job, provider_id = job_for_party(db, user, job_id)
        payments = PaymentRepository(db).for_job(job.id)
        current = payments[-1] if payments else None
        if current is not None and current.status == PaymentStatus.PENDING and self._stale(current):
            try:
                self._sync(db, job, current)
            except PaymentGatewayError as error:
                # Show what's known; the next view or webhook catches up
                db.rollback()
                beat(db, PAYMENT_SYNC, error=error.detail)
        return self._response(db, job, provider_id, user)

    def start(self, db: Session, user: AuthUser, job_id: str) -> StartPaymentResponse:
        """The customer taps Pay: the open link if there is one, otherwise a new one for the hired quote."""
        job, provider_id = self._own_job(db, user, job_id)
        if job.status == JobStatus.COMPLETED:
            raise AlreadyPaidError
        if job.status != JobStatus.PAYMENT_DUE:
            raise PaymentNotDueError
        live = PaymentRepository(db).live(job.id)
        if live is not None:
            # Razorpay may have moved on since we last looked: paid, or closed
            self._sync(db, job, live)
            if live.status == PaymentStatus.PAID:
                raise AlreadyPaidError
            if live.status == PaymentStatus.PENDING:
                return StartPaymentResponse(payment_id=live.id, short_url=live.short_url)
        return self._new_link(db, job, provider_id)

    def confirm(
        self, db: Session, user: AuthUser, job_id: str, payload: ConfirmPaymentRequest,
        background: BackgroundTasks | None = None,
    ) -> JobPaymentResponse:
        """Razorpay sent the customer back after paying. The redirect only says where to look; Razorpay's API decides."""
        job, provider_id = self._own_job(db, user, job_id)
        payment = PaymentRepository(db).by_link(payload.razorpay_payment_link_id)
        if payment is None or payment.job_id != job.id or payment.id != payload.razorpay_payment_link_reference_id:
            raise PaymentNotFoundError
        if not self.gateway.verify_callback(
            link_id=payload.razorpay_payment_link_id, reference_id=payload.razorpay_payment_link_reference_id,
            status=payload.razorpay_payment_link_status, payment_id=payload.razorpay_payment_id,
            signature=payload.razorpay_signature,
        ):
            raise PaymentSignatureError
        self._sync(db, job, payment, background)
        return self._response(db, job, provider_id, user)

    def handle_webhook(
        self, db: Session, body: bytes, signature: str, background: BackgroundTasks | None = None
    ) -> None:
        """Razorpay's `payment_link.*` and `payment.*` events: find our payment, then sync it."""
        if not self.gateway.verify_webhook(body, signature):
            beat(db, RAZORPAY_WEBHOOK, error="A webhook arrived with a wrong signature (check RAZORPAY_WEBHOOK_SECRET)")
            raise WebhookSignatureError
        event = json.loads(body)
        kind = str(event.get("event", ""))
        payload = event.get("payload") or {}
        entity = (payload.get("payment") or {}).get("entity")
        repo = PaymentRepository(db)
        if kind.startswith("payment_link."):
            payment = repo.by_link(str(((payload.get("payment_link") or {}).get("entity") or {}).get("id", "")))
        elif kind.startswith("payment.") and entity:
            payment = self._payment_for(repo, entity)
        else:
            return
        job = JobRepository(db).get(payment.job_id) if payment is not None else None
        if payment is None or job is None:
            # Another integration on the same Razorpay account, or a link this app didn't make
            logger.info("Razorpay %s has no matching Helpio payment", kind)
            beat(db, RAZORPAY_WEBHOOK, last_event=kind)
            return
        try:
            self._sync(db, job, payment, background, seen=entity)
        except PaymentGatewayError as error:
            db.rollback()
            beat(db, RAZORPAY_WEBHOOK, error=f"{kind}: {error.detail}")
            raise
        beat(db, RAZORPAY_WEBHOOK, last_event=kind)

    def resync(self, db: Session, payment_id: str) -> Payment:
        """Admins: ask Razorpay about this payment now (a missed webhook, a stuck payment)."""
        payment = self._get(db, payment_id)
        job = db.get(Job, payment.job_id) if payment is not None else None
        if payment is None or job is None:
            raise PaymentNotFoundError
        self._sync(db, job, payment)
        return payment

    def payouts(self, db: Session, status: PayoutStatus) -> list[PayoutItemResponse]:
        """Admins: paid jobs whose pro is still waiting for Helpio's transfer (or already got it)."""
        return [self._payout_item(db, payment) for payment in PaymentRepository(db).payouts(status)]

    def mark_payout(
        self, db: Session, admin: AuthUser, payment_id: str, reference: str, background: BackgroundTasks | None = None
    ) -> PayoutItemResponse:
        """Admins, after sending the pro their money by UPI or bank transfer."""
        payment = self._get(db, payment_id)
        if payment is None:
            raise PaymentNotFoundError
        if payment.status != PaymentStatus.PAID:
            raise PaymentNotPaidError
        if payment.payout_status == PayoutStatus.PAID:
            raise PayoutAlreadySentError
        payment.payout_status = PayoutStatus.PAID
        payment.payout_reference = reference
        payment.payout_at = utc_now()
        payment.payout_by = admin.id
        job = db.get(Job, payment.job_id)
        provider = db.get(AuthUser, payment.provider_id)
        if job is not None and provider is not None:
            self.notifications.notify(
                db, provider, type="payout_sent", title=f"Helpio sent you {rupees(payment.amount_paise)}",
                body=f"Your money for \"{job.title}\" is on its way (reference {reference}).",
                job_id=job.id, link=provider_link(job.id), background=background,
            )
        db.commit()
        return self._payout_item(db, payment)

    # ----- Helpers -----

    def _new_link(self, db: Session, job: Job, provider_id: str) -> StartPaymentResponse:
        settings = runtime_settings()
        expires = utc_now() + timedelta(minutes=settings.payment_link_expiry_minutes)
        payment = Payment(
            id=str(uuid4()), job_id=job.id, customer_id=job.customer_id, provider_id=provider_id,
            amount_paise=hired_amount(job), expires_at=expires,
        )
        base = settings.app_web_url.rstrip("/")
        customer = job.customer
        link = self.gateway.create_link(
            amount_paise=payment.amount_paise, reference_id=payment.id, description=f"Helpio: {job.title}",
            customer={
                key: value for key, value in
                {"name": customer.name, "email": customer.email, "contact": customer.phone}.items() if value
            },
            # Razorpay sends the customer back to the job after paying; without an address it shows its own receipt
            callback_url=f"{base}{customer_link(job.id)}" if base else None,
            expire_by=int(expires.timestamp()),
        )
        payment.razorpay_link_id, payment.short_url = link["id"], link["short_url"]
        db.add(payment)
        try:
            db.commit()
        except IntegrityError:
            # A second tap made a link first: close ours and use that one
            db.rollback()
            self._cancel_quietly(link["id"])
            live = PaymentRepository(db).live(job.id)
            if live is None or live.status != PaymentStatus.PENDING:
                raise AlreadyPaidError
            return StartPaymentResponse(payment_id=live.id, short_url=live.short_url)
        return StartPaymentResponse(payment_id=payment.id, short_url=payment.short_url)

    def _sync(
        self, db: Session, job: Job, payment: Payment, background: BackgroundTasks | None = None,
        seen: dict | None = None,
    ) -> None:
        """Bring the payment in line with Razorpay: its link's state and every try on it. Safe to repeat."""
        link = self.gateway.fetch_link(payment.razorpay_link_id)
        order_id = link.get("order_id") or payment.razorpay_order_id
        tries: dict[str, dict] = {}
        if order_id:
            tries = {item["id"]: item for item in self.gateway.order_payments(order_id)}
        for item in link.get("payments") or []:
            if item.get("payment_id") and item["payment_id"] not in tries:
                tries[item["payment_id"]] = self.gateway.fetch_payment(item["payment_id"])
        # The webhook's own payment, in case Razorpay's lists don't show it yet
        if seen and seen.get("id") and seen["id"] not in tries:
            tries[seen["id"]] = seen

        # One sync at a time per payment, so a webhook and a page view can't both mark it paid
        payment = PaymentRepository(db).lock(payment.id)
        if order_id:
            payment.razorpay_order_id = order_id
        known = {attempt.razorpay_payment_id: attempt for attempt in payment.attempts}
        failed: list[PaymentAttempt] = []
        for entity in sorted(tries.values(), key=lambda item: item.get("created_at") or 0):
            try:
                status = AttemptStatus(entity.get("status"))
            except ValueError:
                logger.warning("Razorpay payment %s has an unknown status %s", entity.get("id"), entity.get("status"))
                continue
            attempt = known.get(entity["id"])
            if attempt is None:
                attempt = PaymentAttempt(
                    razorpay_payment_id=entity["id"], status=status, amount_paise=int(entity.get("amount") or 0),
                    attempted_at=from_unix(entity.get("created_at")),
                )
                payment.attempts.append(attempt)
                known[entity["id"]] = attempt
            elif attempt.status == status:
                continue
            else:
                attempt.status = status
            if status == AttemptStatus.FAILED:
                failed.append(attempt)
            attempt.method = entity.get("method")
            attempt.error_code = entity.get("error_code")
            attempt.error_description = entity.get("error_description")
            attempt.raw = entity

        captured = next((attempt for attempt in payment.attempts if attempt.status in PAID_ATTEMPTS), None)
        closed = LINK_CLOSED.get(str(link.get("status")))
        now = utc_now()
        if payment.status != PaymentStatus.PAID and (closed == PaymentStatus.PAID or captured is not None):
            self._mark_paid(db, job, payment, captured, background)
        elif payment.status == PaymentStatus.PENDING:
            if failed:
                self._failed(db, job, payment, failed[-1], background)
            if closed is not None:
                payment.status = closed
            elif payment.expires_at <= now:
                # Razorpay closes links on a schedule, but takes no payment past their time
                payment.status = PaymentStatus.EXPIRED
        payment.synced_at = now
        db.commit()
        beat(db, PAYMENT_SYNC)

    def _mark_paid(
        self, db: Session, job: Job, payment: Payment, captured: PaymentAttempt | None,
        background: BackgroundTasks | None,
    ) -> None:
        payment.status = PaymentStatus.PAID
        payment.paid_at = utc_now()
        payment.last_error = None
        if captured is not None:
            payment.razorpay_payment_id, payment.method = captured.razorpay_payment_id, captured.method
        add_event(db, job, job.customer_id, JobEventType.PAID, amount_paise=payment.amount_paise, method=payment.method)
        if job.status == JobStatus.PAYMENT_DUE:
            job.status = JobStatus.COMPLETED
            add_event(db, job, None, JobEventType.COMPLETED)
        amount = rupees(payment.amount_paise)
        self.notifications.notify(
            db, job.customer, type="payment_received", title="Payment received",
            body=f"You paid {amount} for \"{job.title}\". The job is complete. Thanks for using Helpio!",
            job_id=job.id, link=customer_link(job.id), background=background,
        )
        provider = db.get(AuthUser, payment.provider_id)
        if provider is not None:
            self.notifications.notify(
                db, provider, type="payment_received", title=f"Customer paid {amount}",
                body=f"The customer paid {amount} for \"{job.title}\". Helpio will send the money to you soon.",
                job_id=job.id, link=provider_link(job.id), background=background,
            )

    def _failed(
        self, db: Session, job: Job, payment: Payment, attempt: PaymentAttempt, background: BackgroundTasks | None
    ) -> None:
        """A try failed: the link stays open for another go."""
        reason = (attempt.error_description or "The payment didn't go through").rstrip(".")
        payment.last_error = reason
        add_event(db, job, None, JobEventType.PAYMENT_FAILED, reason=reason, method=attempt.method)
        self.notifications.notify(
            db, job.customer, type="payment_failed", title="Payment didn't go through",
            body=f"Your payment for \"{job.title}\" failed: {reason}. You can tap Pay to try again.",
            job_id=job.id, link=customer_link(job.id), background=background,
        )

    def _payment_for(self, repo: PaymentRepository, entity: dict) -> Payment | None:
        """A Razorpay payment on one of our links: described as "#<link id>", on the link's order, or noted."""
        description = str(entity.get("description") or "")
        if description.startswith("#") and len(description) > 1:
            tail = description[1:]
            payment = repo.by_link(tail if tail.startswith("plink_") else f"plink_{tail}")
            if payment is not None:
                return payment
        if entity.get("order_id"):
            payment = repo.by_order(str(entity["order_id"]))
            if payment is not None:
                return payment
        notes = entity.get("notes")
        if isinstance(notes, dict) and notes.get("helpio_payment_id"):
            return self._get(repo.db, str(notes["helpio_payment_id"]))
        return None

    def _get(self, db: Session, payment_id: str) -> Payment | None:
        try:
            UUID(payment_id)
        except ValueError:
            return None
        return db.get(Payment, payment_id)

    def _cancel_quietly(self, link_id: str) -> None:
        try:
            self.gateway.cancel_link(link_id)
        except PaymentGatewayError:
            logger.warning("Could not cancel spare Razorpay link %s; cancel it in the dashboard", link_id)

    def _stale(self, payment: Payment) -> bool:
        return payment.synced_at is None or utc_now() - payment.synced_at >= SYNC_EVERY

    def _own_job(self, db: Session, user: AuthUser, job_id: str) -> tuple[Job, str]:
        job, provider_id = job_for_party(db, user, job_id)
        if user.id != job.customer_id:
            raise JobNotFoundError
        return job, provider_id

    def _response(self, db: Session, job: Job, provider_id: str, user: AuthUser) -> JobPaymentResponse:
        payments = PaymentRepository(db).for_job(job.id)
        current = payments[-1] if payments else None
        paid = current is not None and current.status == PaymentStatus.PAID
        return JobPaymentResponse(
            job_id=job.id, job_status=job.status,
            amount_paise=current.amount_paise if current else hired_amount(job),
            payment_id=current.id if current else None,
            status=current.status if current else None,
            last_error=current.last_error if current and current.status == PaymentStatus.PENDING else None,
            expires_at=current.expires_at if current else None,
            paid_at=current.paid_at if current else None,
            method=current.method if current else None,
            attempts=[
                PaymentAttemptResponse(
                    id=attempt.id, status=attempt.status, method=attempt.method, amount_paise=attempt.amount_paise,
                    error_description=attempt.error_description, attempted_at=attempt.attempted_at,
                )
                for payment in payments for attempt in payment.attempts
            ],
            payout=PayoutResponse(
                status=current.payout_status, reference=current.payout_reference, sent_at=current.payout_at,
            ) if paid and user.id == provider_id else None,
            can_pay=user.id == job.customer_id and job.status == JobStatus.PAYMENT_DUE,
        )

    def _payout_item(self, db: Session, payment: Payment) -> PayoutItemResponse:
        job = db.get(Job, payment.job_id)
        provider = db.get(AuthUser, payment.provider_id)
        return PayoutItemResponse(
            payment_id=payment.id, job_id=payment.job_id, job_title=job.title if job else "",
            provider_id=payment.provider_id, provider_name=provider.name if provider else None,
            provider_email=provider.email if provider else "", provider_phone=provider.phone if provider else None,
            amount_paise=payment.amount_paise, paid_at=payment.paid_at, razorpay_payment_id=payment.razorpay_payment_id,
            payout_status=payment.payout_status, payout_reference=payment.payout_reference, payout_at=payment.payout_at,
        )
