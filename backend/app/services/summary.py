from datetime import date
from sqlmodel import Session, select
from sqlalchemy import func, case

from app.db.models import Transaction, TxType
from app.services.money import from_cents

def compute_summary(session: Session, from_date: date, to_date: date):
    q = select(Transaction).where(Transaction.date >= from_date, Transaction.date <= to_date)
    txs = session.exec(q).all()

    income = sum(t.amount_cents for t in txs if t.type == TxType.INCOME)
    expense = sum(t.amount_cents for t in txs if t.type == TxType.EXPENSE)
    net = income - expense

    # category breakdown (best-effort: compute in python for sqlite simplicity)
    by_cat: dict[str, int] = {}
    for t in txs:
        key = str(t.category_id) if t.category_id else "SEM_CATEGORIA"
        by_cat[key] = by_cat.get(key, 0) + (t.amount_cents if t.type == TxType.EXPENSE else 0)

    by_category = [{"category_id": k if k != "SEM_CATEGORIA" else None, "expense_total": from_cents(v)} for k, v in by_cat.items()]

    return {
        "income_total": from_cents(income),
        "expense_total": from_cents(expense),
        "net_total": from_cents(net),
        "by_category": by_category,
    }
