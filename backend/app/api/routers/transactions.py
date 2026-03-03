import logging
import uuid
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import (
    Account,
    Card,
    Direction,
    Method,
    Transaction,
    TransactionKind,
    User,
)
from app.schemas.domain import InstallmentIn, TransactionIn
from app.services.finance import compute_invoice

router = APIRouter()
logger = logging.getLogger(__name__)


def _is_credit(method) -> bool:
    return method in (Method.credito, "Crédito", "credito")


def _is_in(direction) -> bool:
    return direction in (Direction.entrada, "Entrada", "entrada")


def _is_out(direction) -> bool:
    return direction in (Direction.saida, "Saída", "saida")


def _is_normal(kind) -> bool:
    return kind in (TransactionKind.normal, "Normal", "normal")


def _is_invoice_payment(kind) -> bool:
    return kind in (
        TransactionKind.pagamento_fatura,
        "PagamentoFatura",
        "pagamento_fatura",
    )


def _is_credit_purchase(tx: Transaction | dict) -> bool:
    return (
        _is_credit(tx["method"] if isinstance(tx, dict) else tx.method)
        and _is_normal(tx["kind"] if isinstance(tx, dict) else tx.kind)
        and _is_out(tx["direction"] if isinstance(tx, dict) else tx.direction)
    )


def _resolve_account(db: Session, user: User, account_id: UUID | None = None, account_name: str | None = None) -> Account | None:
    if account_id:
        acc = db.get(Account, account_id)
        if acc and acc.user_id == user.id:
            return acc
    if account_name:
        return db.scalar(select(Account).where(and_(Account.user_id == user.id, Account.name == account_name)))
    return None


def enrich_credit(db: Session, user: User, tx: dict):
    account_name = tx.get('account')
    account_id = tx.get('account_id')
    card_name = tx.get('card')
    card_account_id = tx.get('card_account_id')

    if account_id and not account_name:
        account = _resolve_account(db, user, account_id=account_id)
        if account:
            tx['account'] = account.name
            account_name = account.name

    if card_account_id and not card_name:
        card_account = _resolve_account(db, user, account_id=card_account_id)
        if card_account:
            tx['card'] = card_account.name
            card_name = card_account.name

    if _is_invoice_payment(tx.get('kind')) and _is_out(tx.get('direction')) and not (card_name or card_account_id):
        raise HTTPException(400, 'Pagamento de fatura exige informar a conta/cartão de crédito (card_account_id ou card)')

    if _is_credit_purchase(tx):
        credit_account = _resolve_account(db, user, account_id=card_account_id, account_name=card_name or account_name)
        if not credit_account:
            raise HTTPException(400, 'Conta/cartão de crédito não encontrado')

        if not credit_account.close_day or not credit_account.due_day:
            raise HTTPException(400, 'Configure fechamento e vencimento do crédito na conta antes de lançar compra no crédito')

        tx['card_account_id'] = credit_account.id
        tx['card'] = credit_account.name

        if not tx.get('account'):
            tx['account'] = credit_account.name
        if not tx.get('account_id'):
            tx['account_id'] = credit_account.id

        card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == credit_account.name)))
        if not card:
            card = Card(user_id=user.id, name=credit_account.name, close_day=credit_account.close_day, due_day=credit_account.due_day)
            db.add(card)
            db.flush()

        key, close, due = compute_invoice(card, tx['date'])
        tx['invoice_key'], tx['invoice_close_iso'], tx['invoice_due_iso'] = key, close, due

    return tx


def apply_account_balance(db: Session, user: User, tx: Transaction, reverse: bool = False):
    if _is_credit_purchase(tx):
        return

    account = _resolve_account(db, user, account_id=tx.account_id, account_name=tx.account)
    if not account:
        logger.info('apply_account_balance skipped: account not found tx_id=%s account_id=%s account=%s', tx.id, tx.account_id, tx.account)
        return

    delta = tx.amount if _is_in(tx.direction) else -tx.amount
    if reverse:
        delta *= -1

    account.balance = round((account.balance or 0) + delta, 2)


def apply_credit_usage(db: Session, user: User, tx: Transaction, reverse: bool = False):
    account = _resolve_account(db, user, account_id=tx.card_account_id, account_name=tx.card)
    if not account:
        logger.info('apply_credit_usage skipped: card account not found tx_id=%s card_account_id=%s card=%s', tx.id, tx.card_account_id, tx.card)
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


@router.get("/transactions")
def list_transactions(
    startISO: date | None = None,
    endISO: date | None = None,
    q: str | None = None,
    method: str | None = None,
    direction: str | None = None,
    account: str | None = None,
    card: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
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
        stmt = stmt.where(Transaction.description.ilike(f"%{q}%"))
    return db.scalars(stmt.order_by(Transaction.date.desc())).all()


@router.post("/transactions")
def create_transaction(
    payload: TransactionIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    data = enrich_credit(db, user, payload.model_dump())
    row = Transaction(user_id=user.id, **data)
    db.add(row)
    apply_account_balance(db, user, row)
    apply_credit_usage(db, user, row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/transactions/installments")
def installments(
    payload: InstallmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if payload.installment_count < 2:
        raise HTTPException(400, "parcelas deve ser >=2")
    group_id = uuid.uuid4()
    rows = []
    for i in range(payload.installment_count):
        data = payload.model_dump(exclude={"installment_count"})
        data["amount"] = round(payload.amount / payload.installment_count, 2)
        data["date"] = date(
            payload.date.year + ((payload.date.month + i - 1) // 12),
            ((payload.date.month + i - 1) % 12) + 1,
            min(payload.date.day, 28),
        )
        data = enrich_credit(db, user, data)
        row = Transaction(
            user_id=user.id,
            installment_group_id=group_id,
            installment_index=i + 1,
            installment_count=payload.installment_count,
            purchase_total=payload.amount,
            **data,
        )
        db.add(row)
        apply_account_balance(db, user, row)
        apply_credit_usage(db, user, row)
        rows.append(row)
    db.commit()
    return rows


@router.delete("/transactions/{item_id}")
def delete_transaction(
    item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    row = db.get(Transaction, item_id)
    if row and row.user_id == user.id:
        apply_account_balance(db, user, row, reverse=True)
        apply_credit_usage(db, user, row, reverse=True)
        db.delete(row)
        db.commit()
    return {"ok": True}
