from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.exceptions import ForbiddenError, InvalidAccessTokenError
from app.modules.auth.model import AuthUser, UserRole
from app.modules.auth.service import AuthService

bearer = HTTPBearer(auto_error=False)


def get_auth_service() -> AuthService:
    return AuthService()


def get_bearer_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if credentials is None:
        raise InvalidAccessTokenError("Bearer token is required")
    return credentials.credentials


def get_current_user(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> AuthUser:
    """Use on protected endpoints to enforce signature, expiry, and revocation."""
    return service.authenticate(db, token)


def require_role(*roles: UserRole) -> Callable[[AuthUser], AuthUser]:
    """`Depends(require_role(UserRole.PROVIDER))` → the signed-in user, or 403 for other roles."""

    def dependency(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in roles:
            raise ForbiddenError
        return user

    return dependency
