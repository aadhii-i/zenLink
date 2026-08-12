"""
URL repository — the only layer that issues SQL for the URL model.
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.url import URL


class URLRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, url_id: uuid.UUID) -> URL | None:
        result = await self.db.execute(select(URL).where(URL.id == url_id))
        return result.scalar_one_or_none()

    async def get_by_short_code(self, short_code: str) -> URL | None:
        result = await self.db.execute(select(URL).where(URL.short_code == short_code))
        return result.scalar_one_or_none()

    async def get_owned_url_ids(self, owner_id: uuid.UUID) -> list[uuid.UUID]:
        """All URL ids belonging to owner_id — used to scope analytics queries."""
        result = await self.db.execute(select(URL.id).where(URL.owner_id == owner_id))
        return list(result.scalars().all())

    async def exists_by_short_code(self, short_code: str) -> bool:
        result = await self.db.execute(select(URL.id).where(URL.short_code == short_code))
        return result.scalar_one_or_none() is not None

    async def create(
        self,
        *,
        owner_id: uuid.UUID,
        original_url: str,
        short_code: str,
        is_custom_alias: bool,
        expires_at: datetime | None,
    ) -> URL:
        url = URL(
            owner_id=owner_id,
            original_url=original_url,
            short_code=short_code,
            is_custom_alias=is_custom_alias,
            expires_at=expires_at,
        )
        self.db.add(url)
        await self.db.flush()
        await self.db.refresh(url)
        return url

    async def increment_click_count(self, url_id: uuid.UUID) -> None:
        url = await self.get_by_id(url_id)
        if url is not None:
            url.click_count += 1
            await self.db.flush()

    async def update(self, url: URL, fields: dict[str, Any]) -> URL:
        for field_name, value in fields.items():
            setattr(url, field_name, value)
        await self.db.flush()
        await self.db.refresh(url)
        return url

    async def delete(self, url: URL) -> None:
        await self.db.delete(url)
        await self.db.flush()

    async def list_for_owner(
        self,
        owner_id: uuid.UUID,
        *,
        search: str | None,
        is_active: bool | None,
        sort_column: ColumnElement,
        sort_desc: bool,
        offset: int,
        limit: int,
    ) -> tuple[list[URL], int]:
        conditions = [URL.owner_id == owner_id]

        if search:
            pattern = f"%{search}%"
            conditions.append(or_(URL.original_url.ilike(pattern), URL.short_code.ilike(pattern)))

        if is_active is not None:
            conditions.append(URL.is_active == is_active)

        count_query = select(func.count()).select_from(URL).where(*conditions)
        total = (await self.db.execute(count_query)).scalar_one()

        order = sort_column.desc() if sort_desc else sort_column.asc()
        list_query = (
            select(URL).where(*conditions).order_by(order).offset(offset).limit(limit)
        )
        items = (await self.db.execute(list_query)).scalars().all()

        return list(items), total

    async def get_owner_stats(self, owner_id: uuid.UUID) -> dict[str, int]:
        result = await self.db.execute(
            select(
                func.count().label("total_urls"),
                func.count().filter(URL.is_active.is_(True)).label("active_urls"),
                func.coalesce(func.sum(URL.click_count), 0).label("total_clicks"),
            ).where(URL.owner_id == owner_id)
        )
        row = result.one()
        total_urls = int(row.total_urls)
        active_urls = int(row.active_urls)
        return {
            "total_urls": total_urls,
            "active_urls": active_urls,
            "inactive_urls": total_urls - active_urls,
            "total_clicks": int(row.total_clicks),
        }
