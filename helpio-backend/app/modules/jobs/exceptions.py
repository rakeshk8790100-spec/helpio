from app.core.exceptions import AppError


class JobError(AppError):
    detail = "Job request failed"


class JobNotFoundError(JobError):
    status_code = 404
    detail = "Job not found"


class JobNotEditableError(JobError):
    status_code = 409
    detail = "A job can't be edited once a pro is hired"


class JobIncompleteError(JobError):
    status_code = 422

    def __init__(self, missing: list[str]) -> None:
        super().__init__("A posted job needs " + ", ".join(missing))


class UnknownCategoryError(JobError):
    status_code = 422
    detail = "Unknown category"


class JobNotOpenError(JobError):
    status_code = 409
    detail = "This job is no longer taking quotes"


class AlreadyQuotedError(JobError):
    status_code = 409
    detail = "You have already quoted on this job"


class ProviderNotReadyError(JobError):
    status_code = 409
    detail = "Finish your skills and service area before quoting"


class TooManyAttachmentsError(JobError):
    status_code = 409

    def __init__(self, limit: int) -> None:
        super().__init__(f"A job can have up to {limit} photos or videos")


class AttachmentNotFoundError(JobError):
    status_code = 404
    detail = "Photo not found"


class JobClosedForChangesError(JobError):
    status_code = 409
    detail = "Photos can only be changed before a pro is hired"


class QuoteNotFoundError(JobError):
    status_code = 404
    detail = "You have no quote on this job"


class QuoteNotWithdrawableError(JobError):
    status_code = 409
    detail = "Only a pending quote can be withdrawn"


class UnsupportedAttachmentError(JobError):
    status_code = 422
    detail = "Use a JPG, PNG or WebP photo, or an MP4 video, up to 10 MB"


class InviteNotAllowedError(JobError):
    status_code = 409
    detail = "Post the job first, then send it to a pro"


class AlreadyInvitedError(JobError):
    status_code = 409
    detail = "You've already sent this job to this pro"


class TooManyInvitesError(JobError):
    status_code = 409

    def __init__(self, limit: int) -> None:
        super().__init__(f"You can send a job to up to {limit} pros directly")


class ProviderUnavailableError(JobError):
    status_code = 404
    detail = "This pro isn't available"


class InviteNotFoundError(JobError):
    status_code = 404
    detail = "There's no request for you on this job"


class QuoteNotPendingError(JobError):
    status_code = 409
    detail = "This quote has already been answered or withdrawn"


class JobNotFoundForQuoteError(JobError):
    status_code = 404
    detail = "Quote not found"


class JobNotStartableError(JobError):
    status_code = 409
    detail = "This job can't be started now"


class WrongPinError(JobError):
    status_code = 400

    def __init__(self, tries_left: int) -> None:
        super().__init__(f"Wrong PIN. {tries_left} {'try' if tries_left == 1 else 'tries'} left.")


class PinLockedError(JobError):
    status_code = 429
    detail = "Too many wrong PINs. Ask the customer to get a new PIN in the app."


class ChatNotAvailableError(JobError):
    status_code = 409
    detail = "Chat opens once you hire a pro"


class JobNotInProgressError(JobError):
    status_code = 409
    detail = "Start the job with the customer's PIN before sending progress"


class MilestoneNotFoundError(JobError):
    status_code = 404
    detail = "Stage not found"


class MilestoneLockedError(JobError):
    status_code = 409
    detail = "The previous stage needs the customer's approval first"


class MilestoneNotOpenError(JobError):
    status_code = 409
    detail = "This stage is already waiting for approval or approved"


class MilestoneNotSubmittedError(JobError):
    status_code = 409
    detail = "There's no update waiting for your review on this stage"


class MilestonePhotosRequiredError(JobError):
    status_code = 422

    def __init__(self, limit: int) -> None:
        super().__init__(f"Add 1 to {limit} photos of the work")
