"""
Auth business logic — registration, login, token refresh, profile updates.

This is the only layer that combines the repository (DB access) with
security primitives (hashing, JWT). Routers call this; this never touches
SQLAlchemy or FastAPI request/response objects directly.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis

from app.core.exceptions import AppError
from app.core.logging_config import get_logger
from app.core.security import (
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.token_denylist import denylist_token, is_denylisted
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.token import TokenResponse
from app.schemas.user import UserCreate, UserUpdate

logger = get_logger(__name__)


class AuthError(AppError):
    """Raised for any auth failure the router should turn into an HTTP error."""


class AuthService:
    def __init__(self, user_repository: UserRepository, redis_client: Redis):
        self.repo = user_repository
        self.redis = redis_client

    async def register(self, payload: UserCreate) -> User:
        existing = await self.repo.get_by_email(payload.email)
        if existing is not None:
            raise AuthError("An account with this email already exists.", status_code=409)

        hashed = hash_password(payload.password)
        user = await self.repo.create(
            email=payload.email, hashed_password=hashed, full_name=payload.full_name
        )
        await self.repo.db.commit()
        logger.info(f"New user registered: {user.id}")
        return user

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.repo.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise AuthError("Incorrect email or password.", status_code=401)
        if not user.is_active:
            raise AuthError("This account has been deactivated.", status_code=403)
        return user

    def issue_tokens(self, user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        decoded = decode_token(refresh_token)
        if decoded is None or decoded.type != TokenType.REFRESH:
            raise AuthError("Invalid or expired refresh token.", status_code=401)

        if await is_denylisted(self.redis, decoded.jti):
            raise AuthError("This refresh token has already been used.", status_code=401)

        user = await self.repo.get_by_id(uuid.UUID(decoded.sub))
        if user is None or not user.is_active:
            raise AuthError("Invalid or expired refresh token.", status_code=401)

        # Single-use enforcement: denylist the token we were just handed
        # (not the new ones we're about to issue) so it can't be replayed.
        # TTL matches its own remaining lifetime, not a fixed value — no
        # point keeping the denylist entry around longer than the token
        # itself would have been valid for.
        remaining_seconds = int((decoded.exp - datetime.now(timezone.utc)).total_seconds())
        await denylist_token(self.redis, decoded.jti, remaining_seconds)

        return self.issue_tokens(user)

    async def update_profile(self, user: User, payload: UserUpdate) -> User:
        fields: dict[str, Any] = {
            field_name: getattr(payload, field_name) for field_name in payload.model_fields_set
        }
        if fields:
            user = await self.repo.update(user, fields)
            await self.repo.db.commit()
        return user
