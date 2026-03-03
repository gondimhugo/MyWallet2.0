from sqlalchemy import create_engine, inspect, text

from app.db.schema_compat import ensure_accounts_columns


def test_ensure_accounts_columns_adds_missing_fields():
    engine = create_engine('sqlite+pysqlite:///:memory:', future=True)

    with engine.begin() as conn:
        conn.execute(
            text(
                'CREATE TABLE accounts (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, balance FLOAT)'
            )
        )

    ensure_accounts_columns(engine)

    cols = {c['name'] for c in inspect(engine).get_columns('accounts')}
    assert {'id', 'user_id', 'name', 'balance', 'bank', 'account_type', 'card_types', 'notes', 'credit_limit', 'credit_used', 'close_day', 'due_day'}.issubset(cols)
