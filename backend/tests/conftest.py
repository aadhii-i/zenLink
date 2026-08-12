"""
Shared pytest fixtures.

Requires a REAL PostgreSQL + Redis — not SQLite/fakeredis — because the
models use Postgres-specific UUID columns and the app talks to Redis
directly for caching/rate-limiting/the token denylist. The simplest way to
get both: `docker-compose up -d db redis` (see docs/TESTING.md), then run
pytest against a dedicated `<POSTGRES_DB>_test` database and Redis DB 15,
both fixture-managed so they never touch dev data.
"""
import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models  # noqa: F401 - registers every table on Base.metadata
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.redis_client import get_redis
from app.db.session import get_db
from app.main import app as fastapi_app

TEST_DATABASE_URL = settings.DATABASE_URL.rsplit("/", 1)[0] + f"/{settings.POSTGRES_DB}_test"
# Redis DB 15 is a common testing convention — isolated from dev (DB 0)
# without needing a second Redis instance.
TEST_REDIS_URL = settings.REDIS_URL.rsplit("/", 1)[0] + "/15"


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        # Delete-all rather than nested-transaction rollback: simpler and
        # more robust across async SQLAlchemy versions, and the round trip
        # cost is irrelevant at test-suite scale.
        await session.rollback()
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()


@pytest_asyncio.fixture
async def redis_client() -> AsyncGenerator[Redis, None]:
    test_redis = Redis.from_url(TEST_REDIS_URL, decode_responses=True)
    await test_redis.flushdb()
    yield test_redis
    await test_redis.flushdb()
    await test_redis.aclose()


@pytest_asyncio.fixture
async def client(db_session, redis_client) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db_session

    async def _override_get_redis():
        yield redis_client

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    fastapi_app.dependency_overrides[get_redis] = _override_get_redis
    # Deterministic tests: rate limiting has its own dedicated test, which
    # re-enables it for that one test only.
    limiter.enabled = False

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    fastapi_app.dependency_overrides.clear()
    limiter.enabled = True


@pytest_asyncio.fixture
async def redirect_client(client, db_engine, monkeypatch) -> AsyncClient:
    """
    Use instead of `client` for tests that exercise GET /{short_code}.

    The redirect endpoint's click-recording (services/click_service.py)
    deliberately runs in a FastAPI background task with its OWN DB session
    — it imports AsyncSessionLocal directly rather than using the get_db
    dependency, since it executes after the response has already been sent
    (see that file's docstring). That means `client`'s dependency_overrides
    can't reach it; the session factory it imports is patched directly
    instead, so click-recording writes to the test DB too.
    """
    test_session_factory = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    monkeypatch.setattr("app.services.click_service.AsyncSessionLocal", test_session_factory)
    return client


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient) -> dict:
    """Registers a fresh user and returns {user, access_token, refresh_token}."""
    email = f"user-{uuid.uuid4().hex[:10]}@example.com"
    password = "TestPass123"

    register_response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert register_response.status_code == 201, register_response.text

    login_response = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert login_response.status_code == 200, login_response.text
    tokens = login_response.json()

    return {
        "user": register_response.json(),
        "email": email,
        "password": password,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
    }


@pytest_asyncio.fixture
async def auth_headers(registered_user: dict) -> dict:
    return {"Authorization": f"Bearer {registered_user['access_token']}"}
