"""
Shared Redis cache helpers for resolved short URLs.

Used by both RedirectService (read path — cache-first resolution) and
URLService (write path — invalidation on update/delete), so the cache key
format, TTL, and failure handling live in exactly one place instead of two
services quietly drifting apart.
"""
import json
import uuid

from redis.asyncio import Redis

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.url import URL

logger = get_logger(__name__)

_CACHE_KEY_PREFIX = "shortlink:url:"


class CachedURL:
    def __init__(self, url_id: uuid.UUID, original_url: str):
        self.url_id = url_id
        self.original_url = original_url


def cache_key(short_code: str) -> str:
    return f"{_CACHE_KEY_PREFIX}{short_code}"


async def get_cached(redis_client: Redis, short_code: str) -> CachedURL | None:
    try:
        raw = await redis_client.get(cache_key(short_code))
    except Exception as exc:
        # Redis being down must degrade to a DB lookup, never break the redirect.
        logger.warning(f"Redis GET failed for {short_code}: {exc}")
        return None

    if raw is None:
        return None
    try:
        data = json.loads(raw)
        return CachedURL(url_id=uuid.UUID(data["url_id"]), original_url=data["original_url"])
    except (ValueError, KeyError, TypeError):
        return None


async def set_cached(redis_client: Redis, short_code: str, url: URL) -> None:
    payload = json.dumps({"url_id": str(url.id), "original_url": url.original_url})
    try:
        await redis_client.set(cache_key(short_code), payload, ex=settings.URL_CACHE_TTL_SECONDS)
    except Exception as exc:
        logger.warning(f"Redis SET failed for {short_code}: {exc}")


async def invalidate(redis_client: Redis, short_code: str) -> None:
    """Called on update/delete so a stale destination/inactive/expired URL
    never keeps redirecting from cache after being changed."""
    try:
        await redis_client.delete(cache_key(short_code))
    except Exception as exc:
        logger.warning(f"Redis DELETE failed for {short_code}: {exc}")
