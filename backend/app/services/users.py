from __future__ import annotations
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User, UserRole
from app.models.church import Church
from app.core.security import get_password_hash


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(select(User).where(User.email == email))


def list_users(db: Session) -> List[User]:
    return list(db.scalars(select(User).order_by(User.id)))


def create_user(
    db: Session,
    *,
    name: str,
    email: str,
    phone: Optional[str],
    role: UserRole,
    password: str,
    church_ids: Optional[List[int]] = None,
) -> User:
    user = User(
        name=name,
        email=email,
        phone=phone,
        role=role,
        password_hash=get_password_hash(password),
        is_active=True,
    )
    if church_ids:
        churches = list(db.scalars(select(Church).where(Church.id.in_(church_ids))))
        user.churches = churches
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
