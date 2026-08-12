"""add browser/operating_system/device_type columns to url_clicks

Revision ID: 353e72cce2b1
Revises: 373609d1d2df
Create Date: 2025-01-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "353e72cce2b1"
down_revision: Union[str, None] = "373609d1d2df"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("url_clicks", sa.Column("browser", sa.String(length=64), nullable=True))
    op.add_column(
        "url_clicks", sa.Column("operating_system", sa.String(length=64), nullable=True)
    )
    op.add_column("url_clicks", sa.Column("device_type", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("url_clicks", "device_type")
    op.drop_column("url_clicks", "operating_system")
    op.drop_column("url_clicks", "browser")
