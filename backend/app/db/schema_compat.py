from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


ACCOUNT_COLUMNS = {
    "bank": "TEXT NOT NULL DEFAULT ''",
    "account_type": "TEXT NOT NULL DEFAULT 'Corrente'",
    "card_types": "TEXT NOT NULL DEFAULT ''",
    "notes": "TEXT NOT NULL DEFAULT ''",
    "credit_limit": "FLOAT NOT NULL DEFAULT 0",
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
