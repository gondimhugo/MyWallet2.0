from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User

bearer = HTTPBearer()


def get_db():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(token=Depends(bearer), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token.credentials, settings.secret_key, algorithms=["HS256"])
        if payload.get("type") != "access":
            raise ValueError("invalid")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc
    try:
        user_id = UUID(payload["sub"])
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user
