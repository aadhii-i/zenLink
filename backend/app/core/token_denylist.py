"""
Redis-backed single-use enforcement for refresh tokens.

A refresh token's `jti` is added here once it's been exchanged for a new
pair, with a TTL matching its own remaining lifetime — so a stolen/replayed
refresh token can only be used once, and the denylist entry cleans itself
up exactly when the token would have expired anyway (no manual pruning
job needed). This is what closes the gap noted back in Phase 5: rotation
alone doesn't invalidate the old token; this does.

Fails open on Redis errors in both directions: a brief Redis outage
degrades to "refresh tokens aren't single-use right now" rather than
locking every user out of refreshing their session. The primary security
boundary is still the token's own expiry (default 7 days) — this denylist
is defense-in-depth on top of that, not the only thing standing between an
attacker and a valid session.
"""
from redis.asyncio import Redis

from app.core.logging_config import get_logger

logger = get_logger(__name__)

_DENYLIST_KEY_PREFIX = "shortlink:denylist:"


def _key(jti: str) -> str:
    return f"{_DENYLIST_KEY_PREFIX}{jti}"


async def denylist_token(redis_client: Redis, jti: str, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return  # already past its natural expiry — nothing to denylist
    try:
        await redis_client.set(_key(jti), "1", ex=ttl_seconds)
    except Exception as exc:
        logger.warning(f"Failed to denylist token {jti}: {exc}")


async def is_denylisted(redis_client: Redis, jti: str) -> bool:
    try:
        return bool(await redis_client.exists(_key(jti)))
    except Exception as exc:
        logger.warning(f"Denylist check failed for {jti}, allowing: {exc}")
        return False
