"""create_inventory_system

Revision ID: 7f5873250c03
Revises: 72365e448406
Create Date: 2025-12-10 16:42:15.001810

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f5873250c03'
down_revision = '72365e448406'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create inventory_counts table
    op.create_table(
        'inventory_counts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('finalized_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_counts_id'), 'inventory_counts', ['id'], unique=False)
    op.create_index(op.f('ix_inventory_counts_status'), 'inventory_counts', ['status'], unique=False)
    
    # Create inventory_items table
    op.create_table(
        'inventory_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inventory_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('expected_qty', sa.Integer(), nullable=False),
        sa.Column('counted_qty', sa.Integer(), nullable=True),
        sa.Column('difference', sa.Integer(), nullable=True),
        sa.Column('adjusted', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventory_counts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_inventory_items_id'), 'inventory_items', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_inventory_items_id'), table_name='inventory_items')
    op.drop_table('inventory_items')
    op.drop_index(op.f('ix_inventory_counts_status'), table_name='inventory_counts')
    op.drop_index(op.f('ix_inventory_counts_id'), table_name='inventory_counts')
    op.drop_table('inventory_counts')
