"""
Click repository — records redirect events, one row per click. Read/
aggregation queries live in analytics_repository.py, which reads this same
table.
"""
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.url import URLClick


class ClickRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        *,
        url_id: uuid.UUID,
        clicked_at: datetime,
        ip_address: str | None,
        user_agent: str | None,
        referrer: str | None,
        browser: str | None,
        operating_system: str | None,
        device_type: str | None,
    ) -> URLClick:
        click = URLClick(
            url_id=url_id,
            clicked_at=clicked_at,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer=referrer,
            browser=browser,
            operating_system=operating_system,
            device_type=device_type,
        )
        self.db.add(click)
        await self.db.flush()
        return click
