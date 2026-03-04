"""add_signed_receipt_path_to_orders

Revision ID: 72365e448406
Revises: a7f7b8b78a7f
Create Date: 2025-12-10 15:58:25.372464

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '72365e448406'
down_revision = 'a7f7b8b78a7f'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add signed_receipt_path column to orders table
    op.add_column('orders', sa.Column('signed_receipt_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove signed_receipt_path column from orders table
    op.drop_column('orders', 'signed_receipt_path')
