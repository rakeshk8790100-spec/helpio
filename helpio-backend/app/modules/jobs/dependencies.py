from app.modules.customers.dependencies import current_customer
from app.modules.jobs.service import JobService

__all__ = ["current_customer", "get_job_service"]


def get_job_service() -> JobService:
    return JobService()
