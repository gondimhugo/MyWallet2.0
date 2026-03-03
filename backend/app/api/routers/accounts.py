from uuid import UUID

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Account, Card, User
from app.schemas.domain import AccountIn

logger = logging.getLogger(__name__)
router = APIRouter()


def serialize_account(row: Account) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "bank": row.bank,
        "account_type": row.account_type,
        "card_types": row.card_types.split(",") if row.card_types else [],
        "notes": row.notes or "",
        "credit_limit": row.credit_limit or 0,
        "close_day": row.close_day,
        "due_day": row.due_day,
        "balance": row.balance,
    }


def sync_credit_card(db: Session, user_id, account_name: str, card_types: list[str], close_day: int | None, due_day: int | None):
    has_credit = "Crédito" in card_types
    card = db.scalar(select(Card).where(and_(Card.user_id == user_id, Card.name == account_name)))

    if has_credit and close_day and due_day:
        if card:
            card.close_day = close_day
            card.due_day = due_day
        else:
            db.add(Card(user_id=user_id, name=account_name, close_day=close_day, due_day=due_day))
    elif card:
        db.delete(card)


@router.get("")
def list_accounts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(Account).where(Account.user_id == user.id)).all()
    return [serialize_account(r) for r in rows]


@router.post("")
def create_account(payload: AccountIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try:
        data = payload.model_dump()
        card_types = data.get("card_types", [])
        if isinstance(card_types, list):
            data["card_types"] = ",".join(card_types)

        row = Account(user_id=user.id, **data)
        db.add(row)
        sync_credit_card(db, user.id, row.name, card_types, payload.close_day, payload.due_day)

        db.commit()
        db.refresh(row)
        return serialize_account(row)
    except Exception as e:
        logger.exception("Error creating account")
        raise HTTPException(status_code=400, detail=f"create_account error: {e}")


@router.put("/{item_id}")
def update_account(item_id: UUID, payload: AccountIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Account, item_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Conta não encontrada")

    try:
        old_name = row.name
        data = payload.model_dump()
        card_types = data.get("card_types", [])
        if isinstance(card_types, list):
            data["card_types"] = ",".join(card_types)

        for k, v in data.items():
            setattr(row, k, v)

        if old_name != row.name:
            old_card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == old_name)))
            if old_card:
                old_card.name = row.name

        sync_credit_card(db, user.id, row.name, card_types, payload.close_day, payload.due_day)

        db.commit()
        db.refresh(row)
        return serialize_account(row)
    except Exception as e:
        logger.exception("Error updating account")
        raise HTTPException(status_code=400, detail=f"update_account error: {e}")


@router.delete("/{item_id}")
def delete_account(item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(Account, item_id)
    if row and row.user_id == user.id:
        card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == row.name)))
        if card:
            db.delete(card)
        db.delete(row)
        db.commit()
    return {"ok": True}
