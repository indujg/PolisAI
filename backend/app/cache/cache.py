"""
Two-tier cache: Redis (when available) → in-memory LRU fallback.

Usage:
    cache = get_cache()
    await cache.get("key")            → Any | None
    await cache.set("key", val, ttl=60)
    await cache.delete("key")
    await cache.clear_prefix("sim:")  → deletes all keys starting with "sim:"

When Redis is unavailable the in-process LRU is used transparently.
All TTLs are in seconds.  A TTL of 0 means "no expiry" (in-memory only).
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


# ── In-memory LRU with TTL ─────────────────────────────────────────────────────

class _TTLEntry:
    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, ttl: int):
        self.value      = value
        self.expires_at = time.monotonic() + ttl if ttl > 0 else float("inf")

    def is_alive(self) -> bool:
        return time.monotonic() < self.expires_at


class LRUCache:
    """Thread-safe in-memory LRU cache with per-entry TTL."""

    def __init__(self, maxsize: int = 1024) -> None:
        self._maxsize = maxsize
        self._store: OrderedDict[str, _TTLEntry] = OrderedDict()
        self._lock   = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if not entry.is_alive():
                self._store.pop(key, None)
                return None
            # Move to end (most recently used)
            self._store.move_to_end(key)
            return entry.value

    async def set(self, key: str, value: Any, ttl: int = 60) -> None:
        async with self._lock:
            self._store[key] = _TTLEntry(value, ttl)
            self._store.move_to_end(key)
            if len(self._store) > self._maxsize:
                self._store.popitem(last=False)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear_prefix(self, prefix: str) -> int:
        async with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            return len(keys)

    def size(self) -> int:
        return len(self._store)


# ── Cache facade ───────────────────────────────────────────────────────────────

class Cache:
    """
    Facade over Redis + LRU fallback.
    Both layers are tried: Redis is primary; on failure or when not configured
    the LRU layer answers synchronously from the same process.
    """

    def __init__(self, redis_url: str = "", lru_maxsize: int = 2048) -> None:
        self._redis_url = redis_url.strip()
        self._redis     = None      # redis.asyncio.Redis
        self._lru       = LRUCache(maxsize=lru_maxsize)

    @property
    def redis_available(self) -> bool:
        return self._redis is not None

    async def startup(self) -> None:
        if not self._redis_url:
            logger.info("cache_mode", mode="in-process LRU (no Redis)")
            return
        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(self._redis_url, decode_responses=True,
                                       socket_connect_timeout=2)
            await client.ping()
            self._redis = client
            logger.info("cache_mode", mode="redis", url=self._redis_url)
        except Exception as exc:
            logger.warning("cache_redis_unavailable", error=str(exc), fallback="LRU")
            self._redis = None

    async def shutdown(self) -> None:
        if self._redis:
            await self._redis.aclose()

    # ── Public API ──────────────────────────────────────────────────────────────

    async def get(self, key: str) -> Any | None:
        if self._redis:
            try:
                import json
                raw = await self._redis.get(key)
                if raw is not None:
                    return json.loads(raw)
            except Exception as exc:
                logger.debug("cache_redis_get_error", key=key, error=str(exc))
        return await self._lru.get(key)

    async def set(self, key: str, value: Any, ttl: int = 60) -> None:
        await self._lru.set(key, value, ttl)
        if self._redis:
            try:
                import json
                if ttl > 0:
                    await self._redis.setex(key, ttl, json.dumps(value))
                else:
                    await self._redis.set(key, json.dumps(value))
            except Exception as exc:
                logger.debug("cache_redis_set_error", key=key, error=str(exc))

    async def delete(self, key: str) -> None:
        await self._lru.delete(key)
        if self._redis:
            try:
                await self._redis.delete(key)
            except Exception as exc:
                logger.debug("cache_redis_delete_error", key=key, error=str(exc))

    async def clear_prefix(self, prefix: str) -> int:
        count = await self._lru.clear_prefix(prefix)
        if self._redis:
            try:
                keys = await self._redis.keys(f"{prefix}*")
                if keys:
                    await self._redis.delete(*keys)
                    count = max(count, len(keys))
            except Exception as exc:
                logger.debug("cache_redis_clear_error", prefix=prefix, error=str(exc))
        return count

    async def get_or_set(self, key: str, factory, ttl: int = 60) -> Any:
        """Get from cache; if missing, call factory(), cache the result, return it."""
        cached = await self.get(key)
        if cached is not None:
            return cached
        value = await factory() if asyncio.iscoroutinefunction(factory) else factory()
        if value is not None:
            await self.set(key, value, ttl)
        return value


# ── Key builders ───────────────────────────────────────────────────────────────

def ck_simulation(sim_id: str)        -> str: return f"sim:{sim_id}"
def ck_government(sim_id: str)        -> str: return f"gov:{sim_id}"
def ck_policies(sim_id: str)          -> str: return f"policies:{sim_id}:active"
def ck_metrics(sim_id: str, tick: int)-> str: return f"metrics:{sim_id}:{tick}"
def ck_token(token_hash: str)         -> str: return f"token:{token_hash}"
def ck_analytics(sim_id: str)         -> str: return f"analytics:{sim_id}"


# ── Application singleton ──────────────────────────────────────────────────────

_cache: Cache | None = None


def get_cache() -> Cache:
    global _cache
    if _cache is None:
        from app.config import get_settings
        s = get_settings()
        _cache = Cache(redis_url=getattr(s, "REDIS_URL", ""))
    return _cache


def reset_cache() -> None:
    global _cache
    _cache = None
