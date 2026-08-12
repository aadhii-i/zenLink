"""
Async Redis client setup and the `get_redis` FastAPI dependency.

Used from Phase 3 onward for redirect caching, and Phase 6 for rate
limiting. Connection pooling is handled by redis-py internally — this
module just owns the single shared client instance.
"""
from collections.abc import AsyncGenerator

import redis.asyncio as redis

from app.core.config import settings

redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    max_connections=20,
)


def get_redis_client() -> redis.Redis:
    """Return a Redis client bound to the shared connection pool."""
    return redis.Redis(connection_pool=redis_pool)


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    """FastAPI dependency yielding a Redis client for the request."""
    client = get_redis_client()
    try:
        yield client
    finally:
        await client.aclose()
