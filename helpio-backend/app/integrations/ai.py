"""Claude over the official SDK: one short structured answer per call. Every failure returns None for a fallback."""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Protocol, TypeVar

import anthropic
from pydantic import BaseModel

from app.core.runtime_settings import runtime_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# A customer is waiting on the form: one quick retry, then the caller falls back
TIMEOUT_SECONDS = 8.0
MAX_RETRIES = 1
MAX_TOKENS = 1024


class StructuredModel(Protocol):
    def parse(self, *, system: str, text: str, output: type[T]) -> T | None:
        pass


@lru_cache(maxsize=1)
def _client(api_key: str) -> anthropic.Anthropic:
    # Cached per key, so a key changed in the admin console takes effect at once
    return anthropic.Anthropic(api_key=api_key, timeout=TIMEOUT_SECONDS, max_retries=MAX_RETRIES)


class ClaudeClient:
    def __init__(self, api_key: str, model: str) -> None:
        self.client = _client(api_key)
        self.model = model

    def parse(self, *, system: str, text: str, output: type[T]) -> T | None:
        try:
            response = self.client.messages.parse(
                model=self.model,
                max_tokens=MAX_TOKENS,
                # A short extraction: no thinking, so the answer comes back fast
                thinking={"type": "disabled"},
                system=system,
                messages=[{"role": "user", "content": text}],
                output_format=output,
            )
        except anthropic.APIConnectionError:
            logger.warning("Claude unreachable or timed out")
            return None
        except anthropic.RateLimitError:
            logger.warning("Claude rate limit reached")
            return None
        except anthropic.APIStatusError as error:
            logger.warning("Claude request failed with status %s", error.status_code)
            return None
        if response.stop_reason in ("refusal", "max_tokens"):
            logger.warning("Claude stopped early: %s", response.stop_reason)
            return None
        return response.parsed_output


def get_ai_client() -> ClaudeClient | None:
    """None without an API key: callers use their non-AI fallback."""
    settings = runtime_settings()
    api_key = settings.anthropic_api_key.get_secret_value().strip()
    if not api_key:
        return None
    return ClaudeClient(api_key, settings.ai_model.strip() or "claude-haiku-5-5")
