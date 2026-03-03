from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Direction, Method, Transaction, TransactionKind, User
from app.services.finance import invoice_index

router = APIRouter()


class PayInvoiceIn(BaseModel):
    card: str
    invoice_key: str
    amount: float
    account: str
    method: Method = Method.pix


@router.get('/invoices')
def invoices(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return invoice_index(db, user.id)


@router.post('/invoices/pay')
def pay(payload: PayInvoiceIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    inv = next((x for x in invoice_index(db, user.id) if x['invoice_key'] == payload.invoice_key), None)
    if not inv:
        raise HTTPException(404, 'Fatura não encontrada')
    tx = Transaction(user_id=user.id, date=date.today(), direction=Direction.saida, amount=payload.amount, method=payload.method, account=payload.account, card=payload.card, kind=TransactionKind.pagamento_fatura, description=f'Pagamento {payload.invoice_key}', invoice_key=payload.invoice_key, invoice_due_iso=inv['invoice_due_iso'])
    db.add(tx)
    db.commit()
    return {'ok': True}
