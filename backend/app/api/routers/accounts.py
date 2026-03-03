from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import Account, User
from app.schemas.domain import AccountIn
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/debug")
async def debug_create(request: Request):
    """Debug endpoint: shows raw body and validation errors"""
    import json

    body = await request.body()
    logger.info(f"Raw body: {body}")
    try:
        data = json.loads(body)
        logger.info(f"Parsed JSON: {data}")
        payload = AccountIn(**data)
        logger.info(f"Valid AccountIn: {payload}")
        return {"ok": True, "payload": payload.model_dump()}
    except Exception as e:
        logger.exception("Debug error")
        return {"error": str(e), "type": type(e).__name__}


@router.get("")
def list_accounts(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(Account).where(Account.user_id == user.id)).all()
    out = []
    for r in rows:
        ct = getattr(r, "card_types", "") or ""
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "bank": getattr(r, "bank", ""),
                "account_type": getattr(r, "account_type", ""),
                "card_types": ct.split(",") if ct else [],
                "balance": r.balance,
            }
        )
    return out


@router.post("")
def create_account(
    payload: AccountIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    try:
        data = payload.model_dump()
        # card_types may be sent as list from frontend — persist as CSV string in DB
        if isinstance(data.get("card_types"), list):
            data["card_types"] = ",".join(data["card_types"])
        row = Account(user_id=user.id, **data)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "name": row.name,
            "bank": getattr(row, "bank", ""),
            "account_type": getattr(row, "account_type", ""),
            "card_types": row.card_types.split(",") if row.card_types else [],
            "balance": row.balance,
        }
    except Exception as e:
        logger.exception("Error creating account")
        raise HTTPException(status_code=400, detail=f"create_account error: {e}")


@router.put("/{item_id}")
def update_account(
    item_id: UUID,
    payload: AccountIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    row = db.get(Account, item_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Conta não encontrada")
    try:
        data = payload.model_dump()
        if isinstance(data.get("card_types"), list):
            data["card_types"] = ",".join(data["card_types"])
        for k, v in data.items():
            setattr(row, k, v)
        db.commit()
        db.refresh(row)
        return {
            "id": row.id,
            "name": row.name,
            "bank": getattr(row, "bank", ""),
            "account_type": getattr(row, "account_type", ""),
            "card_types": row.card_types.split(",") if row.card_types else [],
            "balance": row.balance,
        }
    except Exception as e:
        logger.exception("Error updating account")
        raise HTTPException(status_code=400, detail=f"update_account error: {e}")


@router.delete("/{item_id}")
def delete_account(
    item_id: UUID, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    row = db.get(Account, item_id)
    if row and row.user_id == user.id:
        db.delete(row)
        db.commit()
    return {"ok": True}
