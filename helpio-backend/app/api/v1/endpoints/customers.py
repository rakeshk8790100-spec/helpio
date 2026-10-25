from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.model import AuthUser
from app.modules.customers.dependencies import current_customer, get_customer_service
from app.modules.customers.schema import AddressResponse, CreateAddressRequest, UpdateAddressRequest
from app.modules.customers.service import CustomerService
from app.modules.jobs.dependencies import get_job_service
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


# ----- Saved addresses (default first; every change returns the whole list) -----


@router.get("/addresses", response_model=list[AddressResponse])
def list_addresses(
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: CustomerService = Depends(get_customer_service),
) -> list[AddressResponse]:
    return service.addresses(db, user)


@router.post("/addresses", response_model=list[AddressResponse], status_code=status.HTTP_201_CREATED)
def add_address(
    payload: CreateAddressRequest,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: CustomerService = Depends(get_customer_service),
) -> list[AddressResponse]:
    """Up to 5. The first one, or one sent with `is_default: true`, becomes the default."""
    return service.add_address(db, user, payload)


@router.patch("/addresses/{address_id}", response_model=list[AddressResponse])
def update_address(
    address_id: str,
    payload: UpdateAddressRequest,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: CustomerService = Depends(get_customer_service),
) -> list[AddressResponse]:
    return service.update_address(db, user, address_id, payload)


@router.delete("/addresses/{address_id}", response_model=list[AddressResponse])
def delete_address(
    address_id: str,
    user: AuthUser = Depends(current_customer),
    db: Session = Depends(get_db),
    service: CustomerService = Depends(get_customer_service),
) -> list[AddressResponse]:
    """Deleting the default makes the next address the default."""
    return service.delete_address(db, user, address_id)
