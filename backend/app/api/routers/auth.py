from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password, make_token, verify_password
from app.db.models import User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenPair
from app.schemas.common import Message

router = APIRouter()


@router.post('/register', response_model=TokenPair)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(400, 'Email já cadastrado')
    user = User(email=payload.email, password_hash=hash_password(payload.password), full_name=payload.full_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenPair(access_token=make_token(str(user.id), settings.access_token_expire_minutes, 'access'), refresh_token=make_token(str(user.id), settings.refresh_token_expire_minutes, 'refresh'))


@router.post('/login', response_model=TokenPair)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, 'Credenciais inválidas')
    return TokenPair(access_token=make_token(str(user.id), settings.access_token_expire_minutes, 'access'), refresh_token=make_token(str(user.id), settings.refresh_token_expire_minutes, 'refresh'))


@router.post('/refresh', response_model=TokenPair)
def refresh(payload: RefreshIn):
    try:
        data = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=['HS256'])
        if data.get('type') != 'refresh':
            raise ValueError()
    except (JWTError, ValueError):
        raise HTTPException(401, 'Refresh inválido')
    sub = data['sub']
    return TokenPair(access_token=make_token(sub, settings.access_token_expire_minutes, 'access'), refresh_token=make_token(sub, settings.refresh_token_expire_minutes, 'refresh'))


@router.post('/logout', response_model=Message)
def logout():
    return Message(message='Logout efetuado')
