from app.core.exceptions import AppError


class PaymentError(AppError):
    detail = "Payment request failed"


class PaymentNotDueError(PaymentError):
    status_code = 409
    detail = "Payment opens once all four stages are approved"


class AlreadyPaidError(PaymentError):
    status_code = 409
    detail = "This job is already paid"


class PaymentNotFoundError(PaymentError):
    status_code = 404
    detail = "Payment not found"


class PaymentSignatureError(PaymentError):
    status_code = 400
    detail = "We couldn't confirm that payment. If money left your account, it will show here within a few minutes."


class WebhookSignatureError(PaymentError):
    status_code = 400
    detail = "Invalid webhook signature"


class PaymentNotPaidError(PaymentError):
    status_code = 409
    detail = "The customer hasn't paid for this job yet"


class PayoutAlreadySentError(PaymentError):
    status_code = 409
    detail = "This payout is already marked as sent"
