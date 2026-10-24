from app.modules.auth.dependencies import require_role
from app.modules.auth.model import UserRole
from app.modules.providers.service import ProviderService

current_provider = require_role(UserRole.PROVIDER)


def get_provider_service() -> ProviderService:
    return ProviderService()
