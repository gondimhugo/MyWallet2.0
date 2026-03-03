"""add account credit_used field

Revision ID: 0004_add_account_credit_used
Revises: 0003_add_account_credit_fields
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_add_account_credit_used"
down_revision = "0003_add_account_credit_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("credit_used", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("accounts", "credit_used")
