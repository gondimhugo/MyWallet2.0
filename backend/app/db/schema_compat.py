from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


ACCOUNT_COLUMNS = {
    "bank": "TEXT NOT NULL DEFAULT ''",
    "account_type": "TEXT NOT NULL DEFAULT 'Corrente'",
    "card_types": "TEXT NOT NULL DEFAULT ''",
}


def ensure_accounts_columns(engine: Engine) -> None:
    """Adds account columns introduced after initial release when missing.

    This helps local/dev databases created before Alembic migration 0002.
    """
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
