from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from typing import Any

from app.core.config import get_settings


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _unb64url(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_secret(secret: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 260_000)
    return "pbkdf2_sha256$260000$" + _b64url(salt) + "$" + _b64url(digest)


def verify_secret(secret: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, digest = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        expected = hashlib.pbkdf2_hmac(
            "sha256", secret.encode("utf-8"), _unb64url(salt), int(iterations)
        )
        return hmac.compare_digest(_b64url(expected), digest)
    except (ValueError, TypeError):
        return False


def create_access_token(*, subject: str, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.auth_token_minutes)).timestamp()),
        "nonce": token_urlsafe(8),
    }
    header = {"alg": "HS256", "typ": "JWT"}
    signing_input = _b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    signing_input += "." + _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.auth_secret_key.get_secret_value().encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return signing_input + "." + _b64url(signature)


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify our HS256 JWT format, signature, and required claims."""
    from binascii import Error as Base64Error
    from uuid import UUID

    try:
        if len(token) > 8192:
            raise ValueError
        header_part, payload_part, signature_part = token.split(".")
        header = json.loads(_unb64url(header_part))
        if header != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError
        signing_input = f"{header_part}.{payload_part}".encode("ascii")
        expected = hmac.new(
            get_settings().auth_secret_key.get_secret_value().encode("utf-8"),
            signing_input, hashlib.sha256,
        ).digest()
        signature = _unb64url(signature_part)
        if _b64url(signature) != signature_part:
            raise ValueError
        if not hmac.compare_digest(expected, signature):
            raise ValueError
        payload = json.loads(_unb64url(payload_part))
        if not isinstance(payload, dict):
            raise ValueError
        now = int(datetime.now(timezone.utc).timestamp())
        if type(payload.get("exp")) is not int or type(payload.get("iat")) is not int:
            raise ValueError
        if payload["exp"] <= now or payload["iat"] > now or payload["exp"] <= payload["iat"]:
            raise ValueError
        UUID(payload["sub"])
        if payload.get("role") not in {"admin", "customer", "provider"}:
            raise ValueError
        if not isinstance(payload.get("nonce"), str) or not payload["nonce"]:
            raise ValueError
        return payload
    except (ValueError, TypeError, KeyError, AttributeError, UnicodeError, Base64Error, OverflowError) as error:
        raise ValueError("Invalid or expired access token") from error


def access_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
