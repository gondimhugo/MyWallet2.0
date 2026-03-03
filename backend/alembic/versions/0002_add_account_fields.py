"""add account fields (bank, account_type, card_types)

Revision ID: 0002_add_account_fields
Revises: 0001_init
Create Date: 2026-03-03

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_add_account_fields"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to accounts table
    op.add_column(
        "accounts", sa.Column("bank", sa.String(120), nullable=False, server_default="")
    )
    op.add_column(
        "accounts",
        sa.Column(
            "account_type", sa.String(50), nullable=False, server_default="Corrente"
        ),
    )
    op.add_column(
        "accounts",
        sa.Column("card_types", sa.String(255), nullable=False, server_default=""),
    )


def downgrade() -> None:
    # Remove columns from accounts table
    op.drop_column("accounts", "card_types")
    op.drop_column("accounts", "account_type")
    op.drop_column("accounts", "bank")
