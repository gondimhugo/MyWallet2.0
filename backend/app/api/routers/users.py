from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import User

router = APIRouter()


class MeIn(BaseModel):
    full_name: str


@router.get('/me')
def me(user: User = Depends(current_user)):
    return {"id": str(user.id), "email": user.email, "full_name": user.full_name}


@router.put('/me')
def me_update(payload: MeIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.full_name = payload.full_name
    db.add(user)
    db.commit()
    return {"ok": True}
