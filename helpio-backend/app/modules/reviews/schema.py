from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.modules.auth.model import UserRole
from app.modules.reviews.model import MAX_COMMENT

Comment = Annotated[str, StringConstraints(strip_whitespace=True, max_length=MAX_COMMENT)]


class SubmitReviewRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Comment | None = None


class ReviewResponse(BaseModel):
    id: str
    rating: int
    comment: str | None
    # "You", "Ravi S." or "Asha K."
    reviewer_label: str
    # customer (rated the pro) or provider (rated the customer)
    reviewer_role: UserRole
    created_at: datetime


class JobReviewsResponse(BaseModel):
    # Open from 100% approval until I've reviewed
    can_review: bool
    mine: ReviewResponse | None
    # The other side's review of me
    theirs: ReviewResponse | None


class RatingSummary(BaseModel):
    # One decimal, e.g. 4.6; null with no reviews yet
    average: float | None
    count: int


class PublicReviewResponse(BaseModel):
    """A customer's review on a pro's public profile."""

    id: str
    rating: int
    comment: str | None
    # "Asha K."
    reviewer_label: str
    created_at: datetime
