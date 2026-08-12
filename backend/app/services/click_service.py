"""
Records a redirect click. Runs as a FastAPI background task — see
api/v1/endpoints... actually app/api/redirect.py, which schedules this
after the redirect response has already been sent.

Uses its OWN independent DB session (AsyncSessionLocal directly, not the
request's Depends(get_db) session) since this executes after the response
is on its way to the client — reusing the request session here would be
relying on FastAPI's exact background-task/dependency-teardown ordering,
which is fragile to depend on for something that shouldn't ever risk
corrupting a request's own transaction.
"""
import uuid
from datetime import datetime, timezone

from app.core.logging_config import get_logger
from app.db.session import AsyncSessionLocal
from app.repositories.click_repository import ClickRepository
from app.repositories.url_repository import URLRepository
from app.utils.user_agent_parser import parse_client

logger = get_logger(__name__)


async def record_click(
    url_id: uuid.UUID,
    ip_address: str | None,
    user_agent: str | None,
    referrer: str | None,
) -> None:
    browser, operating_system, device_type = parse_client(user_agent)

    try:
        async with AsyncSessionLocal() as db:
            click_repo = ClickRepository(db)
            url_repo = URLRepository(db)

            await click_repo.create(
                url_id=url_id,
                clicked_at=datetime.now(timezone.utc),
                ip_address=ip_address,
                user_agent=user_agent,
                referrer=referrer,
                browser=browser,
                operating_system=operating_system,
                device_type=device_type,
            )
            await url_repo.increment_click_count(url_id)
            await db.commit()
    except Exception as exc:
        # A failed analytics write must never surface anywhere the user can
        # see — the redirect has already completed by the time this runs.
        logger.error(f"Failed to record click for url_id={url_id}: {exc}")
