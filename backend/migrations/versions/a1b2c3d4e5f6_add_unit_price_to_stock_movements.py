"""add_unit_price_to_stock_movements

Revision ID: a1b2c3d4e5f6
Revises: 709005ef27ca
Create Date: 2025-12-10 02:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '709005ef27ca'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('stock_movements', sa.Column('unit_price', sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('stock_movements', 'unit_price')
