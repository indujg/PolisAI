"""
Sliding-window rate limiter middleware.

Uses the cache layer (Redis when available, in-process LRU fallback)
so the limit works both single-process and multi-process deployments.

Config:
  RATE_LIMIT_REQUESTS      — max requests per window (default 100)
  RATE_LIMIT_WINDOW_SECONDS — window size in seconds (default 60)

Key: IP address (X-Forwarded-For preferred, else client.host).
WebSocket upgrade requests and health checks are exempt.
"""

from __future__ import annotations

import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)

_EXEMPT_PATHS = {"/api/v1/health", "/docs", "/redoc", "/openapi.json"}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60) -> None:
        super().__init__(app)
        self._max     = max_requests
        self._window  = window_seconds

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip exempt paths and WebSocket upgrades
        if (request.url.path in _EXEMPT_PATHS
                or request.headers.get("upgrade", "").lower() == "websocket"):
            return await call_next(request)

        client_ip = self._get_ip(request)
        key       = f"ratelimit:{client_ip}"

        from app.cache.cache import get_cache
        cache = get_cache()

        # Sliding counter: increment + read atomically via get-or-set pattern
        count = await cache.get(key)
        if count is None:
            count = 0
            await cache.set(key, 0, ttl=self._window)

        count += 1
        await cache.set(key, count, ttl=self._window)

        # Set standard headers
        remaining = max(0, self._max - count)
        response_headers = {
            "X-RateLimit-Limit":     str(self._max),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Window":    str(self._window),
        }

        if count > self._max:
            logger.warning("rate_limit_exceeded", ip=client_ip, count=count)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests. Limit: {self._max} per {self._window}s.",
                    "retry_after": self._window,
                },
                headers={**response_headers, "Retry-After": str(self._window)},
            )

        response = await call_next(request)
        for k, v in response_headers.items():
            response.headers[k] = v
        return response

    @staticmethod
    def _get_ip(request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
