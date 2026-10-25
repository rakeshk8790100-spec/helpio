from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.jobs.dependencies import current_customer, get_job_service
from app.modules.jobs.schema import CustomerHomeResponse
from app.modules.jobs.service import JobService

router = APIRouter(prefix="/customers/me", tags=["customers"])


@router.get("/home", response_model=CustomerHomeResponse)
def customer_home(
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: JobService = Depends(get_job_service),
) -> CustomerHomeResponse:
    """Everything the customer home screen needs: active job, quotes to review and drafts."""
    return service.customer_home(db, user)
