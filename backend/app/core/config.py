"""
Application configuration.

Every environment-dependent value the app needs lives here, loaded once at
import time from environment variables (populated by docker-compose's
env_file, or a local .env when running outside Docker). Nothing else in the
codebase should call os.environ directly — import `settings` instead.
"""
from functools import lru_cache

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _to_asyncpg_url(url: str) -> str:
    """Managed Postgres providers (Render included) hand you a `postgres://`
    or `postgresql://` connection string — SQLAlchemy's async engine needs
    the asyncpg dialect spelled out explicitly, or engine creation raises
    `NoSuchModuleError` before a single query ever runs."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url[len(prefix):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- Project metadata ---
    PROJECT_NAME: str = "ShortLink"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = True

    # --- Public base URL, used to build short links like BASE_URL/abc123 ---
    BASE_URL: str = "http://localhost:8000"

    # --- PostgreSQL ---
    # Same override pattern as REDIS_URL below: managed platforms (Render's
    # PostgreSQL included) hand you a single DATABASE_URL connection string —
    # when it's set, it always wins. Locally / in docker-compose there's no
    # such single var, so DATABASE_URL is built from the discrete host/port/
    # user/password/db fields instead. Without this override, a deploy on
    # Render keeps trying to resolve the docker-compose hostname "db", which
    # doesn't exist there — every DB-touching request (including
    # registration) fails while the process itself boots and stays
    # "reachable" fine, since SQLAlchemy connects lazily on first query, not
    # at engine-creation time.
    DATABASE_URL_ENV: str | None = Field(default=None, alias="DATABASE_URL")
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "shortlink"
    POSTGRES_PASSWORD: str = "shortlink"
    POSTGRES_DB: str = "shortlink"

    @property
    def DATABASE_URL(self) -> str:
        """Async SQLAlchemy connection string (asyncpg driver) — used by the app and Alembic alike."""
        if self.DATABASE_URL_ENV:
            return _to_asyncpg_url(self.DATABASE_URL_ENV)
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # --- Redis ---
    # Managed platforms (Render, Upstash, etc.) hand you a single connection
    # string via a REDIS_URL env var — when it's set, it always wins. Locally
    # and in docker-compose there's no such single var, so REDIS_URL is built
    # from the discrete host/port/db/password fields below instead. Without
    # this override, a deploy on Render would silently keep trying to resolve
    # the docker-compose hostname "redis", which doesn't exist there — that
    # looks identical to "Redis is down" but is actually "never configured to
    # find the real Redis in the first place".
    REDIS_URL_ENV: str | None = Field(default=None, alias="REDIS_URL")
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_URL_ENV:
            return self.REDIS_URL_ENV
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # --- JWT auth (implemented in Phase 2) ---
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7d

    # --- CORS ---
    BACKEND_CORS_ORIGINS: list[AnyHttpUrl] | list[str] = ["http://localhost:5173"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    # --- Short URL generation & redirects (implemented in Phase 3) ---
    SHORT_CODE_LENGTH: int = 7
    CUSTOM_ALIAS_MIN_LENGTH: int = 3
    CUSTOM_ALIAS_MAX_LENGTH: int = 32
    # How long a resolved redirect stays in Redis. Only active, non-expired
    # URLs are cached, and the entry is explicitly invalidated on update/
    # delete (services/url_cache.py) — this TTL is a backstop, not the
    # primary staleness control.
    URL_CACHE_TTL_SECONDS: int = 300

    # --- Rate limiting (Phase 6, Redis-backed — see core/rate_limit.py) ---
    RATE_LIMIT_PER_MINUTE: int = 60
    # Stricter limit for auth endpoints (brute-force / mass-registration protection).
    AUTH_RATE_LIMIT_PER_MINUTE: int = 5

    # --- Logging ---
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — Settings() is only ever constructed once."""
    return Settings()


settings = get_settings()
