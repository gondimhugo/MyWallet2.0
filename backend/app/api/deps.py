from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import User
from app.db.session import SessionLocal

bearer = HTTPBearer()


def get_db():
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
    user = db.scalar(select(User).where(User.id == payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user
