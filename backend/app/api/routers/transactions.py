import uuid
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Card, Method, Transaction, TransactionKind, User
from app.schemas.domain import InstallmentIn, TransactionIn
from app.services.finance import compute_invoice

router = APIRouter()


def enrich_credit(db: Session, user: User, tx: dict):
    if tx['method'] == Method.credito and tx['kind'] == TransactionKind.normal and tx['direction'].value == 'Saída':
        card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == tx['card'])))
        if not card:
            raise HTTPException(400, 'Cartão não encontrado para compra no crédito')
        key, close, due = compute_invoice(card, tx['date'])
        tx['invoice_key'], tx['invoice_close_iso'], tx['invoice_due_iso'] = key, close, due
    return tx


@router.get('/transactions')
def list_transactions(startISO: date | None = None, endISO: date | None = None, q: str | None = None, method: str | None = None, direction: str | None = None, account: str | None = None, card: str | None = None, db: Session = Depends(get_db), user: User = Depends(current_user)):
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if startISO:
        stmt = stmt.where(Transaction.date >= startISO)
    if endISO:
        stmt = stmt.where(Transaction.date <= endISO)
    if method:
        stmt = stmt.where(Transaction.method == method)
    if direction:
        stmt = stmt.where(Transaction.direction == direction)
    if account:
        stmt = stmt.where(Transaction.account == account)
    if card:
        stmt = stmt.where(Transaction.card == card)
    if q:
        stmt = stmt.where(Transaction.description.ilike(f'%{q}%'))
    return db.scalars(stmt.order_by(Transaction.date.desc())).all()


@router.post('/transactions')
def create_transaction(payload: TransactionIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    data = enrich_credit(db, user, payload.model_dump())
    row = Transaction(user_id=user.id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post('/transactions/installments')
def installments(payload: InstallmentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if payload.installment_count < 2:
        raise HTTPException(400, 'parcelas deve ser >=2')
    group_id = uuid.uuid4()
    rows = []
    for i in range(payload.installment_count):
        data = payload.model_dump(exclude={'installment_count'})
        data['amount'] = round(payload.amount / payload.installment_count, 2)
        data['date'] = date(payload.date.year + ((payload.date.month + i - 1) // 12), ((payload.date.month + i - 1) % 12) + 1, min(payload.date.day, 28))
        data = enrich_credit(db, user, data)
        row = Transaction(user_id=user.id, installment_group_id=group_id, installment_index=i + 1, installment_count=payload.installment_count, purchase_total=payload.amount, **data)
        db.add(row)
        rows.append(row)
    db.commit()
    return rows


@router.delete('/transactions/{item_id}')
def delete_transaction(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Transaction, item_id)
    if row and row.user_id == user.id:
        db.delete(row)
        db.commit()
    return {'ok': True}
