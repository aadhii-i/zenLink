"""
Adds a baseline set of security response headers to every response.

No Content-Security-Policy here deliberately: this app also serves
Swagger UI (/docs) and ReDoc (/redoc), which load their assets from a CDN
by default — a strict CSP applied globally would break them, and a
per-route CSP is more complexity than this API needs right now. The
headers below are safe to apply unconditionally.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response
