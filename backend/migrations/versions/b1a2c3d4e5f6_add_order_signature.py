"""add order signature fields

Revision ID: b1a2c3d4e5f6
Revises: 05e6d51b8314
Create Date: 2025-10-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1a2c3d4e5f6'
down_revision = '05e6d51b8314'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('signed_by_id', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('signed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key('fk_orders_signed_by_users', 'orders', 'users', ['signed_by_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_orders_signed_by_users', 'orders', type_='foreignkey')
    op.drop_column('orders', 'signed_at')
    op.drop_column('orders', 'signed_by_id')
