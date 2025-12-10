"""add_restrict_constraint_to_order_items_product_id

Revision ID: 709005ef27ca
Revises: b1a2c3d4e5f6
Create Date: 2025-12-03 01:25:21.344983

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '709005ef27ca'
down_revision = 'b1a2c3d4e5f6'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop the existing foreign key constraint
    op.drop_constraint('order_items_product_id_fkey', 'order_items', type_='foreignkey')
    
    # Recreate the constraint with ON DELETE RESTRICT
    op.create_foreign_key(
        'order_items_product_id_fkey',
        'order_items', 'products',
        ['product_id'], ['id'],
        ondelete='RESTRICT'
    )


def downgrade() -> None:
    # Drop the RESTRICT constraint
    op.drop_constraint('order_items_product_id_fkey', 'order_items', type_='foreignkey')
    
    # Recreate without ondelete (defaults to NO ACTION)
    op.create_foreign_key(
        'order_items_product_id_fkey',
        'order_items', 'products',
        ['product_id'], ['id']
    )
