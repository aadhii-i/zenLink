"""
Read-only aggregation queries over url_clicks — powers the analytics
overview and per-URL detail view. Every method takes an explicit list of
url_ids rather than an owner_id: ownership is resolved once by
AnalyticsService (which knows whether it's scoping to one URL or all of a
user's URLs), so this repository never has to re-derive it.
"""
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Sequence
from urllib.parse import urlparse

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.url import URLClick

# Referrers are full URLs with high cardinality (query strings, paths) —
# grouping by exact string would produce a near-useless long tail. Instead
# we pull the (bounded) most recent raw referrers and group by domain in
# Python, which avoids relying on a Postgres-specific string function.
_REFERRER_SAMPLE_SIZE = 5000
_TOP_REFERRERS = 10


class AnalyticsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def total_clicks(self, url_ids: Sequence[uuid.UUID]) -> int:
        if not url_ids:
            return 0
        result = await self.db.execute(
            select(func.count()).select_from(URLClick).where(URLClick.url_id.in_(url_ids))
        )
        return result.scalar_one()

    async def daily_clicks(self, url_ids: Sequence[uuid.UUID], days: int) -> list[dict]:
        if not url_ids:
            return []
        since = datetime.now(timezone.utc) - timedelta(days=days)
        day_expr = func.date(URLClick.clicked_at)
        result = await self.db.execute(
            select(day_expr.label("day"), func.count().label("count"))
            .where(URLClick.url_id.in_(url_ids), URLClick.clicked_at >= since)
            .group_by(day_expr)
            .order_by(day_expr)
        )
        return [{"date": row.day.isoformat(), "count": row.count} for row in result.all()]

    async def breakdown(
        self, url_ids: Sequence[uuid.UUID], column: ColumnElement, limit: int = 10
    ) -> list[dict]:
        """Generic GROUP BY count for a single nullable column (browser, OS, device_type)."""
        if not url_ids:
            return []
        label_expr = func.coalesce(column, "Unknown")
        result = await self.db.execute(
            select(label_expr.label("label"), func.count().label("count"))
            .where(URLClick.url_id.in_(url_ids))
            .group_by(label_expr)
            .order_by(func.count().desc())
            .limit(limit)
        )
        return [{"label": row.label, "count": row.count} for row in result.all()]

    async def referrer_domains(self, url_ids: Sequence[uuid.UUID]) -> list[dict]:
        if not url_ids:
            return []
        result = await self.db.execute(
            select(URLClick.referrer)
            .where(URLClick.url_id.in_(url_ids))
            .order_by(URLClick.clicked_at.desc())
            .limit(_REFERRER_SAMPLE_SIZE)
        )
        counts: Counter[str] = Counter()
        for referrer in result.scalars().all():
            counts[_extract_domain(referrer)] += 1
        return [{"label": label, "count": count} for label, count in counts.most_common(_TOP_REFERRERS)]

    async def recent_clicks(self, url_ids: Sequence[uuid.UUID], limit: int) -> list[URLClick]:
        if not url_ids:
            return []
        result = await self.db.execute(
            select(URLClick)
            .where(URLClick.url_id.in_(url_ids))
            .order_by(URLClick.clicked_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


def _extract_domain(referrer: str | None) -> str:
    if not referrer:
        return "Direct"
    try:
        netloc = urlparse(referrer).netloc
    except ValueError:
        return "Direct"
    return netloc or "Direct"
