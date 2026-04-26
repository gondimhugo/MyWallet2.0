from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import current_user, get_db
from app.core.security import hash_password, verify_password
from app.db.models import User
from app.schemas.auth import ChangePasswordIn
from app.schemas.common import Message

router = APIRouter()


class MeIn(BaseModel):
    full_name: str = Field(default="", max_length=120)
    email: EmailStr | None = None


class MeOut(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: str | None = None
    last_login_at: str | None = None


class DeleteAccountIn(BaseModel):
    password: str


def _serialize_user(user: User) -> MeOut:
    return MeOut(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at.isoformat() if user.created_at else None,
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
    )


@router.get('/me', response_model=MeOut)
def me(user: User = Depends(current_user)):
    return _serialize_user(user)


@router.put('/me', response_model=MeOut)
def me_update(
    payload: MeIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    user.full_name = payload.full_name.strip()

    if payload.email and payload.email.lower() != user.email:
        new_email = payload.email.strip().lower()
        existing = db.scalar(
            select(User).where(User.email == new_email, User.id != user.id)
        )
        if existing:
            raise HTTPException(400, 'Este e-mail já está em uso')
        user.email = new_email

    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize_user(user)


@router.post('/me/change-password', response_model=Message)
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, 'Senha atual incorreta')
    if payload.current_password == payload.new_password:
        raise HTTPException(400, 'A nova senha deve ser diferente da atual')

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return Message(message='Senha atualizada com sucesso')


@router.delete('/me', response_model=Message)
def delete_account(
    payload: DeleteAccountIn,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(400, 'Senha incorreta')
    db.delete(user)
    db.commit()
    return Message(message='Conta excluída')
