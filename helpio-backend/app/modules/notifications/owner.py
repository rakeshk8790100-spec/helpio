"""Emails to the admin console's owner (ADMIN_OWNER_EMAIL): sign-ups and access requests waiting for approval."""
import logging

from fastapi import BackgroundTasks

from app.core.config import get_settings
from app.core.runtime_settings import runtime_settings
from app.integrations.email import NotificationEmailClient
from app.modules.notifications.service import send_email

logger = logging.getLogger(__name__)


def email_owner(
    client: NotificationEmailClient, subject: str, body: str, path: str, background: BackgroundTasks | None = None
) -> None:
    """Best effort, after the response when there's a request to attach it to. `path` is a console page."""
    owner = get_settings().admin_owner_email.strip()
    if not owner:
        logger.warning("%s: set ADMIN_OWNER_EMAIL so someone is told", subject)
        return
    base = runtime_settings().app_web_url.rstrip("/")
    link = f"{base}{path}" if base else None
    if background is not None:
        background.add_task(send_email, client, owner, subject, body, link)
    else:
        send_email(client, owner, subject, body, link)
