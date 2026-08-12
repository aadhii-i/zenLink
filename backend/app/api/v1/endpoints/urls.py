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

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_url_service
from app.models.url import URL
from app.models.user import User
from app.schemas.url import URLCreate, URLListResponse, URLRead, URLStats, URLUpdate
from app.services.url_service import URLService

router = APIRouter()


@router.post(
    "",
    response_model=URLRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a short URL",
)
async def create_url(
    payload: URLCreate,
    current_user: User = Depends(get_current_user),
    url_service: URLService = Depends(get_url_service),
) -> URLRead:
    url: URL = await url_service.create_short_url(current_user.id, payload)
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
