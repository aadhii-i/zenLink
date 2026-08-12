"""
Pydantic schemas for the URL resource.
"""
import re
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.url import URL

_ALIAS_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")

# Pydantic's HttpUrl already restricts to http/https by design, but that's
# an implicit library behavior — asserting it explicitly here makes the
# security property visible in this file and auditable, and doesn't depend
# on that implementation detail holding across a future pydantic upgrade.
_ALLOWED_SCHEMES = {"http", "https"}


def _validate_scheme(value: HttpUrl) -> HttpUrl:
    if value.scheme not in _ALLOWED_SCHEMES:
        raise ValueError("Only http and https URLs are allowed.")
    return value


class URLCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    original_url: HttpUrl
    custom_alias: str | None = Field(
        None,
        min_length=settings.CUSTOM_ALIAS_MIN_LENGTH,
        max_length=settings.CUSTOM_ALIAS_MAX_LENGTH,
    )
    expires_at: datetime | None = None

    @field_validator("original_url")
    @classmethod
    def _restrict_scheme(cls, value: HttpUrl) -> HttpUrl:
        return _validate_scheme(value)

    @field_validator("custom_alias")
    @classmethod
    def _validate_alias_format(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not _ALIAS_PATTERN.match(value):
            raise ValueError(
                "Custom alias may only contain letters, numbers, hyphens, and underscores."
            )
        return value

    @field_validator("expires_at")
    @classmethod
    def _validate_expiry_in_future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        if value <= datetime.now(timezone.utc):
            raise ValueError("Expiry date must be in the future.")
        return value


class URLUpdate(BaseModel):
    """
    Partial update — only fields actually present in the request body are
    applied (checked via `model_fields_set` in the service layer), so
    sending `expires_at: null` explicitly clears an expiry while omitting
    it entirely leaves the existing value untouched. short_code is
    intentionally not editable here — changing a link people may have
    already shared is a different, riskier operation than editing where it
    points or whether it's active.
    """

    model_config = ConfigDict(extra="forbid")

    original_url: HttpUrl | None = None
    is_active: bool | None = None
    expires_at: datetime | None = None

    @field_validator("original_url")
    @classmethod
    def _restrict_scheme(cls, value: HttpUrl | None) -> HttpUrl | None:
        return _validate_scheme(value) if value is not None else value

    @field_validator("expires_at")
    @classmethod
    def _validate_expiry_in_future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        if value <= datetime.now(timezone.utc):
            raise ValueError("Expiry date must be in the future.")
        return value


class URLRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_url: str
    short_code: str
    short_url: str
    is_active: bool
    is_custom_alias: bool
    expires_at: datetime | None
    click_count: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, url: "URL") -> "URLRead":
        """
        Built explicitly (rather than via from_attributes alone) because
        short_url is derived from settings.BASE_URL + short_code — it isn't
        a real column, and the ORM model deliberately doesn't know about
        BASE_URL (that's a presentation concern, not a persistence one).
        """
        return cls(
            id=url.id,
            original_url=url.original_url,
            short_code=url.short_code,
            short_url=f"{settings.BASE_URL.rstrip('/')}/{url.short_code}",
            is_active=url.is_active,
            is_custom_alias=url.is_custom_alias,
            expires_at=url.expires_at,
            click_count=url.click_count,
            created_at=url.created_at,
            updated_at=url.updated_at,
        )


class URLListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[URLRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class URLStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_urls: int
    active_urls: int
    inactive_urls: int
    total_clicks: int
