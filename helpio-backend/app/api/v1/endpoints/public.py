from fastapi import APIRouter
from pydantic import BaseModel

from app.core.runtime_settings import runtime_settings

router = APIRouter(tags=["public"])


class PublicConfigResponse(BaseModel):
    # Empty when Google sign-in isn't set up
    google_client_id: str


@router.get("/public-config", response_model=PublicConfigResponse)
def public_config() -> PublicConfigResponse:
    """Values the web app needs before sign-in, as set in the admin console (or .env)."""
    return PublicConfigResponse(google_client_id=runtime_settings().google_client_id.strip())
