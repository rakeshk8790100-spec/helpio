from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from typing import Protocol

from app.core.config import get_settings
from app.core.runtime_settings import runtime_settings

logger = logging.getLogger(__name__)

SUBJECTS = {
    "signup": "Verify your Helpio email",
    "login": "Your Helpio login code",
    "password_reset": "Reset your Helpio password",
    "admin_login": "Your Helpio admin login code",
}


class OtpEmailClient(Protocol):
    def send_otp(self, *, to_email: str, otp: str, purpose: str, expires_minutes: int) -> None:
        pass


class NotificationEmailClient(Protocol):
    def send_notification(self, *, to_email: str, subject: str, body: str, link: str | None) -> None:
        pass


class BrevoOtpEmailClient:
    smtp_host = "smtp-relay.brevo.com"
    # Brevo's alternate port: Render's free plan blocks outbound 25, 465 and 587
    smtp_port = 2525

    def send_otp(self, *, to_email: str, otp: str, purpose: str, expires_minutes: int) -> None:
        self._send(
            to_email, SUBJECTS[purpose],
            "<p>Your Helpio verification code is "
            f"<strong>{otp}</strong>.</p><p>This code expires in {expires_minutes} minutes. "
            "If you didn't ask for it, you can ignore this email.</p>",
        )

    def send_notification(self, *, to_email: str, subject: str, body: str, link: str | None) -> None:
        button = f'<p><a href="{escape(link)}">Open in Helpio</a></p>' if link else ""
        self._send(to_email, subject, f"<p>{escape(body)}</p>{button}")

    def check(self) -> None:
        """Log in to Brevo's SMTP server without sending anything (the console's Test button)."""
        settings = self._configured()
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as smtp:
                smtp.starttls()
                smtp.login(settings.brevo_smtp_login, settings.brevo_smtp_key.get_secret_value())
        except smtplib.SMTPAuthenticationError as error:
            raise RuntimeError("Brevo rejected the SMTP login or key") from error
        except (smtplib.SMTPException, OSError) as error:
            raise RuntimeError(f"Brevo can't be reached: {type(error).__name__}") from error

    def _configured(self):
        settings = runtime_settings()
        missing = [
            name
            for name, value in {
                "BREVO_SMTP_LOGIN": settings.brevo_smtp_login,
                "BREVO_SMTP_KEY": settings.brevo_smtp_key.get_secret_value(),
                "BREVO_FROM_EMAIL": settings.brevo_from_email,
            }.items()
            if not value.strip()
        ]
        if missing:
            raise RuntimeError("Configure " + ", ".join(missing) + " before sending email")
        return settings

    def _send(self, to_email: str, subject: str, html: str) -> None:
        settings = self._configured()
        message = EmailMessage()
        message["From"] = formataddr(("Helpio", settings.brevo_from_email))
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(html, subtype="html")

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as smtp:
                smtp.starttls()
                smtp.login(settings.brevo_smtp_login, settings.brevo_smtp_key.get_secret_value())
                smtp.send_message(message)
        except (smtplib.SMTPException, OSError) as error:
            raise RuntimeError(f"Brevo email send failed: {type(error).__name__}") from error


class ConsoleOtpEmailClient:
    """Development stand-in that logs the code instead of emailing it. Refused in production by Settings."""

    def send_otp(self, *, to_email: str, otp: str, purpose: str, expires_minutes: int) -> None:
        logger.warning("[dev email] %s code for %s: %s (expires in %s min)", purpose, to_email, otp, expires_minutes)

    def send_notification(self, *, to_email: str, subject: str, body: str, link: str | None) -> None:
        logger.warning("[dev email] to %s: %s - %s %s", to_email, subject, body, link or "")


def get_notification_email_client() -> NotificationEmailClient:
    settings = get_settings()
    if settings.app_env == "dev" and settings.auth_dev_email_console:
        return ConsoleOtpEmailClient()
    return BrevoOtpEmailClient()


def get_otp_email_client() -> OtpEmailClient:
    settings = get_settings()
    if settings.app_env == "dev" and settings.auth_dev_email_console:
        return ConsoleOtpEmailClient()
    return BrevoOtpEmailClient()
