from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.api.routers.transactions import apply_account_balance, apply_credit_usage, _resolve_account
from app.db.models import Direction, Method, Transaction, TransactionKind, User
from app.services.finance import invoice_index

router = APIRouter()


class PayInvoiceIn(BaseModel):
    card: str = ""
    card_account_id: UUID | None = None
    invoice_key: str
    amount: float
    account: str = ""
    account_id: UUID | None = None
    method: Method = Method.pix


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
