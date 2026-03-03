from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import User
from app.services.finance import cash_balance, debt_windows, kpis

router = APIRouter()


@router.get('/dashboard/kpis')
def get_kpis(startISO: date, endISO: date, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return kpis(db, user.id, startISO, endISO)


@router.get('/dashboard/balance')
def balance(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return {'balance': cash_balance(db, user.id)}


@router.get('/dashboard/debt')
def debt(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return debt_windows(db, user.id)
