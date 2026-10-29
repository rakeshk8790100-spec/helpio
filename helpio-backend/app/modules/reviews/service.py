"""Once all four stages are approved, the customer and the hired pro can each rate the other once (1 to 5, a comment)."""
from fastapi import BackgroundTasks
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import utc_now
from app.core.geo import short_name
from app.modules.auth.model import AuthUser, UserRole
from app.modules.jobs.milestones import add_event, customer_link, job_for_party, provider_link
from app.modules.jobs.model import Job, JobEventType, JobStatus
from app.modules.notifications.service import NotificationService
from app.modules.reviews.exceptions import ReviewAlreadySubmittedError, ReviewNotOpenError
from app.modules.reviews.model import JobReview
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.schema import JobReviewsResponse, ReviewResponse, SubmitReviewRequest

# Approved 100%: reviews don't wait for the payment
REVIEWABLE = (JobStatus.PAYMENT_DUE, JobStatus.COMPLETED)


class ReviewService:
    def __init__(self, *, notifications: NotificationService | None = None) -> None:
        self.notifications = notifications or NotificationService()

    def for_job(self, db: Session, user: AuthUser, job_id: str) -> JobReviewsResponse:
        job, _ = job_for_party(db, user, job_id)
        return self._response(db, job, user)

    def submit(
        self, db: Session, user: AuthUser, job_id: str, payload: SubmitReviewRequest,
        background: BackgroundTasks | None = None,
    ) -> JobReviewsResponse:
        job, provider_id = job_for_party(db, user, job_id)
        if job.status not in REVIEWABLE:
            raise ReviewNotOpenError
        if any(review.author_id == user.id for review in ReviewRepository(db).for_job(job.id)):
            raise ReviewAlreadySubmittedError
        is_customer = user.id == job.customer_id
        reviewee = db.get(AuthUser, provider_id if is_customer else job.customer_id)
        db.add(JobReview(
            job_id=job.id, author_id=user.id, subject_id=reviewee.id,
            author_role=UserRole.CUSTOMER if is_customer else UserRole.PROVIDER,
            stars=payload.rating, comment=payload.comment or None, revealed_at=utc_now(),
        ))
        add_event(db, job, user.id, JobEventType.REVIEWED, rating=payload.rating)
        stars = f"{payload.rating}/5"
        self.notifications.notify(
            db, reviewee, type="review_received", title=f"New review: {stars}",
            body=f"{short_name(user.name, 'Your customer' if is_customer else 'Your pro')} rated you {stars} "
                 f"for \"{job.title}\"" + (f": \"{payload.comment}\"" if payload.comment else "."),
            job_id=job.id, link=provider_link(job.id) if is_customer else customer_link(job.id), background=background,
        )
        try:
            db.commit()
        except IntegrityError as error:
            # A second tap got there first
            db.rollback()
            raise ReviewAlreadySubmittedError from error
        return self._response(db, job, user)

    def _response(self, db: Session, job: Job, user: AuthUser) -> JobReviewsResponse:
        reviews = ReviewRepository(db).for_job(job.id)
        mine = next((review for review in reviews if review.author_id == user.id), None)
        theirs = next(
            (
                review for review in reviews
                if review.subject_id == user.id and review.revealed_at is not None and review.hidden_at is None
            ),
            None,
        )
        return JobReviewsResponse(
            can_review=mine is None and job.status in REVIEWABLE,
            mine=self._review(mine, user) if mine else None,
            theirs=self._review(theirs, user) if theirs else None,
        )

    def _review(self, review: JobReview, user: AuthUser) -> ReviewResponse:
        return ReviewResponse(
            id=review.id, rating=review.stars, comment=review.comment,
            reviewer_label="You" if review.author_id == user.id else short_name(
                review.author.name, "Customer" if review.author_role == UserRole.CUSTOMER else "Helpio pro"
            ),
            reviewer_role=review.author_role, created_at=review.created_at,
        )
