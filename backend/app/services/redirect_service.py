"""
Redirect resolution — Redis cache first, PostgreSQL fallback.

Deliberately returns a small CachedURL-shaped result rather than the full
ORM URL: the redirect endpoint only ever needs the destination and the id
(to log a click), and a cache hit shouldn't require touching the DB at all.
"""
from datetime import datetime, timezone

from redis.asyncio import Redis

from app.repositories.url_repository import URLRepository
from app.services.url_cache import CachedURL, get_cached, set_cached
from app.services.url_exceptions import URLGoneError, URLNotFoundError


class RedirectService:
    def __init__(self, url_repo: URLRepository, redis_client: Redis):
        self.repo = url_repo
        self.redis = redis_client

    async def resolve(self, short_code: str) -> CachedURL:
        cached = await get_cached(self.redis, short_code)
        if cached is not None:
            return cached

        url = await self.repo.get_by_short_code(short_code)
        if url is None:
            raise URLNotFoundError()
        if not url.is_active:
            raise URLGoneError()
        if url.expires_at is not None and url.expires_at <= datetime.now(timezone.utc):
            raise URLGoneError("This short URL has expired.")

        # Only valid, active, non-expired URLs are cached. Staleness after
        # an update/delete is handled by url_service invalidating this same
        # key (see services/url_cache.py) — not by a short TTL alone.
        await set_cached(self.redis, short_code, url)
        return CachedURL(url_id=url.id, original_url=url.original_url)
