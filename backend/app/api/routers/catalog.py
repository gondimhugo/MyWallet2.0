from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import get_db, get_current_user
from app.db.models import Account, Category, User
from app.schemas.catalog import AccountCreate, AccountRead, CategoryCreate, CategoryRead

router = APIRouter()

@router.get("/accounts", response_model=list[AccountRead])
def list_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.exec(select(Account).order_by(Account.name)).all()

@router.post("/accounts", response_model=AccountRead)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    acc = Account(name=payload.name.strip())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc

@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.exec(select(Category).order_by(Category.name)).all()

@router.post("/categories", response_model=CategoryRead)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cat = Category(name=payload.name.strip(), color=payload.color)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
