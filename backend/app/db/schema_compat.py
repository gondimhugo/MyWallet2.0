from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


ACCOUNT_COLUMNS = {
    "bank": "TEXT NOT NULL DEFAULT ''",
    "account_type": "TEXT NOT NULL DEFAULT 'Corrente'",
    "card_types": "TEXT NOT NULL DEFAULT ''",
    "notes": "TEXT NOT NULL DEFAULT ''",
    "credit_limit": "FLOAT NOT NULL DEFAULT 0",
    "credit_used": "FLOAT NOT NULL DEFAULT 0",
    "close_day": "INTEGER",
    "due_day": "INTEGER",
}


def ensure_accounts_columns(engine: Engine) -> None:
    """Adds account columns introduced after initial release when missing."""
    inspector = inspect(engine)
    if "accounts" not in inspector.get_table_names():
        return

    current_columns = {col["name"] for col in inspector.get_columns("accounts")}
    missing = [(name, ddl) for name, ddl in ACCOUNT_COLUMNS.items() if name not in current_columns]
    if not missing:
        return

    with engine.begin() as conn:
        for name, ddl in missing:
            conn.execute(text(f"ALTER TABLE accounts ADD COLUMN {name} {ddl}"))


TRANSACTION_COLUMNS = {
    "account_id": "TEXT",
    "card_account_id": "TEXT",
}


def ensure_transactions_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    if "transactions" not in inspector.get_table_names():
        return

    current_columns = {col["name"] for col in inspector.get_columns("transactions")}
    missing = [(name, ddl) for name, ddl in TRANSACTION_COLUMNS.items() if name not in current_columns]
    if not missing:
        return

    with engine.begin() as conn:
        for name, ddl in missing:
            conn.execute(text(f"ALTER TABLE transactions ADD COLUMN {name} {ddl}"))


USER_COLUMNS = {
    "password_reset_token_hash": "VARCHAR(128)",
    "password_reset_expires_at": "TIMESTAMP",
    "last_login_at": "TIMESTAMP",
}


def ensure_users_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    current_columns = {col["name"] for col in inspector.get_columns("users")}
    missing = [(name, ddl) for name, ddl in USER_COLUMNS.items() if name not in current_columns]
    if not missing:
        return

    with engine.begin() as conn:
        for name, ddl in missing:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))
