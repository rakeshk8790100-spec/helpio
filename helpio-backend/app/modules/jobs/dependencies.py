from app.modules.customers.dependencies import current_customer
from app.modules.jobs.chat import JobChat
from app.modules.jobs.milestones import MilestoneService
from app.modules.jobs.service import JobService

__all__ = ["current_customer", "get_job_chat", "get_job_service", "get_milestone_service"]


def get_job_service() -> JobService:
    return JobService()


def get_job_chat() -> JobChat:
    return JobChat()


def get_milestone_service() -> MilestoneService:
    return MilestoneService()
