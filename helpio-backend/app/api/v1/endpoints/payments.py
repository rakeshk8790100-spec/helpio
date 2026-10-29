from fastapi import APIRouter, BackgroundTasks, Depends, Header, Request
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.dependencies import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.model import AuthUser
from app.modules.jobs.dependencies import current_customer
from app.modules.payments.dependencies import get_payment_service
from app.modules.payments.schema import ConfirmPaymentRequest, JobPaymentResponse, StartPaymentResponse
from app.modules.payments.service import PaymentService

router = APIRouter(tags=["payments"])


# ----- The customer pays the hired quote on Razorpay once all four stages are approved -----


@router.get("/jobs/{job_id}/payment", response_model=JobPaymentResponse)
def job_payment(
    job_id: str,
    user: AuthUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> JobPaymentResponse:
    """The customer or the hired pro: amount, state, every try on Razorpay and (for the pro) Helpio's payout."""
    return service.view(db, user, job_id)


@router.post("/jobs/{job_id}/payment", response_model=StartPaymentResponse)
def start_payment(
    job_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> StartPaymentResponse:
    """Customer: the Razorpay page to pay on (UPI or netbanking). The open link is reused until it expires."""
    return service.start(db, user, job_id)


@router.post("/jobs/{job_id}/payment/confirm", response_model=JobPaymentResponse)
def confirm_payment(
    job_id: str,
    payload: ConfirmPaymentRequest,
    background: BackgroundTasks,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> JobPaymentResponse:
    """Customer, back from Razorpay: send the `razorpay_*` query parameters; the payment is checked with Razorpay."""
    return service.confirm(db, user, job_id, payload, background)


@router.post("/payments/razorpay/webhook", include_in_schema=False)
async def razorpay_webhook(
    request: Request,
    background: BackgroundTasks,
    x_razorpay_signature: str = Header(default=""),
    db: Session = Depends(get_db),
    service: PaymentService = Depends(get_payment_service),
) -> dict[str, bool]:
    """Razorpay's events, signed with the webhook secret over the raw body."""
    body = await request.body()
    await run_in_threadpool(service.handle_webhook, db, body, x_razorpay_signature, background)
    return {"ok": True}
