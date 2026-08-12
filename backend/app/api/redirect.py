"""
Root-level redirect route: GET /{short_code} — deliberately NOT under
/api/v1, since a short link must be a clean root-domain path like
short.link/abc123.

Registered LAST in app/main.py (after "/", /docs, /redoc, /api/v1/*) so
this catch-all single-segment route can never shadow a real application
path — Starlette matches routes in registration order.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import RedirectResponse

from app.api.deps import get_redirect_service
from app.services.click_service import record_click
from app.services.redirect_service import RedirectService

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else None


@router.get("/{short_code}", summary="Redirect to the original URL", include_in_schema=False)
async def redirect_to_original(
    short_code: str,
    request: Request,
    background_tasks: BackgroundTasks,
    redirect_service: RedirectService = Depends(get_redirect_service),
) -> RedirectResponse:
    resolved = await redirect_service.resolve(short_code)

    # Analytics write happens after the redirect is already on its way to
    # the client — see services/click_service.py for why it uses its own DB session.
    background_tasks.add_task(
        record_click,
        url_id=resolved.url_id,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        referrer=request.headers.get("referer"),
    )

    return RedirectResponse(url=resolved.original_url, status_code=302)
