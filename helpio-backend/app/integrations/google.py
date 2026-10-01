from __future__ import annotations

from typing import Protocol

from app.core.config import get_settings


class GoogleTokenVerifier(Protocol):
    def verify(self, id_token: str) -> dict[str, object]:
        pass


class GoogleOAuthTokenVerifier:
    def verify(self, id_token: str) -> dict[str, object]:
        settings = get_settings()
        client_id = settings.google_client_id.strip()
        if not client_id:
            raise ValueError("Configure GOOGLE_CLIENT_ID before enabling Google login")

        from google.auth.transport import requests
        from google.oauth2 import id_token as google_id_token

        return google_id_token.verify_oauth2_token(
            id_token,
            requests.Request(),
            client_id,
        )
