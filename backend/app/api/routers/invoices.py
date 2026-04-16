from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.api.routers.transactions import apply_account_balance, apply_credit_usage, _resolve_account
from app.db.models import Card, Direction, Method, Transaction, TransactionKind, User
from app.api.routers.transactions import apply_account_balance, apply_credit_usage
from app.services.finance import clamp_day, invoice_index

router = APIRouter()


class PayInvoiceIn(BaseModel):
    card: str = ""
    card_account_id: UUID | None = None
    invoice_key: str
    amount: float
    account: str = ""
    account_id: UUID | None = None
    method: Method = Method.pix


class ReassignInvoiceIn(BaseModel):
    invoice_key: str
    target_month: str  # formato 'YYYY-MM'


@router.get('/invoices')
def invoices(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return invoice_index(db, user.id)


@router.post('/invoices/pay')
def pay(payload: PayInvoiceIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    inv = next((x for x in invoice_index(db, user.id) if x['invoice_key'] == payload.invoice_key), None)
    if not inv:
        raise HTTPException(404, 'Fatura não encontrada')

    debit_account = _resolve_account(db, user, account_id=payload.account_id, account_name=payload.account)
    if not debit_account:
        raise HTTPException(400, 'Conta de débito não encontrada')

    credit_account = _resolve_account(db, user, account_id=payload.card_account_id, account_name=payload.card or inv['card'])
    if not credit_account:
        raise HTTPException(400, 'Conta de crédito da fatura não encontrada')

    tx = Transaction(
        user_id=user.id,
        date=date.today(),
        direction=Direction.saida,
        amount=payload.amount,
        method=payload.method,
        account=debit_account.name,
        account_id=debit_account.id,
        card=credit_account.name,
        card_account_id=credit_account.id,
        kind=TransactionKind.pagamento_fatura,
        description=f'Pagamento {payload.invoice_key}',
        invoice_key=payload.invoice_key,
        invoice_due_iso=inv['invoice_due_iso'],
    )
    db.add(tx)
    apply_account_balance(db, user, tx)
    apply_credit_usage(db, user, tx)
    db.commit()
    return {'ok': True}


@router.post('/invoices/reassign')
def reassign(payload: ReassignInvoiceIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try:
        parts = payload.target_month.split('-')
        if len(parts) != 2:
            raise ValueError()
        target_year = int(parts[0])
        target_month = int(parts[1])
        if not 1 <= target_month <= 12 or target_year < 1970:
            raise ValueError()
    except ValueError:
        raise HTTPException(400, 'Mês alvo inválido. Use o formato YYYY-MM.')

    txs = db.scalars(
        select(Transaction).where(
            and_(
                Transaction.user_id == user.id,
                Transaction.invoice_key == payload.invoice_key,
            )
        )
    ).all()

    if not txs:
        raise HTTPException(404, 'Fatura não encontrada')

    ref = next((t for t in txs if t.card_account_id or t.card), txs[0])
    credit_account = _resolve_account(db, user, account_id=ref.card_account_id, account_name=ref.card)
    close_day = credit_account.close_day if credit_account else None
    due_day = credit_account.due_day if credit_account else None

    if (not close_day or not due_day) and ref.card:
        card = db.scalar(
            select(Card).where(and_(Card.user_id == user.id, Card.name == ref.card))
        )
        if card:
            close_day = close_day or card.close_day
            due_day = due_day or card.due_day

    if not close_day or not due_day:
        raise HTTPException(
            400,
            'Não foi possível determinar fechamento/vencimento do cartão. Configure a conta de crédito antes de mover a fatura.',
        )

    new_due = clamp_day(target_year, target_month, due_day)
    prev_year = target_year if target_month > 1 else target_year - 1
    prev_month = target_month - 1 if target_month > 1 else 12
    new_close = clamp_day(prev_year, prev_month, close_day)

    card_name = payload.invoice_key.rsplit('|', 1)[0] if '|' in payload.invoice_key else (ref.card or '')
    new_key = f"{card_name}|{new_due.strftime('%Y-%m')}"

    for tx in txs:
        tx.invoice_key = new_key
        tx.invoice_close_iso = new_close.isoformat()
        tx.invoice_due_iso = new_due.isoformat()

    db.commit()
    return {
        'ok': True,
        'invoice_key': new_key,
        'invoice_close_iso': new_close.isoformat(),
        'invoice_due_iso': new_due.isoformat(),
    }
