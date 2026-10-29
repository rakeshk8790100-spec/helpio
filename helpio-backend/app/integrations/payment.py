"""Razorpay over its REST API: Payment Links the customer pays on Razorpay's own page, and the signature checks."""
from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Protocol

import httpx

from app.core.runtime_settings import runtime_settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)

API_URL = "https://api.razorpay.com/v1"


class PaymentGatewayError(AppError):
    status_code = 502
    detail = "Payments aren't available right now. Please try again in a few minutes."


class PaymentGateway(Protocol):
    def create_link(
        self, *, amount_paise: int, reference_id: str, description: str, customer: dict[str, str],
        callback_url: str | None, expire_by: int,
    ) -> dict:
        pass

    def fetch_link(self, link_id: str) -> dict:
        pass

    def cancel_link(self, link_id: str) -> None:
        pass

    def order_payments(self, order_id: str) -> list[dict]:
        pass

    def fetch_payment(self, payment_id: str) -> dict:
        pass

    def verify_callback(self, *, link_id: str, reference_id: str, status: str, payment_id: str, signature: str) -> bool:
        pass

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        pass


def hmac_sha256(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


class RazorpayGateway:
    def __init__(self) -> None:
        settings = runtime_settings()
        self.key_id = settings.razorpay_key_id.strip()
        self.secret = settings.razorpay_key_secret.get_secret_value()
        self.webhook_secret = settings.razorpay_webhook_secret.get_secret_value()
        if not (self.key_id and self.secret):
            raise PaymentGatewayError("Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take payments")

    def create_link(
        self, *, amount_paise: int, reference_id: str, description: str, customer: dict[str, str],
        callback_url: str | None, expire_by: int,
    ) -> dict:
        body: dict[str, object] = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "reference_id": reference_id,
            "description": description,
            # Helpio sends its own notifications
            "notify": {"sms": False, "email": False},
            "reminder_enable": False,
            "expire_by": expire_by,
            "notes": {"helpio_payment_id": reference_id},
            # UPI (Google Pay and other apps, or the QR code) and netbanking only
            "options": {"checkout": {"method": {"upi": "1", "netbanking": "1", "card": "0", "wallet": "0"}}},
        }
        # Prefills Razorpay's page; Razorpay refuses an empty one
        if customer:
            body["customer"] = customer
        if callback_url:
            body |= {"callback_url": callback_url, "callback_method": "get"}
        return self._call("POST", "/payment_links", body)

    def fetch_link(self, link_id: str) -> dict:
        return self._call("GET", f"/payment_links/{link_id}")

    def cancel_link(self, link_id: str) -> None:
        self._call("POST", f"/payment_links/{link_id}/cancel")

    def order_payments(self, order_id: str) -> list[dict]:
        """Every try on the order, failed or captured, with Razorpay's reason for each failure."""
        return self._call("GET", f"/orders/{order_id}/payments").get("items", [])

    def fetch_payment(self, payment_id: str) -> dict:
        return self._call("GET", f"/payments/{payment_id}")

    def verify_callback(self, *, link_id: str, reference_id: str, status: str, payment_id: str, signature: str) -> bool:
        """The redirect back from a paid link is signed with the key secret over `link|reference|status|payment`."""
        expected = hmac_sha256(self.secret, f"{link_id}|{reference_id}|{status}|{payment_id}".encode())
        return hmac.compare_digest(expected, signature)

    def ping(self) -> None:
        """An authenticated call that changes nothing (the console's Test button)."""
        self._call("GET", "/payment_links?count=1")

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        """Webhooks are signed with the webhook secret over the raw body; refused until that secret is set."""
        if not self.webhook_secret:
            logger.warning("Razorpay webhook refused: set RAZORPAY_WEBHOOK_SECRET")
            return False
        return hmac.compare_digest(hmac_sha256(self.webhook_secret, body), signature)

    def _call(self, method: str, path: str, body: dict | None = None) -> dict:
        try:
            response = httpx.request(method, f"{API_URL}{path}", json=body, auth=(self.key_id, self.secret), timeout=20)
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            status = error.response.status_code
            # Razorpay explains the rejection in `error.description`; the key secret is never logged
            logger.error("Razorpay %s %s failed: %s %s", method, path, status, error.response.text[:300])
            if status == 401:
                raise PaymentGatewayError(
                    "Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
                ) from error
            raise PaymentGatewayError from error
        except httpx.HTTPError as error:
            logger.error("Razorpay %s %s unreachable: %s", method, path, type(error).__name__)
            raise PaymentGatewayError from error
        return response.json()
