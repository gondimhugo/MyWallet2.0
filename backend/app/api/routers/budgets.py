from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Budget, Direction, Transaction, TransactionKind, Method, User
from app.schemas.domain import BudgetIn, BudgetOut, BudgetProgress

router = APIRouter(prefix="/budgets", tags=["budgets"])


def _spending_by_category(db: Session, user_id: UUID, month: str) -> dict[str, float]:
    """Sum of expense transactions grouped by category for a given YYYY-MM month."""
    year, mon = int(month[:4]), int(month[5:7])
    from datetime import date
    import calendar
    last_day = calendar.monthrange(year, mon)[1]
    start = date(year, mon, 1)
    end = date(year, mon, last_day)

    rows = db.execute(
        select(Transaction.category, func.sum(Transaction.amount))
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.direction == Direction.saida,
                Transaction.date >= start,
                Transaction.date <= end,
                Transaction.kind == TransactionKind.normal,
            )
        )
        .group_by(Transaction.category)
    ).all()

    return {row[0]: row[1] for row in rows if row[0]}


def _to_progress(budget: Budget, spending: dict[str, float]) -> BudgetProgress:
    spent = spending.get(budget.category, 0.0)
    remaining = budget.amount_limit - spent
    pct = min((spent / budget.amount_limit * 100) if budget.amount_limit > 0 else 0.0, 100.0)
    return BudgetProgress(
        id=budget.id,
        category=budget.category,
        month=budget.month,
        amount_limit=budget.amount_limit,
        spent=spent,
        remaining=remaining,
        pct=pct,
    )


@router.get("", response_model=list[BudgetProgress])
def list_budgets(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    budgets = db.scalars(
        select(Budget)
        .where(and_(Budget.user_id == user.id, Budget.month == month))
        .order_by(Budget.category)
    ).all()
    spending = _spending_by_category(db, user.id, month)
    return [_to_progress(b, spending) for b in budgets]


@router.get("/categories", response_model=list[str])
def list_used_categories(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    """Return distinct non-empty categories from the user's transactions."""
    rows = db.execute(
        select(Transaction.category)
        .where(
            and_(
                Transaction.user_id == user.id,
                Transaction.direction == Direction.saida,
                Transaction.kind == TransactionKind.normal,
                Transaction.category != "",
            )
        )
        .distinct()
        .order_by(Transaction.category)
    ).scalars().all()
    return list(rows)


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(
    payload: BudgetIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    existing = db.scalar(
        select(Budget).where(
            and_(
                Budget.user_id == user.id,
                Budget.category == payload.category,
                Budget.month == payload.month,
            )
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="Orçamento já existe para esta categoria e mês")

    budget = Budget(
        user_id=user.id,
        category=payload.category.strip(),
        month=payload.month,
        amount_limit=payload.amount_limit,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: UUID,
    payload: BudgetIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    budget = db.scalar(select(Budget).where(and_(Budget.id == budget_id, Budget.user_id == user.id)))
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")

    conflict = db.scalar(
        select(Budget).where(
            and_(
                Budget.user_id == user.id,
                Budget.category == payload.category,
                Budget.month == payload.month,
                Budget.id != budget_id,
            )
        )
    )
    if conflict:
        raise HTTPException(status_code=409, detail="Orçamento já existe para esta categoria e mês")

    budget.category = payload.category.strip()
    budget.month = payload.month
    budget.amount_limit = payload.amount_limit
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    budget = db.scalar(select(Budget).where(and_(Budget.id == budget_id, Budget.user_id == user.id)))
    if not budget:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    db.delete(budget)
    db.commit()
