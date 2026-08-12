"""
URL ORM model — a single shortened link owned by a user.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class URL(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "urls"

    # NULL owner_id = an anonymously-created URL: fully functional (redirects,
    # expiry, custom alias all work normally) but not owned by anyone, so it
    # can never appear in a dashboard/history query (those always filter by
    # owner_id == <the logged-in user's id>, and NULL never equals a UUID).
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    original_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    short_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    is_custom_alias: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Denormalized counter for fast reads (dashboard list, etc.) — the
    # url_clicks table (Phase 5 analytics queries) is the source of truth
    # for anything beyond a simple total.
    click_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    owner: Mapped["User | None"] = relationship(back_populates="urls")
    clicks: Mapped[list["URLClick"]] = relationship(
        back_populates="url", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<URL id={self.id} short_code={self.short_code!r}>"


class URLClick(Base, UUIDPrimaryKeyMixin):
    """
    One row per redirect. browser/operating_system/device_type are parsed
    from user_agent once, at write time (see utils/user_agent_parser.py +
    services/click_service.py), rather than re-parsing the raw string on
    every analytics query.

    No country/geo-IP field: that requires a bundled GeoIP database or a
    per-click network lookup, and the spec marks it explicitly optional —
    left out rather than shipping a column that's always null.
    """

    __tablename__ = "url_clicks"

    url_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("urls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    clicked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6-safe length
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(64), nullable=True)
    operating_system: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(32), nullable=True)

    url: Mapped["URL"] = relationship(back_populates="clicks")

    def __repr__(self) -> str:
        return f"<URLClick id={self.id} url_id={self.url_id}>"
