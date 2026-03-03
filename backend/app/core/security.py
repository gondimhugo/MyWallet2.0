from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Use PBKDF2-SHA256 to avoid external bcrypt C extension issues in some envs
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
ALGO = "HS256"


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)


def make_token(sub: str, minutes: int, kind: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "type": kind,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGO)
