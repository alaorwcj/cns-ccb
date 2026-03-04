"""merge_heads

Revision ID: a7f7b8b78a7f
Revises: 2a1af7bed932, a6a4ae7018d6
Create Date: 2025-12-10 15:18:35.475491

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7f7b8b78a7f'
down_revision = ('2a1af7bed932', 'a6a4ae7018d6')
branch_labels = None
depends_on = None

def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
