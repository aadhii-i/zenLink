"""
Shared FastAPI dependencies: DB-backed service factories and the
`get_current_user` guard every protected route depends on.
"""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenType, decode_token
from app.db.redis_client import get_redis
from app.db.session import get_db
from app.models.user import User
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.url_repository import URLRepository
from app.repositories.user_repository import UserRepository
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import AuthService
from app.services.redirect_service import RedirectService
from app.services.url_service import URLService

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_auth_service(
    repo: UserRepository = Depends(get_user_repository),
    redis_client: Redis = Depends(get_redis),
) -> AuthService:
    return AuthService(repo, redis_client)


def get_url_repository(db: AsyncSession = Depends(get_db)) -> URLRepository:
    return URLRepository(db)


def get_url_service(
    repo: URLRepository = Depends(get_url_repository),
    redis_client: Redis = Depends(get_redis),
) -> URLService:
    return URLService(repo, redis_client)


def get_redirect_service(
    repo: URLRepository = Depends(get_url_repository),
    redis_client: Redis = Depends(get_redis),
) -> RedirectService:
    return RedirectService(repo, redis_client)


def get_analytics_repository(db: AsyncSession = Depends(get_db)) -> AnalyticsRepository:
    return AnalyticsRepository(db)


def get_analytics_service(
    analytics_repo: AnalyticsRepository = Depends(get_analytics_repository),
    url_repo: URLRepository = Depends(get_url_repository),
) -> AnalyticsService:
    return AnalyticsService(analytics_repo, url_repo)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    repo: UserRepository = Depends(get_user_repository),
) -> User:
    """
    Decodes the Bearer access token, loads the user, and guards against
    expired/malformed tokens and refresh tokens being used where an access
    token is required. Every protected endpoint depends on this.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_error

    decoded = decode_token(credentials.credentials)
    if decoded is None or decoded.type != TokenType.ACCESS:
        raise credentials_error

    try:
        user_id = uuid.UUID(decoded.sub)
    except ValueError:
        raise credentials_error from None

    user = await repo.get_by_id(user_id)
    if user is None:
        raise credentials_error
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    return user
