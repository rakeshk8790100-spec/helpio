from app.core.exceptions import AppError


class ProviderError(AppError):
    detail = "Provider request failed"


class ProviderProfileNotFoundError(ProviderError):
    status_code = 404
    detail = "Provider profile not found. Finish email verification first."


class UnknownSkillError(ProviderError):
    status_code = 422

    def __init__(self, skill_ids: list[str]) -> None:
        super().__init__("Unknown skill: " + ", ".join(sorted(skill_ids)))


class SkillsRequiredError(ProviderError):
    status_code = 409
    detail = "Add your skills before setting availability and service area"
