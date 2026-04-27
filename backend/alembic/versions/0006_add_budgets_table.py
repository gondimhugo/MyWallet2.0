"""add budgets table

Revision ID: 0006_add_budgets_table
Revises: 0005_user_password_reset_fields
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "0006_add_budgets_table"
down_revision = "0005_user_password_reset_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "budgets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(120), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("amount_limit", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])
    op.create_index("ix_budgets_category", "budgets", ["category"])
    op.create_index("ix_budgets_month", "budgets", ["month"])
    op.create_unique_constraint("uq_budgets_user_category_month", "budgets", ["user_id", "category", "month"])


def downgrade() -> None:
    op.drop_constraint("uq_budgets_user_category_month", "budgets", type_="unique")
    op.drop_index("ix_budgets_month", table_name="budgets")
    op.drop_index("ix_budgets_category", table_name="budgets")
    op.drop_index("ix_budgets_user_id", table_name="budgets")
    op.drop_table("budgets")
