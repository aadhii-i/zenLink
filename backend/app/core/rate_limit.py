"""
Redis-backed rate limiting (slowapi, built on the `limits` library) — keyed
by client IP so limits are enforced consistently across every app process/
worker, not as a per-process in-memory counter that resets on restart or
diverges between replicas.

Known tradeoff: `limits`' Redis storage backend uses synchronous redis-py
under the hood, not this app's async `redis.asyncio` client, so each
rate-limit check makes a brief blocking call from within the async request
path. This is a well-established, widely-used pattern for FastAPI — there
is no equally mature fully-async alternative — and the blocking window is
sub-millisecond against a local/same-network Redis. Worth knowing if this
is ever profiled under very high concurrency; not a concern at this scale.

Fails open: `swallow_errors=True` means that if the storage backend raises
(Redis unreachable, wrong REDIS_URL, connection reset, etc.), slowapi logs
the error itself and lets the request through un-throttled instead of
raising it further up the stack. Rate limiting silently being off for a
few minutes during a Redis blip is a far better failure mode than every
request in the app returning 500.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.REDIS_URL,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
    headers_enabled=True,
    swallow_errors=True,
)
