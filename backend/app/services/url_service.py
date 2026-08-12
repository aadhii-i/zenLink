"""
URL business logic — creating, listing, reading, updating, and deleting a
user's short links. Every read/write below a single URL enforces
ownership: a user can only ever see or touch their own URLs.
"""
import uuid
from typing import Any

from redis.asyncio import Redis
from sqlalchemy import ColumnElement
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.url import URL
from app.repositories.url_repository import URLRepository
from app.schemas.url import URLCreate, URLUpdate
from app.services.url_cache import invalidate
from app.services.url_exceptions import (
    AliasReservedError,
    AliasTakenError,
    ShortCodeGenerationError,
    URLNotFoundError,
)
from app.utils.short_code import generate_short_code

logger = get_logger(__name__)

# Values that would shadow a real application route if used as a short
# code (e.g. a redirect for "docs" must never be reachable — /docs is
# Swagger UI). Random Base62 generation can't produce these (they're
# shorter than SHORT_CODE_LENGTH), so this only needs to guard custom
# aliases.
RESERVED_ALIASES = {"api", "docs", "redoc", "openapi.json", "health", "favicon.ico", "static"}

_MAX_GENERATION_ATTEMPTS = 5

# API-facing sort keys -> actual ORM column. Whitelisted deliberately —
# never build an ORDER BY from a raw client-supplied string.
SORT_COLUMNS: dict[str, ColumnElement] = {
    "created_at": URL.created_at,
    "click_count": URL.click_count,
    "expires_at": URL.expires_at,
    "original_url": URL.original_url,
}


class URLService:
    def __init__(self, url_repo: URLRepository, redis_client: Redis):
        self.repo = url_repo
        self.redis = redis_client

    async def create_short_url(self, owner_id: uuid.UUID, payload: URLCreate) -> URL:
        if payload.custom_alias:
            if payload.custom_alias.lower() in RESERVED_ALIASES:
                raise AliasReservedError(payload.custom_alias)
            if await self.repo.exists_by_short_code(payload.custom_alias):
                raise AliasTakenError()
            short_code = payload.custom_alias
            is_custom = True
        else:
            short_code = await self._generate_unique_code()
            is_custom = False

        try:
            url = await self.repo.create(
                owner_id=owner_id,
                original_url=str(payload.original_url),
                short_code=short_code,
                is_custom_alias=is_custom,
                expires_at=payload.expires_at,
            )
            await self.repo.db.commit()
        except IntegrityError as exc:
            # Defensive backstop for the race between the exists_by_short_code
            # check above and this insert — the DB's unique constraint on
            # short_code is the real guarantee, this just turns a raw
            # IntegrityError into a clean 409/500 instead of a 500 traceback.
            await self.repo.db.rollback()
            if is_custom:
                raise AliasTakenError() from exc
            raise ShortCodeGenerationError() from exc

        logger.info(f"Short URL created: {short_code} -> {payload.original_url} (owner={owner_id})")
        return url

    async def _generate_unique_code(self) -> str:
        for _ in range(_MAX_GENERATION_ATTEMPTS):
            code = generate_short_code(settings.SHORT_CODE_LENGTH)
            if not await self.repo.exists_by_short_code(code):
                return code
        raise ShortCodeGenerationError()

    async def get_owned_url(self, owner_id: uuid.UUID, url_id: uuid.UUID) -> URL:
        url = await self.repo.get_by_id(url_id)
        # 404 (not 403) for someone else's URL — don't confirm it exists.
        if url is None or url.owner_id != owner_id:
            raise URLNotFoundError()
        return url

    async def list_urls(
        self,
        owner_id: uuid.UUID,
        *,
        search: str | None,
        is_active: bool | None,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> tuple[list[URL], int]:
        sort_column = SORT_COLUMNS.get(sort_by, URL.created_at)
        items, total = await self.repo.list_for_owner(
            owner_id,
            search=search,
            is_active=is_active,
            sort_column=sort_column,
            sort_desc=(sort_order != "asc"),
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return items, total

    async def update_url(self, owner_id: uuid.UUID, url_id: uuid.UUID, payload: URLUpdate) -> URL:
        url = await self.get_owned_url(owner_id, url_id)
        old_short_code = url.short_code

        fields: dict[str, Any] = {}
        for field_name in payload.model_fields_set:
            value = getattr(payload, field_name)
            fields[field_name] = str(value) if field_name == "original_url" and value else value

        if fields:
            url = await self.repo.update(url, fields)
            await self.repo.db.commit()

        # Always invalidate — the destination, active flag, or expiry may
        # have changed, and a stale cached redirect is worse than one extra
        # DB lookup on the next request for this code.
        await invalidate(self.redis, old_short_code)
        return url

    async def delete_url(self, owner_id: uuid.UUID, url_id: uuid.UUID) -> None:
        url = await self.get_owned_url(owner_id, url_id)
        short_code = url.short_code
        await self.repo.delete(url)
        await self.repo.db.commit()
        await invalidate(self.redis, short_code)

    async def get_stats(self, owner_id: uuid.UUID) -> dict[str, int]:
        return await self.repo.get_owner_stats(owner_id)
