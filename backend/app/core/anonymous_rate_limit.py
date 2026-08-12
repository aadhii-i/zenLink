"""
Extra Redis-backed rate limit for unauthenticated URL creation only.

Deliberately NOT implemented via slowapi's @limiter.limit decorator: that
mechanism injects rate-limit headers into the route's own `response`
parameter (see api/v1/endpoints/auth.py's docstring for the incident that
caused), and it only applies a single fixed limit to every caller of a
route. What's needed here is different per caller (stricter for anonymous,
and skipped entirely for authenticated requests, which stay covered by the
existing global default_limits from core/rate_limit.py) — expressing that
through slowapi would mean a second per-route decorator for one narrow
case, adding back the exact class of risk that was just fixed elsewhere
for no real benefit. A plain Redis counter, called explicitly only on the
anonymous branch, is simpler and fully self-contained.

Fails open on Redis errors, same policy as core/token_denylist.py — a
Redis blip should not block anonymous link creation entirely.
"""
from fastapi import Request
from redis.asyncio import Redis

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.url_exceptions import AnonymousRateLimitExceeded

logger = get_logger(__name__)

_KEY_PREFIX = "shortlink:anon_url_rate:"
_WINDOW_SECONDS = 60


async def enforce_anonymous_url_rate_limit(redis_client: Redis, request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{_KEY_PREFIX}{client_ip}"

    try:
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, _WINDOW_SECONDS)
    except Exception as exc:
        logger.warning(f"Anonymous rate limit check failed, allowing request: {exc}")
        return

    if count > settings.ANONYMOUS_URL_RATE_LIMIT_PER_MINUTE:
        raise AnonymousRateLimitExceeded()
