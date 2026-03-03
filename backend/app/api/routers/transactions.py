import uuid
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Account, Card, Direction, Method, Transaction, TransactionKind, User
from app.schemas.domain import InstallmentIn, TransactionIn
from app.services.finance import compute_invoice

router = APIRouter()


def _is_credit(method) -> bool:
    return method in (Method.credito, "Crédito", "credito")


def _is_in(direction) -> bool:
    return direction in (Direction.entrada, "Entrada", "entrada")


def _is_out(direction) -> bool:
    return direction in (Direction.saida, "Saída", "saida")


def _is_normal(kind) -> bool:
    return kind in (TransactionKind.normal, "Normal", "normal")


def _is_invoice_payment(kind) -> bool:
    return kind in (TransactionKind.pagamento_fatura, "PagamentoFatura", "pagamento_fatura")


def _is_credit_purchase(tx: Transaction | dict) -> bool:
    return _is_credit(tx['method'] if isinstance(tx, dict) else tx.method) and _is_normal(tx['kind'] if isinstance(tx, dict) else tx.kind) and _is_out(tx['direction'] if isinstance(tx, dict) else tx.direction)


def enrich_credit(db: Session, user: User, tx: dict):
    if _is_credit_purchase(tx):
        card_name = tx.get('card') or tx.get('account')
        if not card_name:
            raise HTTPException(400, 'Conta/cartão de crédito não informado')

        card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == card_name)))
        if not card:
            account = db.scalar(select(Account).where(and_(Account.user_id == user.id, Account.name == card_name)))
            if not account or not account.close_day or not account.due_day:
                raise HTTPException(400, 'Configure fechamento e vencimento do crédito na conta antes de lançar compra no crédito')
            card = Card(user_id=user.id, name=card_name, close_day=account.close_day, due_day=account.due_day)
            db.add(card)
            db.flush()

        tx['card'] = card_name
        key, close, due = compute_invoice(card, tx['date'])
        tx['invoice_key'], tx['invoice_close_iso'], tx['invoice_due_iso'] = key, close, due
    return tx


def apply_account_balance(db: Session, user: User, tx: Transaction, reverse: bool = False):
    if not tx.account:
        return

    # Purchases in normal credit should not change cash balance now (only on invoice payment)
    if _is_credit_purchase(tx):
        return

    account = db.scalar(select(Account).where(and_(Account.user_id == user.id, Account.name == tx.account)))
    if not account:
        return

    delta = tx.amount if _is_in(tx.direction) else -tx.amount
    if reverse:
        delta *= -1

    account.balance = round((account.balance or 0) + delta, 2)


def apply_credit_usage(db: Session, user: User, tx: Transaction, reverse: bool = False):
    if not tx.card:
        return

    account = db.scalar(select(Account).where(and_(Account.user_id == user.id, Account.name == tx.card)))
    if not account:
        return

    delta = 0.0
    if _is_credit_purchase(tx):
        delta = tx.amount
    elif _is_invoice_payment(tx.kind) and _is_out(tx.direction):
        delta = -tx.amount

    if reverse:
        delta *= -1

    if delta == 0:
        return

    account.credit_used = max(0, round((account.credit_used or 0) + delta, 2))


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
    apply_account_balance(db, user, row)
    apply_credit_usage(db, user, row)
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
        apply_account_balance(db, user, row)
        apply_credit_usage(db, user, row)
        rows.append(row)
    db.commit()
    return rows


@router.delete('/transactions/{item_id}')
def delete_transaction(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Transaction, item_id)
    if row and row.user_id == user.id:
        apply_account_balance(db, user, row, reverse=True)
        apply_credit_usage(db, user, row, reverse=True)
        db.delete(row)
        db.commit()
    return {'ok': True}
