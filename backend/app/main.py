"""
ShortLink API — FastAPI application entrypoint.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.redirect import router as redirect_router
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.logging_config import configure_logging, get_logger
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware
from app.db.redis_client import get_redis_client
from app.db.session import engine

configure_logging()
logger = get_logger(__name__)


async def _check_redis_connection() -> None:
    """Startup-only connectivity probe. Never blocks or fails boot — it just
    makes a misconfigured/unreachable Redis visible in the logs immediately
    rather than only showing up later as a string of 'degraded' /health
    responses or (before this fix) a 500 on every single request. Rate
    limiting (core/rate_limit.py, swallow_errors=True) and the redirect
    cache already tolerate Redis being down at request time on their own.
    """
    redacted = settings.REDIS_URL.rsplit("@", 1)[-1]  # never log credentials
    client = get_redis_client()
    try:
        await client.ping()
        logger.info(f"Redis connected ({redacted})")
    except Exception as exc:
        logger.warning(
            f"Redis unreachable at startup ({redacted}): {exc}. "
            "Rate limiting will fail open (no throttling) until it recovers."
        )
    finally:
        await client.aclose()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks — logs boot info and disposes the DB engine pool cleanly."""
    logger.info(f"Starting {settings.PROJECT_NAME} ({settings.ENVIRONMENT})")
    await _check_redis_connection()
    yield
    logger.info("Shutting down — disposing database engine")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade URL shortener with analytics.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter

# --- Middleware ---
# Order matters: Starlette wraps each added middleware around the previous
# stack, so the LAST one added ends up OUTERMOST (runs first on the way in,
# last on the way out). CORS is added last so it's outermost — every
# response, including a 429 from SlowAPIMiddleware or a validation error
# from deeper in the stack, still carries CORS headers. Without that, the
# browser would surface those as an opaque CORS failure instead of letting
# the frontend read and display the actual error.
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global error handlers: never leak stack traces, always return a
# consistent JSON error shape the frontend can rely on. ---
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    # Defensive type check: this handler is registered for RateLimitExceeded,
    # but Starlette dispatches on the exception's registered type, and it's
    # easy for a differently-shaped error (e.g. a raw redis.exceptions.
    # ConnectionError bubbling up from the limiter's storage backend) to end
    # up routed here in a slightly different slowapi/Starlette version. Never
    # assume `exc.detail` exists — that assumption is exactly what produces
    # `AttributeError: 'ConnectionError' object has no attribute 'detail'`.
    # With swallow_errors=True on the Limiter (core/rate_limit.py) this
    # branch should be unreachable in practice, but it's a cheap guarantee
    # against ever crashing the way this bug report described.
    if not isinstance(exc, RateLimitExceeded):
        logger.error(f"Non-RateLimitExceeded error reached the rate-limit handler: {exc!r}")
        return await unhandled_exception_handler(request, exc)

    client_ip = request.client.host if request.client else "unknown"
    logger.warning(f"Rate limit exceeded: {client_ip} on {request.method} {request.url.path}")
    message = "Too many requests. Please try again later."
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        # Both `message` and `detail` carry the same text: different pages
        # in the frontend read one or the other depending on which endpoint
        # they call (see frontend/src/api and callers), and this handler is
        # global — it can fire for any of them. Without `detail`, auth pages
        # (which only check `.detail`, matching auth.py's HTTPException
        # errors) silently fell back to a generic "check your credentials"
        # message on a 429, masking the real cause.
        content={"success": False, "message": message, "detail": message},
    )


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.info(f"AppError on {request.method} {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message, "detail": exc.message},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    message = "Internal server error"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": message, "detail": message},
    )


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"], summary="API root")
async def root() -> dict[str, str]:
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


# Registered LAST: a catch-all GET /{short_code}. Every other route above
# (/, /docs, /redoc, /api/v1/*) is matched first since Starlette resolves
# routes in registration order — this must never come before them.
app.include_router(redirect_router)
