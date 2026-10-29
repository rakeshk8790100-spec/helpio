from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.admin.access import AdminAccessService
from app.modules.admin.audit import RequestInfo
from app.modules.admin.dependencies import get_admin_access_service, request_info
from app.modules.admin.schema import AdminAccessResultResponse, AdminLoginRequest
from app.modules.auth.schema import AdminAccessRequest, SessionResponse, SignupCodeResponse, VerifySignupRequest

router = APIRouter(prefix="/admin/auth", tags=["admin"])


@router.post("/login", response_model=SignupCodeResponse)
def admin_login(
    payload: AdminLoginRequest,
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> SignupCodeResponse:
    """Step 1: email and password; a code goes to the admin's email. 5 failures in 15 minutes lock the email."""
    return service.start_login(db, payload, info)


@router.post("/verify", response_model=SessionResponse)
def admin_verify(
    payload: VerifySignupRequest,
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> SessionResponse:
    """Step 2: the emailed code opens a 12-hour admin session."""
    return service.verify_login(db, payload, info)


@router.post("/request-access", response_model=SignupCodeResponse, status_code=status.HTTP_202_ACCEPTED)
def request_access(
    payload: AdminAccessRequest,
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> SignupCodeResponse:
    """Ask for console access: a code proves the email first."""
    return service.request_access(db, payload)


@router.post("/request-access/verify", response_model=AdminAccessResultResponse, status_code=status.HTTP_201_CREATED)
def verify_request_access(
    payload: VerifySignupRequest,
    background: BackgroundTasks,
    info: RequestInfo = Depends(request_info),
    db: Session = Depends(get_db),
    service: AdminAccessService = Depends(get_admin_access_service),
) -> AdminAccessResultResponse:
    """The code creates the request; the owner is emailed to approve it. The owner's own address is approved at once."""
    return service.verify_request(db, payload, info, background)
