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


def _valid_cycle_day(day: int | None) -> bool:
    return day is not None and 1 <= day <= 31


def serialize_account(row: Account, card: Card | None = None) -> dict:
    used = row.credit_used or 0
    limit = row.credit_limit or 0
    close_day = row.close_day or (card.close_day if card else None)
    due_day = row.due_day or (card.due_day if card else None)
    card_types = row.card_types.split(",") if row.card_types else []

    if limit > 0 and "Crédito" not in card_types:
        card_types.append("Crédito")

    return {
        "id": row.id,
        "name": row.name,
        "bank": row.bank,
        "account_type": row.account_type,
        "card_types": card_types,
        "notes": row.notes or "",
        "credit_limit": limit,
        "credit_used": used,
        "credit_available": round(limit - used, 2),
        "close_day": close_day,
        "due_day": due_day,
        "balance": row.balance,
    }


def normalize_credit_fields(payload: AccountIn, card_types: list[str]) -> tuple[bool, int | None, int | None]:
    credit_enabled = ("Crédito" in card_types) or (payload.credit_limit > 0)
    close_day = payload.close_day
    due_day = payload.due_day

    if credit_enabled:
        if "Crédito" not in card_types:
            card_types.append("Crédito")
        if payload.credit_limit <= 0:
            raise HTTPException(status_code=400, detail="Informe um limite de crédito maior que zero")
        if not _valid_cycle_day(close_day) or not _valid_cycle_day(due_day):
            raise HTTPException(status_code=400, detail="Informe os dias de fechamento e vencimento entre 1 e 31")

    return credit_enabled, close_day, due_day


def sync_credit_card(db: Session, user_id, account_name: str, credit_enabled: bool, close_day: int | None, due_day: int | None):
    card = db.scalar(select(Card).where(and_(Card.user_id == user_id, Card.name == account_name)))

    if credit_enabled and close_day and due_day:
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
    cards = db.scalars(select(Card).where(Card.user_id == user.id)).all()
    card_by_name = {c.name: c for c in cards}
    return [serialize_account(r, card_by_name.get(r.name)) for r in rows]


@router.post("")
def create_account(payload: AccountIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    try:
        data = payload.model_dump()
        card_types = data.get("card_types", [])
        if not isinstance(card_types, list):
            card_types = []

        credit_enabled, close_day, due_day = normalize_credit_fields(payload, card_types)
        data["card_types"] = ",".join(card_types)

        row = Account(user_id=user.id, **data)
        db.add(row)
        sync_credit_card(db, user.id, row.name, credit_enabled, close_day, due_day)

        db.commit()
        db.refresh(row)
        return serialize_account(row)
    except HTTPException:
        raise
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
        if not isinstance(card_types, list):
            card_types = []

        credit_enabled, close_day, due_day = normalize_credit_fields(payload, card_types)
        data["card_types"] = ",".join(card_types)

        for k, v in data.items():
            setattr(row, k, v)

        if old_name != row.name:
            old_card = db.scalar(select(Card).where(and_(Card.user_id == user.id, Card.name == old_name)))
            if old_card:
                old_card.name = row.name

        sync_credit_card(db, user.id, row.name, credit_enabled, close_day, due_day)

        db.commit()
        db.refresh(row)
        return serialize_account(row)
    except HTTPException:
        raise
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
