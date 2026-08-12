"""
URL management endpoints: create, list (search/sort/filter/paginate),
get, update, delete, and aggregate stats — the dashboard's full CRUD
surface. AppError subclasses raised by the service layer are handled by
the global handler in app/main.py, so there's no try/except here.

Route order matters: /stats is registered before /{url_id} so "stats"
is never parsed as a UUID path parameter.
"""
import math
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, status
from redis.asyncio import Redis

from app.api.deps import get_current_user, get_current_user_optional, get_url_service
from app.core.anonymous_rate_limit import enforce_anonymous_url_rate_limit
from app.db.redis_client import get_redis
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLCreate, URLListResponse, URLRead, URLStats, URLUpdate
from app.services.url_service import URLService

router = APIRouter()


@router.post(
    "",
    response_model=URLRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a short URL — works with or without an account",
)
async def create_url(
    request: Request,
    payload: URLCreate,
    current_user: User | None = Depends(get_current_user_optional),
    url_service: URLService = Depends(get_url_service),
    redis_client: Redis = Depends(get_redis),
) -> URLRead:
    """
    Authenticated callers get their URL saved to their account (owner_id =
    their user id, visible in /urls and the dashboard). Unauthenticated
    callers get a fully working URL with owner_id = NULL — it redirects,
    respects custom alias/expiry, and is tracked in analytics data just
    like any other, but never appears in anyone's history since every
    other endpoint here filters by a real owner id. Anonymous requests get
    an extra, stricter rate limit (see core/anonymous_rate_limit.py);
    authenticated ones are exempt from that and rely on the standard
    global limit instead.
    """
    if current_user is None:
        await enforce_anonymous_url_rate_limit(redis_client, request)

    owner_id = current_user.id if current_user is not None else None
    url: URL = await url_service.create_short_url(owner_id, payload)
    return URLRead.from_model(url)


@router.get("/stats", response_model=URLStats, summary="Aggregate stats for the current user's URLs")
async def get_url_stats(
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> URLStats:
    stats = await url_service.get_stats(current_user.id)
    return URLStats(**stats)


@router.get("", response_model=URLListResponse, summary="List the current user's URLs")
async def list_urls(
    search: str | None = Query(None, max_length=255, description="Matches original URL or short code"),
    is_active: bool | None = Query(None),
    sort_by: Literal["created_at", "click_count", "expires_at", "original_url"] = Query("created_at"),
    sort_order: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> URLListResponse:
    items, total = await url_service.list_urls(
        current_user.id,
        search=search,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return URLListResponse(
        items=[URLRead.from_model(url) for url in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/{url_id}", response_model=URLRead, summary="Get a single URL")
async def get_url(
    url_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> URLRead:
    url = await url_service.get_owned_url(current_user.id, url_id)
    return URLRead.from_model(url)


@router.patch("/{url_id}", response_model=URLRead, summary="Update a URL")
async def update_url(
    url_id: uuid.UUID,
    payload: URLUpdate,
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> URLRead:
    url = await url_service.update_url(current_user.id, url_id, payload)
    return URLRead.from_model(url)


@router.delete("/{url_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a URL")
async def delete_url(
    url_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> None:
    await url_service.delete_url(current_user.id, url_id)
