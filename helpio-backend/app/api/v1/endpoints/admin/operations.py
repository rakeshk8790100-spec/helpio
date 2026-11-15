from typing import Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.admin.audit import RequestInfo
from app.modules.admin.dependencies import current_admin, request_info
from app.modules.admin.moderation import ModerationService
from app.modules.admin.people import PeopleService
from app.modules.admin.schema import (
    AdminCategoryResponse,
    AdminJobDetailResponse,
    AdminJobRowResponse,
    AdminMessageResponse,
    AdminPaymentRowResponse,
    AdminReviewRowResponse,
    ApproveServiceRequest,
    OptionalReasonRequest,
    ReasonRequest,
    SaveCategoryRequest,
    SaveSkillRequest,
    ServiceRequestRowResponse,
    UserDetailResponse,
    UserRowResponse,
)
from app.modules.admin.work import WorkService
from app.modules.auth.model import ApprovalStatus, AuthUser, UserRole
from app.modules.jobs.model import JobStatus
from app.modules.payments.model import PaymentStatus, PayoutStatus
from app.modules.payments.schema import MarkPayoutRequest, PayoutItemResponse
from app.utils.pagination import Page, PageParams, page_params

router = APIRouter(prefix="/admin", tags=["admin"])


def get_people_service() -> PeopleService:
    return PeopleService()


def get_work_service() -> WorkService:
    return WorkService()


def get_moderation_service() -> ModerationService:
    return ModerationService()


# ----- Customers and providers -----


@router.get("/users", response_model=Page[UserRowResponse])
def list_users(
    role: Literal["customer", "provider"] | None = None,
    approval: ApprovalStatus | None = None,
    active: bool | None = None,
    q: str | None = Query(default=None, max_length=80),
    params: PageParams = Depends(page_params),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: PeopleService = Depends(get_people_service),
) -> Page[UserRowResponse]:
    """Newest first; `q` searches name, email and mobile."""
    return service.list(db, params, role=UserRole(role) if role else None, approval=approval, active=active, q=q)


@router.get("/users/{user_id}", response_model=UserDetailResponse)
def user_detail(
    user_id: UUID,
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: PeopleService = Depends(get_people_service),
) -> UserDetailResponse:
    """Everything about one customer or provider: jobs, quotes, reviews, payments and (providers) what they offer."""
    return service.detail(db, str(user_id))


@router.post("/users/{user_id}/deactivate", response_model=UserDetailResponse)
def deactivate_user(
    user_id: UUID,
    payload: OptionalReasonRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: PeopleService = Depends(get_people_service),
) -> UserDetailResponse:
    """Signs them out everywhere; they can't log in until reactivated."""
    return service.set_active(db, admin, str(user_id), False, payload.reason, info)


@router.post("/users/{user_id}/activate", response_model=UserDetailResponse)
def activate_user(
    user_id: UUID,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: PeopleService = Depends(get_people_service),
) -> UserDetailResponse:
    return service.set_active(db, admin, str(user_id), True, None, info)


@router.post("/users/{user_id}/sign-out", response_model=UserDetailResponse)
def sign_out_user(
    user_id: UUID,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: PeopleService = Depends(get_people_service),
) -> UserDetailResponse:
    """Ends every session (a lost phone, a shared password); they can log in again."""
    return service.sign_out(db, admin, str(user_id), info)


# ----- Jobs -----


@router.get("/jobs", response_model=Page[AdminJobRowResponse])
def list_jobs(
    status: JobStatus | None = None,
    q: str | None = Query(default=None, max_length=80),
    params: PageParams = Depends(page_params),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> Page[AdminJobRowResponse]:
    """Recently changed first; `q` searches the title and the customer."""
    return service.jobs(db, params, status=status, q=q)


@router.get("/jobs/{job_id}", response_model=AdminJobDetailResponse)
def job_detail(
    job_id: UUID,
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> AdminJobDetailResponse:
    """The job, both people, quotes, every stage with photos, the timeline, payments and reviews."""
    return service.job(db, str(job_id))


@router.get("/jobs/{job_id}/messages", response_model=list[AdminMessageResponse])
def job_messages(
    job_id: UUID,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> list[AdminMessageResponse]:
    """The chat, read-only (for disputes). Reading it is recorded in the audit log."""
    return service.messages(db, admin, str(job_id), info)


@router.post("/jobs/{job_id}/cancel", response_model=AdminJobDetailResponse)
def cancel_job(
    job_id: UUID,
    payload: ReasonRequest,
    background: BackgroundTasks,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> AdminJobDetailResponse:
    """Only before work starts. Both sides are told the reason."""
    return service.cancel(db, admin, str(job_id), payload.reason, info, background)


# ----- Payments and payouts -----


@router.get("/payments", response_model=Page[AdminPaymentRowResponse])
def list_payments(
    status: PaymentStatus | None = None,
    params: PageParams = Depends(page_params),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> Page[AdminPaymentRowResponse]:
    """Every payment link, newest first, with its tries."""
    return service.payment_list(db, params, status=status)


@router.post("/payments/{payment_id}/recheck", response_model=AdminPaymentRowResponse)
def recheck_payment(
    payment_id: UUID,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> AdminPaymentRowResponse:
    """Ask Razorpay about this payment now (a missed webhook, a stuck payment)."""
    return service.recheck(db, admin, str(payment_id), info)


@router.get("/payouts", response_model=list[PayoutItemResponse])
def payouts(
    status: PayoutStatus = Query(default=PayoutStatus.PENDING),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> list[PayoutItemResponse]:
    """Paid jobs whose pro is waiting for Helpio's transfer (`pending`), or already got it (`paid`)."""
    return service.payouts(db, status)


@router.post("/payouts/{payment_id}/paid", response_model=PayoutItemResponse)
def mark_payout(
    payment_id: UUID,
    payload: MarkPayoutRequest,
    background: BackgroundTasks,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: WorkService = Depends(get_work_service),
) -> PayoutItemResponse:
    """After sending the money by UPI or bank transfer: record its reference; the pro is told."""
    return service.mark_payout(db, admin, str(payment_id), payload.reference, info, background)


# ----- Reviews -----


@router.get("/reviews", response_model=Page[AdminReviewRowResponse])
def list_reviews(
    hidden: bool | None = None,
    stars: int | None = Query(default=None, ge=1, le=5),
    params: PageParams = Depends(page_params),
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> Page[AdminReviewRowResponse]:
    return service.reviews(db, params, hidden=hidden, stars=stars)


@router.post("/reviews/{review_id}/hide", response_model=AdminReviewRowResponse)
def hide_review(
    review_id: UUID,
    payload: ReasonRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> AdminReviewRowResponse:
    """Left out of ratings, profiles and the other side's view; kept for the record."""
    return service.set_hidden(db, admin, str(review_id), True, payload.reason, info)


@router.post("/reviews/{review_id}/unhide", response_model=AdminReviewRowResponse)
def unhide_review(
    review_id: UUID,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> AdminReviewRowResponse:
    return service.set_hidden(db, admin, str(review_id), False, None, info)


# ----- Catalog -----


@router.get("/catalog", response_model=list[AdminCategoryResponse])
def catalog(
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[AdminCategoryResponse]:
    """Every category and service, switched off ones too, with how many jobs and providers use them."""
    return service.catalog(db)


@router.get("/catalog/requests", response_model=list[ServiceRequestRowResponse])
def service_requests(
    _: AuthUser = Depends(current_admin),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[ServiceRequestRowResponse]:
    """Services customers typed that aren't in the catalog, one row per name, oldest first."""
    return service.service_requests(db)


@router.post("/catalog/requests/{key}/approve", response_model=list[ServiceRequestRowResponse])
def approve_service_request(
    key: str,
    payload: ApproveServiceRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[ServiceRequestRowResponse]:
    """Add it as a new service in a category, or match it to an existing one; it becomes those customers' favourite."""
    return service.approve_service_request(db, admin, key, payload, info)


@router.post("/catalog/requests/{key}/reject", response_model=list[ServiceRequestRowResponse])
def reject_service_request(
    key: str,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[ServiceRequestRowResponse]:
    """Removed from those customers' favourites, so their popup asks for another."""
    return service.reject_service_request(db, admin, key, info)


@router.post("/catalog/categories", response_model=list[AdminCategoryResponse])
def add_category(
    payload: SaveCategoryRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[AdminCategoryResponse]:
    return service.save_category(db, admin, None, payload, info)


@router.put("/catalog/categories/{category_id}", response_model=list[AdminCategoryResponse])
def change_category(
    category_id: str,
    payload: SaveCategoryRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[AdminCategoryResponse]:
    """Rename, reorder or switch off (hidden from pickers and new jobs; existing jobs keep it)."""
    return service.save_category(db, admin, category_id, payload, info)


@router.post("/catalog/categories/{category_id}/skills", response_model=list[AdminCategoryResponse])
def add_skill(
    category_id: str,
    payload: SaveSkillRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[AdminCategoryResponse]:
    return service.save_skill(db, admin, category_id, None, payload, info)


@router.put("/catalog/categories/{category_id}/skills/{skill_id}", response_model=list[AdminCategoryResponse])
def change_skill(
    category_id: str,
    skill_id: str,
    payload: SaveSkillRequest,
    admin: AuthUser = Depends(current_admin),
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: ModerationService = Depends(get_moderation_service),
) -> list[AdminCategoryResponse]:
    """Rename, reorder or switch off (hidden from pickers; providers who offer it keep it)."""
    return service.save_skill(db, admin, category_id, skill_id, payload, info)
