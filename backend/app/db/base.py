"""
Declarative base + reusable model mixins.

Every ORM model (app/models/*.py) inherits from `Base`. `TimestampMixin` and
`UUIDPrimaryKeyMixin` are opt-in building blocks so each model doesn't
redeclare id/created_at/updated_at by hand.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""

    pass


class UUIDPrimaryKeyMixin:
    """Adds a UUID primary key, generated application-side."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )


class TimestampMixin:
    """Adds created_at / updated_at, both maintained by the database."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
