import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit

import httpx

MAX_JWKS_BYTES = 262_144
MAX_JWKS_KEYS = 64

JwksLoader = Callable[[str], Awaitable[list[dict[str, Any]]]]


class JwksError(Exception):
    """A safe-to-collapse JWKS retrieval or validation failure."""


@dataclass
class _CacheState:
    keys: list[dict[str, Any]] | None = None
    expires_at: float = 0.0
    last_unknown_refresh_at: float = float("-inf")
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class JwksCache:
    def __init__(
        self,
        *,
        loader: JwksLoader | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
        ttl_seconds: float = 300.0,
        unknown_kid_refresh_interval: float = 30.0,
        request_timeout_seconds: float = 5.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._transport = transport
        self._loader = loader or self._load_from_http
        self._ttl_seconds = ttl_seconds
        self._unknown_kid_refresh_interval = unknown_kid_refresh_interval
        self._request_timeout_seconds = request_timeout_seconds
        self._clock = clock
        self._states: dict[str, _CacheState] = {}

    async def get_key(self, url: str, kid: str) -> dict[str, Any] | None:
        state = self._states.setdefault(url, _CacheState())
        async with state.lock:
            now = self._clock()
            refreshed = False
            if state.keys is None or now >= state.expires_at:
                await self._refresh(url, state)
                refreshed = True

            key = self._select_key(state.keys or [], kid)
            if key is not None:
                return key

            now = self._clock()
            if refreshed:
                state.last_unknown_refresh_at = now
                return None
            if now - state.last_unknown_refresh_at < self._unknown_kid_refresh_interval:
                return None

            state.last_unknown_refresh_at = now
            await self._refresh(url, state)
            return self._select_key(state.keys or [], kid)

    async def _refresh(self, url: str, state: _CacheState) -> None:
        try:
            keys = await self._loader(url)
            self._validate_keys(keys)
        except JwksError:
            raise
        except Exception as error:
            raise JwksError("JWKS retrieval failed") from error

        state.keys = keys
        state.expires_at = self._clock() + self._ttl_seconds

    async def _load_from_http(self, url: str) -> list[dict[str, Any]]:
        self._validate_url(url)
        timeout_seconds = self._request_timeout_seconds
        timeout = httpx.Timeout(
            timeout_seconds,
            connect=min(2.0, timeout_seconds),
            read=timeout_seconds,
            write=min(2.0, timeout_seconds),
            pool=min(2.0, timeout_seconds),
        )
        try:
            async with asyncio.timeout(timeout_seconds):
                async with httpx.AsyncClient(
                    timeout=timeout,
                    follow_redirects=False,
                    transport=self._transport,
                ) as client:
                    async with client.stream(
                        "GET",
                        url,
                        headers={"Accept": "application/json"},
                    ) as response:
                        if response.is_redirect or response.status_code != 200:
                            raise JwksError("JWKS endpoint returned an unsafe status")
                        content = bytearray()
                        async for chunk in response.aiter_bytes():
                            content.extend(chunk)
                            if len(content) > MAX_JWKS_BYTES:
                                raise JwksError("JWKS response exceeded the size limit")
        except JwksError:
            raise
        except (TimeoutError, httpx.HTTPError) as error:
            raise JwksError("JWKS request failed") from error

        try:
            document = json.loads(content)
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise JwksError("JWKS response was not valid JSON") from error
        if not isinstance(document, dict):
            raise JwksError("JWKS response must be an object")
        keys = document.get("keys")
        self._validate_keys(keys)
        return keys

    @staticmethod
    def _select_key(keys: list[dict[str, Any]], kid: str) -> dict[str, Any] | None:
        matches = [key for key in keys if key.get("kid") == kid]
        return matches[0] if len(matches) == 1 else None

    @staticmethod
    def _validate_keys(keys: object) -> None:
        if (
            not isinstance(keys, list)
            or not keys
            or len(keys) > MAX_JWKS_KEYS
            or any(not isinstance(key, dict) for key in keys)
        ):
            raise JwksError("JWKS keys must be a bounded non-empty list")

    @staticmethod
    def _validate_url(url: str) -> None:
        parsed = urlsplit(url)
        if not parsed.hostname or parsed.username or parsed.password:
            raise JwksError("JWKS URL is invalid")
        if parsed.scheme == "https":
            return
        if parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
            return
        raise JwksError("JWKS URL must use HTTPS")
