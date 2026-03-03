from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import SalaryProfile, User
from app.schemas.domain import SalaryIn

router = APIRouter()


@router.get('/salary-profile')
def get_salary(db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(SalaryProfile, user.id)
    return row or {}


@router.put('/salary-profile')
def put_salary(payload: SalaryIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    row = db.get(SalaryProfile, user.id) or SalaryProfile(user_id=user.id)
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.add(row)
    db.commit()
    return row
