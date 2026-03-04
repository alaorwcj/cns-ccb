"""add max_qty_per_order to products

Revision ID: c2d3e4f5g6h7
Revises: a7f7b8b78a7f
Create Date: 2026-03-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c2d3e4f5g6h7'
down_revision = 'a7f7b8b78a7f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('max_qty_per_order', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('products', 'max_qty_per_order')
