"""
Analytics endpoints: dashboard-wide overview, per-URL detail, and top URLs.

Route order matters here too: /overview and /top-urls are static paths
registered before /urls/{url_id} for the same reason as urls.py's /stats.
"""
import uuid

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service, get_current_user
from app.models.user import User
from app.schemas.analytics import AnalyticsReport
from app.schemas.url import URLRead
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/overview",
    response_model=AnalyticsReport,
    summary="Analytics across all of the current user's URLs",
)
async def get_overview(
    days: int = Query(30, ge=1, le=365, description="How many days of daily_clicks to include"),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsReport:
    report = await analytics_service.get_report(current_user.id, url_id=None, days=days)
    return AnalyticsReport(**report)


@router.get("/top-urls", response_model=list[URLRead], summary="Top URLs by click count")
async def get_top_urls(
    limit: int = Query(5, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> list[URLRead]:
    urls = await analytics_service.get_top_urls(current_user.id, limit=limit)
    return [URLRead.from_model(url) for url in urls]


@router.get("/urls/{url_id}", response_model=AnalyticsReport, summary="Analytics for a single URL")
async def get_url_analytics(
    url_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> AnalyticsReport:
    report = await analytics_service.get_report(current_user.id, url_id=url_id, days=days)
    return AnalyticsReport(**report)
