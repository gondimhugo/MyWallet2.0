from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def _now() -> datetime:
    return datetime.now(timezone.utc)

def create_token(subject: str, token_type: str, expires_delta: timedelta, extra: Optional[dict[str, Any]] = None) -> str:
    to_encode: dict[str, Any] = {"sub": subject, "type": token_type, "iat": int(_now().timestamp())}
    expire = _now() + expires_delta
    to_encode.update({"exp": int(expire.timestamp())})
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

def create_access_token(subject: str) -> str:
    return create_token(subject, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(subject: str) -> str:
    return create_token(subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
