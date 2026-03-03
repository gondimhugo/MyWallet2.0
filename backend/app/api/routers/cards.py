from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Card, User
from app.schemas.domain import CardIn

router = APIRouter()


@router.get('/cards')
def list_cards(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return db.scalars(select(Card).where(Card.user_id == user.id)).all()


@router.post('/cards')
def create_card(payload: CardIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = Card(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put('/cards/{item_id}')
def update_card(item_id: UUID, payload: CardIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Card, item_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, 'Cartão não encontrado')
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return row


@router.delete('/cards/{item_id}')
def delete_card(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Card, item_id)
    if row and row.user_id == user.id:
        db.delete(row)
        db.commit()
    return {"ok": True}
