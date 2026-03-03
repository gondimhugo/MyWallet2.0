from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.deps import get_db, get_current_user
from app.db.models import Transaction, User
from app.schemas.transactions import TransactionCreate, TransactionRead, TransactionUpdate, SummaryResponse
from app.services.money import to_cents, from_cents
from app.services.summary import compute_summary

router = APIRouter()

def _to_read(t: Transaction) -> TransactionRead:
    return TransactionRead(
        id=t.id,
        date=t.date,
        amount=from_cents(t.amount_cents),
        type=t.type,
        status=t.status,
        description=t.description,
        category_id=t.category_id,
        account_id=t.account_id,
    )

@router.get("", response_model=list[TransactionRead])
def list_transactions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
):
    q = select(Transaction).order_by(Transaction.date.desc())
    if from_date:
        q = q.where(Transaction.date >= from_date)
    if to_date:
        q = q.where(Transaction.date <= to_date)
    txs = db.exec(q).all()
    return [_to_read(t) for t in txs]

@router.post("", response_model=TransactionRead)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = Transaction(
        date=payload.date,
        amount_cents=to_cents(payload.amount),
        type=payload.type,
        status=payload.status,
        description=payload.description,
        category_id=payload.category_id,
        account_id=payload.account_id,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_read(t)

@router.patch("/{tx_id}", response_model=TransactionRead)
def update_transaction(tx_id: str, payload: TransactionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    if payload.date is not None:
        t.date = payload.date
    if payload.amount is not None:
        t.amount_cents = to_cents(payload.amount)
    if payload.type is not None:
        t.type = payload.type
    if payload.status is not None:
        t.status = payload.status
    if payload.description is not None:
        t.description = payload.description
    if payload.category_id is not None:
        t.category_id = payload.category_id
    if payload.account_id is not None:
        t.account_id = payload.account_id

    db.add(t)
    db.commit()
    db.refresh(t)
    return _to_read(t)

@router.delete("/{tx_id}")
def delete_transaction(tx_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    t = db.get(Transaction, tx_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db.delete(t)
    db.commit()
    return {"message": "ok"}

@router.get("/summary", response_model=SummaryResponse)
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    from_date: date = Query(...),
    to_date: date = Query(...),
):
    s = compute_summary(db, from_date, to_date)
    return SummaryResponse(
        from_date=from_date,
        to_date=to_date,
        income_total=s["income_total"],
        expense_total=s["expense_total"],
        net_total=s["net_total"],
        by_category=s["by_category"],
    )
