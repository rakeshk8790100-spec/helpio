from app.modules.auth.dependencies import require_role
from app.modules.auth.model import UserRole
from app.modules.jobs.service import JobService

current_customer = require_role(UserRole.CUSTOMER)


def get_job_service() -> JobService:
    return JobService()
