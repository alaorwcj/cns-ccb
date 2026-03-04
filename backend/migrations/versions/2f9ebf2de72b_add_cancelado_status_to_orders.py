"""add_cancelado_status_to_orders

Revision ID: 2f9ebf2de72b
Revises: 7f5873250c03
Create Date: 2025-12-10 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f9ebf2de72b'
down_revision: Union[str, None] = '7f5873250c03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add CANCELADO to the order_status enum
    op.execute("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELADO'")


def downgrade() -> None:
    # Cannot remove enum value in PostgreSQL easily
    pass
