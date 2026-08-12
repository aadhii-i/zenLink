"""
Assembles the analytics report — total/daily clicks, browser/OS/device/
referrer breakdowns, recent activity — scoped to either one URL (per-link
detail) or all of a user's URLs (dashboard overview), plus a top-URLs list.
"""
import uuid

from app.models.url import URL, URLClick
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.url_repository import URLRepository
from app.services.url_exceptions import URLNotFoundError

DEFAULT_DAILY_WINDOW_DAYS = 30
DEFAULT_RECENT_CLICKS_LIMIT = 20
DEFAULT_TOP_URLS_LIMIT = 5


class AnalyticsService:
    def __init__(self, analytics_repo: AnalyticsRepository, url_repo: URLRepository):
        self.analytics_repo = analytics_repo
        self.url_repo = url_repo

    async def _resolve_url_ids(
        self, owner_id: uuid.UUID, url_id: uuid.UUID | None
    ) -> list[uuid.UUID]:
        if url_id is not None:
            url = await self.url_repo.get_by_id(url_id)
            # 404 (not 403) for someone else's URL — don't confirm it exists.
            if url is None or url.owner_id != owner_id:
                raise URLNotFoundError()
            return [url.id]
        return await self.url_repo.get_owned_url_ids(owner_id)

    async def get_report(
        self,
        owner_id: uuid.UUID,
        url_id: uuid.UUID | None = None,
        days: int = DEFAULT_DAILY_WINDOW_DAYS,
    ) -> dict:
        url_ids = await self._resolve_url_ids(owner_id, url_id)

        return {
            "total_clicks": await self.analytics_repo.total_clicks(url_ids),
            "daily_clicks": await self.analytics_repo.daily_clicks(url_ids, days=days),
            "browsers": await self.analytics_repo.breakdown(url_ids, URLClick.browser),
            "operating_systems": await self.analytics_repo.breakdown(
                url_ids, URLClick.operating_system
            ),
            "devices": await self.analytics_repo.breakdown(url_ids, URLClick.device_type),
            "referrers": await self.analytics_repo.referrer_domains(url_ids),
            "recent_clicks": await self.analytics_repo.recent_clicks(
                url_ids, limit=DEFAULT_RECENT_CLICKS_LIMIT
            ),
        }

    async def get_top_urls(
        self, owner_id: uuid.UUID, limit: int = DEFAULT_TOP_URLS_LIMIT
    ) -> list[URL]:
        items, _total = await self.url_repo.list_for_owner(
            owner_id,
            search=None,
            is_active=None,
            sort_column=URL.click_count,
            sort_desc=True,
            offset=0,
            limit=limit,
        )
        return items
