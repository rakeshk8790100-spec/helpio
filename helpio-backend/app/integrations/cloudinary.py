"""Cloudinary over its REST upload API: uploads (unsigned preset or signed) and signed deletes. Only the returned URLs are stored."""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.runtime_settings import runtime_settings
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)

JOB_ATTACHMENTS_FOLDER = "helpio/jobs"


class FileStorageUnavailableError(AppError):
    status_code = 503
    detail = "Photo uploads are not available right now"


@dataclass(frozen=True)
class StoredFile:
    url: str
    public_id: str
    # "image" or "video", needed to delete it later
    resource_type: str


class FileStorage(Protocol):
    def upload(self, content: bytes, *, content_type: str, folder: str, public_id: str) -> StoredFile:
        pass

    def delete(self, public_id: str, resource_type: str) -> None:
        pass


def sign(params: dict[str, str], secret: str) -> str:
    """Cloudinary signature: SHA-1 of the sorted `key=value` pairs joined by `&`, followed by the API secret."""
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params))
    return hashlib.sha1((payload + secret).encode()).hexdigest()


class CloudinaryStorage:
    def __init__(self) -> None:
        settings = runtime_settings()
        self.cloud = settings.cloudinary_cloud_name.strip()
        self.preset = settings.cloudinary_upload_preset.strip()
        self.api_key = settings.cloudinary_api_key.strip()
        self.secret = settings.cloudinary_api_secret.get_secret_value()
        has_key = bool(self.api_key and self.secret)
        if not self.cloud or not (self.preset or has_key):
            raise FileStorageUnavailableError(
                "Configure CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET (or CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET) to enable photo uploads"
            )

    def upload(self, content: bytes, *, content_type: str, folder: str, public_id: str) -> StoredFile:
        resource_type = "video" if content_type.startswith("video/") else "image"
        params = {"folder": folder, "public_id": public_id}
        if self.preset:
            # Unsigned: the preset (not an API key) authorises the upload and enforces formats and size
            params["upload_preset"] = self.preset
        else:
            params["overwrite"] = "false"
        data = self._call(
            f"{resource_type}/upload", params, files={"file": (public_id, content, content_type)}, signed=not self.preset
        )
        return StoredFile(url=data["secure_url"], public_id=data["public_id"], resource_type=resource_type)

    def ping(self) -> None:
        """Admin API check of the key and secret (the console's Test button)."""
        if not (self.api_key and self.secret):
            raise FileStorageUnavailableError("Add the API key and secret to test Cloudinary")
        try:
            response = httpx.get(
                f"https://api.cloudinary.com/v1_1/{self.cloud}/ping", auth=(self.api_key, self.secret), timeout=10
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            raise FileStorageUnavailableError(
                "Cloudinary rejected the cloud name, API key or secret" if error.response.status_code in (401, 404)
                else f"Cloudinary answered {error.response.status_code}"
            ) from error
        except httpx.HTTPError as error:
            raise FileStorageUnavailableError("Cloudinary can't be reached") from error

    def delete(self, public_id: str, resource_type: str) -> None:
        """Best effort: the photo is already gone from the job, so a refused delete only leaves an orphan file."""
        try:
            self._call(f"{resource_type}/destroy", {"public_id": public_id, "invalidate": "true"})
        except FileStorageUnavailableError:
            logger.warning("Could not delete Cloudinary file %s; remove it from the Media Library", public_id)

    def _call(self, path: str, params: dict[str, str], files: dict | None = None, signed: bool = True) -> dict:
        if signed:
            if not (self.api_key and self.secret):
                raise FileStorageUnavailableError("Configure CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET")
            to_sign = {**params, "timestamp": str(int(time.time()))}
            body = {**to_sign, "api_key": self.api_key, "signature": sign(to_sign, self.secret)}
        else:
            body = params
        try:
            response = httpx.post(
                f"https://api.cloudinary.com/v1_1/{self.cloud}/{path}", data=body, files=files, timeout=60
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            status = error.response.status_code
            # Cloudinary explains the rejection in `error.message`; the secret and signature are never logged
            logger.error("Cloudinary %s failed: %s %s", path, status, error.response.text[:300])
            if status == 403:
                raise FileStorageUnavailableError(
                    "Cloudinary refused the request. Check the API key's permissions in the Cloudinary console."
                ) from error
            if status in (400, 401, 404) and not signed:
                raise FileStorageUnavailableError(
                    "Cloudinary rejected the upload. Check CLOUDINARY_CLOUD_NAME and that the upload preset exists and is set to Unsigned."
                ) from error
            if status in (401, 404):
                raise FileStorageUnavailableError(
                    "Cloudinary rejected the credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
                ) from error
            raise FileStorageUnavailableError from error
        except httpx.HTTPError as error:
            logger.error("Cloudinary %s unreachable: %s", path, type(error).__name__)
            raise FileStorageUnavailableError from error
        return response.json()
