from collections.abc import Collection, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.reviews.model import JobReview
from app.modules.reviews.schema import RatingSummary

NO_RATING = RatingSummary(average=None, count=0)


class ReviewRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, review: JobReview) -> JobReview:
        self.db.add(review)
        self.db.flush()
        return review

    def for_job(self, job_id: str) -> Sequence[JobReview]:
        return self.db.scalars(select(JobReview).where(JobReview.job_id == job_id)).all()

    def latest_about(self, user_id: str, limit: int) -> Sequence[JobReview]:
        return self.db.scalars(
            select(JobReview)
            .where(JobReview.subject_id == user_id, JobReview.revealed_at.is_not(None))
            .order_by(JobReview.created_at.desc())
            .limit(limit)
        ).all()

    def summaries(self, user_ids: Collection[str]) -> dict[str, RatingSummary]:
        """Average and count of the ratings each user received, in one query; users without reviews are left out."""
        if not user_ids:
            return {}
        rows = self.db.execute(
            select(JobReview.subject_id, func.avg(JobReview.stars), func.count())
            .where(JobReview.subject_id.in_(user_ids), JobReview.revealed_at.is_not(None))
            .group_by(JobReview.subject_id)
        )
        return {user_id: RatingSummary(average=round(float(average), 1), count=count) for user_id, average, count in rows}

    def summary(self, user_id: str) -> RatingSummary:
        return self.summaries([user_id]).get(user_id, NO_RATING)
