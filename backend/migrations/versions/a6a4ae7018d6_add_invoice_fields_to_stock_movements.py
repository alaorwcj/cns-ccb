"""add_invoice_fields_to_stock_movements

Revision ID: a6a4ae7018d6
Revises: a1b2c3d4e5f6
Create Date: 2025-12-10 15:04:53.603552

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a6a4ae7018d6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add invoice fields to stock_movements table
    op.add_column('stock_movements', sa.Column('invoice_number', sa.String(50), nullable=True))
    op.add_column('stock_movements', sa.Column('invoice_date', sa.Date(), nullable=True))


def downgrade() -> None:
    # Remove invoice fields from stock_movements table
    op.drop_column('stock_movements', 'invoice_date')
    op.drop_column('stock_movements', 'invoice_number')
