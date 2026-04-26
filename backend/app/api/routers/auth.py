import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password, make_token, verify_password
from app.db.models import User
from app.schemas.auth import (
    ForgotPasswordIn,
    ForgotPasswordOut,
    LoginIn,
    RefreshIn,
    RegisterIn,
    ResetPasswordIn,
    TokenPair,
)
from app.schemas.common import Message

router = APIRouter()
logger = logging.getLogger(__name__)

PASSWORD_RESET_TTL_MINUTES = 30


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_token_pair(user_id: str) -> TokenPair:
    return TokenPair(
        access_token=make_token(user_id, settings.access_token_expire_minutes, "access"),
        refresh_token=make_token(user_id, settings.refresh_token_expire_minutes, "refresh"),
    )


@router.post('/register', response_model=TokenPair)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(400, 'Email já cadastrado')
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_token_pair(str(user.id))


@router.post('/login', response_model=TokenPair)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, 'E-mail ou senha incorretos')
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    return _issue_token_pair(str(user.id))


@router.post('/refresh', response_model=TokenPair)
def refresh(payload: RefreshIn):
    try:
        data = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=['HS256'])
        if data.get('type') != 'refresh':
            raise ValueError()
    except (JWTError, ValueError):
        raise HTTPException(401, 'Refresh inválido')
    return _issue_token_pair(data['sub'])


@router.post('/logout', response_model=Message)
def logout():
    return Message(message='Logout efetuado')


@router.post('/forgot-password', response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    generic_message = (
        'Se houver uma conta para esse e-mail, enviaremos um link de '
        'recuperação em instantes.'
    )

    if not user:
        # Reply identically whether the e-mail exists or not — prevents account
        # enumeration via timing/response shape.
        return ForgotPasswordOut(message=generic_message, reset_token=None)

    token = secrets.token_urlsafe(32)
    user.password_reset_token_hash = _hash_reset_token(token)
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=PASSWORD_RESET_TTL_MINUTES
    )
    db.add(user)
    db.commit()

    logger.info("Password reset requested for %s; token expires in %d min", email, PASSWORD_RESET_TTL_MINUTES)

    # Until SMTP is wired up, return the token so the UI can complete the flow
    # without an email service. Replace with a real e-mail send in production
    # and stop returning the token in the response body.
    return ForgotPasswordOut(message=generic_message, reset_token=token)


@router.post('/reset-password', response_model=Message)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    if not payload.token:
        raise HTTPException(400, 'Token inválido')

    token_hash = _hash_reset_token(payload.token)
    user = db.scalar(select(User).where(User.password_reset_token_hash == token_hash))
    if not user or not user.password_reset_expires_at:
        raise HTTPException(400, 'Token inválido ou expirado')

    expires_at = user.password_reset_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        db.add(user)
        db.commit()
        raise HTTPException(400, 'Token inválido ou expirado')

    user.password_hash = hash_password(payload.password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.add(user)
    db.commit()
    return Message(message='Senha redefinida com sucesso')
