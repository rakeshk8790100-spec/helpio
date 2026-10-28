from app.core.exceptions import AppError


class ReviewError(AppError):
    detail = "Review request failed"


class ReviewNotOpenError(ReviewError):
    status_code = 409
    detail = "Reviews open once all four stages are approved"


class ReviewAlreadySubmittedError(ReviewError):
    status_code = 409
    detail = "You have already reviewed this job"
