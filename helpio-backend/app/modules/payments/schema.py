from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.modules.jobs.model import JobStatus
from app.modules.payments.model import AttemptStatus, PaymentStatus, PayoutStatus

RazorpayId = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class PaymentAttemptResponse(BaseModel):
    id: str
    status: AttemptStatus
    # "upi" or "netbanking"
    method: str | None
    amount_paise: int
    # Razorpay's reason when it failed
    error_description: str | None
    attempted_at: datetime


class PayoutResponse(BaseModel):
    """Helpio's transfer to the pro after the customer pays (the pro sees it)."""

    status: PayoutStatus
    # UTR or UPI reference
    reference: str | None
    sent_at: datetime | None


class JobPaymentResponse(BaseModel):
    job_id: str
    job_status: JobStatus
    # The hired quote
    amount_paise: int
    # The latest payment link; null until the customer first taps Pay
    payment_id: str | None
    status: PaymentStatus | None
    # Razorpay's reason for the latest failed try, while the payment is still open
    last_error: str | None
    expires_at: datetime | None
    paid_at: datetime | None
    method: str | None
    # Every try on Razorpay across the job's links, oldest first
    attempts: list[PaymentAttemptResponse]
    payout: PayoutResponse | None
    # The customer, while the job is waiting for payment
    can_pay: bool


class StartPaymentResponse(BaseModel):
    payment_id: str
    # Razorpay's hosted payment page; the app sends the customer there
    short_url: str


class ConfirmPaymentRequest(BaseModel):
    """The query string Razorpay adds when it sends the customer back after paying."""

    razorpay_payment_id: RazorpayId
    razorpay_payment_link_id: RazorpayId
    razorpay_payment_link_reference_id: RazorpayId
    razorpay_payment_link_status: RazorpayId
    razorpay_signature: str = Field(min_length=1, max_length=128)


class PayoutItemResponse(BaseModel):
    """A paid job, for Helpio's admins to send the pro their money."""

    payment_id: str
    job_id: str
    job_title: str
    provider_id: str
    provider_name: str | None
    provider_email: str
    provider_phone: str | None
    amount_paise: int
    paid_at: datetime | None
    razorpay_payment_id: str | None
    payout_status: PayoutStatus
    payout_reference: str | None
    payout_at: datetime | None


class MarkPayoutRequest(BaseModel):
    # UTR or UPI reference of the transfer
    reference: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=80)]
