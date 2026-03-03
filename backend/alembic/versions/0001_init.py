"""init"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users', sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True), sa.Column('email', sa.String(255), nullable=False), sa.Column('password_hash', sa.String(255), nullable=False), sa.Column('full_name', sa.String(120), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')))
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_table('accounts', sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True), sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')), sa.Column('name', sa.String(120)), sa.Column('balance', sa.Float()))
    op.create_table('cards', sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True), sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')), sa.Column('name', sa.String(120)), sa.Column('close_day', sa.Integer()), sa.Column('due_day', sa.Integer()))
    op.create_table('salary_profiles', sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True), sa.Column('monthly_salary', sa.Float()), sa.Column('mode', sa.String(20)), sa.Column('day1', sa.Integer()), sa.Column('day2', sa.Integer(), nullable=True), sa.Column('amount1', sa.Float(), nullable=True), sa.Column('amount2', sa.Float(), nullable=True), sa.Column('default_method', sa.String(20)), sa.Column('default_account', sa.String(120)))
    op.create_table('transactions', sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True), sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE')), sa.Column('date', sa.Date(), index=True), sa.Column('direction', sa.String(20)), sa.Column('amount', sa.Float()), sa.Column('method', sa.String(20)), sa.Column('account', sa.String(120)), sa.Column('card', sa.String(120)), sa.Column('kind', sa.String(40)), sa.Column('category', sa.String(120)), sa.Column('subcategory', sa.String(120)), sa.Column('description', sa.String(255)), sa.Column('notes', sa.Text()), sa.Column('invoice_key', sa.String(100)), sa.Column('invoice_close_iso', sa.String(20)), sa.Column('invoice_due_iso', sa.String(20)), sa.Column('installment_group_id', postgresql.UUID(as_uuid=True), nullable=True), sa.Column('installment_index', sa.Integer(), nullable=True), sa.Column('installment_count', sa.Integer(), nullable=True), sa.Column('purchase_total', sa.Float(), nullable=True), sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')))


def downgrade() -> None:
    op.drop_table('transactions')
    op.drop_table('salary_profiles')
    op.drop_table('cards')
    op.drop_table('accounts')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
