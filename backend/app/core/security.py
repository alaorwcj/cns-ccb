from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from app.core.config import settings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(subject: str, expires_minutes: int, extra: Optional[Dict[str, Any]] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode: Dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        to_encode.update(extra)
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_alg)


def create_access_token(subject: str, extra: Optional[Dict[str, Any]] = None) -> str:
    return create_token(subject, settings.access_token_expires_min, extra)


def create_refresh_token(subject: str, extra: Optional[Dict[str, Any]] = None) -> str:
    return create_token(subject, settings.refresh_token_expires_min, extra)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
    except JWTError:
        return None


async def get_current_user_token(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
