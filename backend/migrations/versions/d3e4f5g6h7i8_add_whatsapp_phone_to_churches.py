"""add whatsapp_phone to churches

Revision ID: d3e4f5g6h7i8
Revises: 2f9ebf2de72b, c2d3e4f5g6h7
Create Date: 2026-03-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3e4f5g6h7i8'
down_revision = ('2f9ebf2de72b', 'c2d3e4f5g6h7')
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('churches', sa.Column('whatsapp_phone', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('churches', 'whatsapp_phone')
