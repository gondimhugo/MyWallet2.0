"""add account notes/credit fields

Revision ID: 0003_add_account_credit_fields
Revises: 0002_add_account_fields
Create Date: 2026-03-03
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_account_credit_fields"
down_revision = "0002_add_account_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("accounts", sa.Column("notes", sa.Text(), nullable=False, server_default=""))
    op.add_column("accounts", sa.Column("credit_limit", sa.Float(), nullable=False, server_default="0"))
    op.add_column("accounts", sa.Column("close_day", sa.Integer(), nullable=True))
    op.add_column("accounts", sa.Column("due_day", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("accounts", "due_day")
    op.drop_column("accounts", "close_day")
    op.drop_column("accounts", "credit_limit")
    op.drop_column("accounts", "notes")
