"""
Health check endpoint — verifies the app, database, and cache are all up.
Used by Docker Compose healthchecks and load balancers.
"""
from typing import Literal

import redis.asyncio as redis
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging_config import get_logger
from app.core.rate_limit import limiter
from app.db.redis_client import get_redis
from app.db.session import get_db

logger = get_logger(__name__)
router = APIRouter()


class ComponentStatus(BaseModel):
    status: Literal["ok", "error"]
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    database: ComponentStatus
    cache: ComponentStatus


@router.get("", response_model=HealthResponse, summary="Service health check")
@limiter.exempt  # Docker healthchecks / load balancers poll this frequently; never throttle it.
async def health_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
    cache: redis.Redis = Depends(get_redis),
) -> HealthResponse:
    """Pings PostgreSQL and Redis directly rather than assuming they're up."""
    db_status = ComponentStatus(status="ok")
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:  # health check must never raise
        logger.error(f"Database health check failed: {exc}")
        db_status = ComponentStatus(status="error", detail=str(exc))

    cache_status = ComponentStatus(status="ok")
    try:
        await cache.ping()
    except Exception as exc:
        logger.error(f"Redis health check failed: {exc}")
        cache_status = ComponentStatus(status="error", detail=str(exc))

    overall = "ok" if db_status.status == "ok" and cache_status.status == "ok" else "degraded"
    return HealthResponse(status=overall, database=db_status, cache=cache_status)
