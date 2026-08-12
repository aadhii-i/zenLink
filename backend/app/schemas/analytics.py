"""
Pydantic schemas for analytics reporting.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DailyClickPoint(BaseModel):
    date: str
    count: int


class BreakdownItem(BaseModel):
    label: str
    count: int


class RecentClick(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clicked_at: datetime
    browser: str | None
    operating_system: str | None
    device_type: str | None
    referrer: str | None
    ip_address: str | None


class AnalyticsReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_clicks: int
    daily_clicks: list[DailyClickPoint]
    browsers: list[BreakdownItem]
    operating_systems: list[BreakdownItem]
    devices: list[BreakdownItem]
    referrers: list[BreakdownItem]
    recent_clicks: list[RecentClick]
