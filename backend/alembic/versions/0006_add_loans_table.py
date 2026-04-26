"""add loans table for planning loans tracking

Revision ID: 0006_add_loans_table
Revises: 0005_user_password_reset_fields
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0006_add_loans_table"
down_revision = "0005_user_password_reset_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "loans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("direction", sa.String(20), nullable=False, server_default="taken"),
        sa.Column("counterparty", sa.String(120), nullable=False, server_default=""),
        sa.Column("principal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("interest_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("interest_mode", sa.String(20), nullable=False, server_default="simple"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("repaid_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "linked_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_loans_user_id", "loans", ["user_id"])
    op.create_index("ix_loans_direction", "loans", ["direction"])
    op.create_index("ix_loans_status", "loans", ["status"])
    op.create_index("ix_loans_start_date", "loans", ["start_date"])
    op.create_index("ix_loans_due_date", "loans", ["due_date"])


def downgrade() -> None:
    op.drop_index("ix_loans_due_date", table_name="loans")
    op.drop_index("ix_loans_start_date", table_name="loans")
    op.drop_index("ix_loans_status", table_name="loans")
    op.drop_index("ix_loans_direction", table_name="loans")
    op.drop_index("ix_loans_user_id", table_name="loans")
    op.drop_table("loans")
