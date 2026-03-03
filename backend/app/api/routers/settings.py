import csv
import io

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Account, Card, Transaction, User

router = APIRouter()


@router.get('/settings/export-csv')
def export_csv(db: Session = Depends(get_db), user: User = Depends(current_user)):
    txs = db.query(Transaction).filter(Transaction.user_id == user.id).all()
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(['date', 'direction', 'amount', 'method', 'account', 'card', 'kind', 'category', 'subcategory', 'description', 'notes'])
    for t in txs:
        w.writerow([t.date, t.direction.value, t.amount, t.method.value, t.account, t.card, t.kind.value, t.category, t.subcategory, t.description, t.notes])
    return StreamingResponse(iter([out.getvalue()]), media_type='text/csv')


@router.post('/settings/import-csv')
def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(current_user)):
    return {'message': f'Import recebido: {file.filename}'}


@router.post('/settings/reset')
def reset(db: Session = Depends(get_db), user: User = Depends(current_user)):
    db.execute(delete(Transaction).where(Transaction.user_id == user.id))
    db.execute(delete(Account).where(Account.user_id == user.id))
    db.execute(delete(Card).where(Card.user_id == user.id))
    db.commit()
    return {'ok': True}
