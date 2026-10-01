from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.modules.auth.exceptions import InvalidAccessTokenError
from app.modules.auth.model import AuthUser
from app.modules.auth.service import AuthService

bearer = HTTPBearer(auto_error=False)


def get_auth_service() -> AuthService:
    return AuthService()


def get_bearer_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer token is required", headers={"WWW-Authenticate": "Bearer"})
    return credentials.credentials


def get_current_user(
    token: str = Depends(get_bearer_token),
    db: Session = Depends(get_db),
    service: AuthService = Depends(get_auth_service),
) -> AuthUser:
    """Use on protected endpoints to enforce signature, expiry, and revocation."""
    try:
        return service.authenticate(db, token)
    except InvalidAccessTokenError as error:
        raise HTTPException(status_code=401, detail=error.detail, headers={"WWW-Authenticate": "Bearer"}) from error
