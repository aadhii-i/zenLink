"""
Pydantic schemas for the User resource.

Naming convention used throughout this project: `*Create`/`*Update` for
request bodies, `*Read` for response bodies. ORM models are never returned
directly from an endpoint — hashed_password must never be serializable.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.sanitize import sanitize_text


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str | None = Field(None, max_length=255)

    @field_validator("password")
    @classmethod
    def _password_strength(cls, value: str) -> str:
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit.")
        return value

    @field_validator("full_name")
    @classmethod
    def _sanitize_full_name(cls, value: str | None) -> str | None:
        return sanitize_text(value) or None if value is not None else None


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Fields a user may edit on their own profile."""

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(None, max_length=255)

    @field_validator("full_name")
    @classmethod
    def _sanitize_full_name(cls, value: str | None) -> str | None:
        return sanitize_text(value) or None if value is not None else None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
