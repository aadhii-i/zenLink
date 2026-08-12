"""make url owner_id nullable

Revision ID: 64b94c036222
Revises: 353e72cce2b1
Create Date: 2026-08-12 00:00:00.000000

Authentication is now optional: anonymous requests create a URL with
owner_id = NULL instead of being rejected. Existing rows are untouched —
this only relaxes the NOT NULL constraint, it doesn't backfill or delete
anything.
"""
from typing import Sequence, Union

from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "64b94c036222"
down_revision: Union[str, None] = "353e72cce2b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "urls",
        "owner_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    # Only safe if no anonymous (owner_id IS NULL) rows exist — Postgres
    # will reject this ALTER with a NOT NULL violation otherwise, which is
    # the correct behavior: downgrading must not silently delete or
    # reassign real anonymous URLs.
    op.alter_column(
        "urls",
        "owner_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
