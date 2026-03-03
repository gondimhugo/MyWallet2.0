from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Account, User
from app.schemas.domain import AccountIn

router = APIRouter()


@router.get('/accounts')
def list_accounts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Account).where(Account.user_id == user.id)).all()


@router.post('/accounts')
def create_account(payload: AccountIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = Account(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put('/accounts/{item_id}')
def update_account(item_id: UUID, payload: AccountIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Account, item_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, 'Conta não encontrada')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@router.delete('/accounts/{item_id}')
def delete_account(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Account, item_id)
    if row and row.user_id == user.id:
        db.delete(row)
        db.commit()
    return {"ok": True}
