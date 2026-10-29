from app.modules.auth.model import ApprovalStatus, AuthUser
from app.modules.providers.model import OnboardingStatus, ProviderProfile


def provider_can_work(profile: ProviderProfile | None, user: AuthUser | None) -> bool:
    """Signed up (skills and area), approved by Helpio and active: can quote, be found and be asked directly."""
    return (
        profile is not None
        and user is not None
        and profile.onboarding_status == OnboardingStatus.COMPLETE
        and user.approval_status == ApprovalStatus.APPROVED
        and user.is_active
    )
