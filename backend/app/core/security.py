"""
Password hashing and JWT issuance/verification.

Uses the `bcrypt` library directly rather than passlib — passlib's bcrypt
backend has a well-known incompatibility with bcrypt>=4.1 (it probes
`bcrypt.__about__.__version__`, which recent bcrypt releases removed) and
the passlib project is effectively unmaintained. This is the currently
recommended approach.
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings

# bcrypt silently truncates input at 72 bytes; reject anything longer
# up front rather than accepting a password that gets truncated unnoticed.
_BCRYPT_MAX_BYTES = 72


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


class DecodedToken(BaseModel):
    sub: str
    type: TokenType
    jti: str
    exp: datetime


def hash_password(plain_password: str) -> str:
    if len(plain_password.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {_BCRYPT_MAX_BYTES} bytes.")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash in the DB — treat as "does not match" rather than 500ing.
        return False


def _create_token(subject: uuid.UUID, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "type": token_type.value,
        # Unique per token so a refresh token can be individually denylisted
        # after use (see core/token_denylist.py) without needing to track
        # or invalidate every other token issued to the same user.
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID) -> str:
    return _create_token(
        user_id, TokenType.ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(user_id: uuid.UUID) -> str:
    return _create_token(
        user_id, TokenType.REFRESH, timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )


def decode_token(token: str) -> DecodedToken | None:
    """Returns None on any decode/validation failure — callers turn that into a 401."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return DecodedToken(**payload)
    except (JWTError, ValueError):
        return None
