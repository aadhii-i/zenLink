"""
Parses a raw User-Agent header into (browser, operating_system,
device_type) for analytics grouping.

Never raises — a click must be recorded even if the UA string is missing,
malformed, or from a library version that chokes on it; worst case the
breakdown just buckets it under "Unknown" (see analytics_repository's
COALESCE) instead of losing the click entirely.
"""
from user_agents import parse as parse_user_agent


def parse_client(user_agent: str | None) -> tuple[str | None, str | None, str | None]:
    if not user_agent:
        return None, None, None

    try:
        ua = parse_user_agent(user_agent)
    except Exception:
        return None, None, None

    browser = ua.browser.family or None
    operating_system = ua.os.family or None

    if ua.is_bot:
        device_type = "Bot"
    elif ua.is_mobile:
        device_type = "Mobile"
    elif ua.is_tablet:
        device_type = "Tablet"
    elif ua.is_pc:
        device_type = "Desktop"
    else:
        device_type = "Other"

    return browser, operating_system, device_type
