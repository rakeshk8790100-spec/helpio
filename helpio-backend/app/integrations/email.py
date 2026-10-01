from __future__ import annotations

import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from typing import Protocol

from app.core.config import get_settings


class OtpEmailClient(Protocol):
    def send_otp(self, *, to_email: str, otp: str, purpose: str) -> None:
        pass


class BrevoOtpEmailClient:
    smtp_host = "smtp-relay.brevo.com"
    smtp_port = 587

    def send_otp(self, *, to_email: str, otp: str, purpose: str) -> None:
        settings = get_settings()
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
            raise RuntimeError("Configure " + ", ".join(missing) + " before sending auth email")

        subject = "Verify your Helpio email" if purpose == "signup" else "Reset your Helpio password"
        message = EmailMessage()
        message["From"] = formataddr(("Helpio", settings.brevo_from_email))
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(
            "<p>Your Helpio verification code is "
            f"<strong>{otp}</strong>.</p><p>This code expires in 10 minutes.</p>",
            subtype="html",
        )

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as smtp:
                smtp.starttls()
                smtp.login(settings.brevo_smtp_login, settings.brevo_smtp_key.get_secret_value())
                smtp.send_message(message)
        except smtplib.SMTPException as error:
            raise RuntimeError(f"Brevo email send failed: {error}") from error
        except OSError as error:
            raise RuntimeError(f"Brevo email send failed: {error}") from error