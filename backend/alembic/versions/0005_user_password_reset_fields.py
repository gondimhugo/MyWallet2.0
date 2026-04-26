"""add password reset and last login fields to users

Revision ID: 0005_user_password_reset_fields
Revises: 0004_add_account_credit_used
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_user_password_reset_fields"
down_revision = "0004_add_account_credit_used"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_reset_token_hash", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_users_password_reset_token_hash",
        "users",
        ["password_reset_token_hash"],
    )


def downgrade() -> None:
    op.drop_index("ix_users_password_reset_token_hash", table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token_hash")
