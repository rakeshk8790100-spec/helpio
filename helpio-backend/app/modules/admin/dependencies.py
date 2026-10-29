from fastapi import Depends, Request

from app.modules.admin.access import AdminAccessService
from app.modules.admin.approvals import ApprovalService
from app.modules.admin.audit import RequestInfo
from app.modules.admin.exceptions import OwnerOnlyError
from app.modules.auth.dependencies import current_admin, get_auth_service
from app.modules.auth.model import AuthUser
from app.modules.auth.service import AuthService, is_owner_email

__all__ = ["current_admin", "current_owner", "get_admin_access_service", "get_approval_service", "request_info"]


def current_owner(user: AuthUser = Depends(current_admin)) -> AuthUser:
    """The owner (ADMIN_OWNER_EMAIL): approves admins, changes API keys and settings."""
    if not is_owner_email(user.email):
        raise OwnerOnlyError
    return user


def get_admin_access_service(auth: AuthService = Depends(get_auth_service)) -> AdminAccessService:
    return AdminAccessService(auth=auth)


def get_approval_service() -> ApprovalService:
    return ApprovalService()


def request_info(request: Request) -> RequestInfo:
    """Where an admin request came from, for the audit log."""
    agent = request.headers.get("user-agent") or ""
    return RequestInfo(ip=request.client.host if request.client else None, user_agent=agent[:300] or None)
