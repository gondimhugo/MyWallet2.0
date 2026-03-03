from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.db.models import User
from app.schemas.domain import PlanningInput
from app.services.finance import planning_run

router = APIRouter()


@router.post('/planning/run')
def run(payload: PlanningInput, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return planning_run(db, user.id, payload)
