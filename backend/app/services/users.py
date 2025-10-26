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
    # add user to session first so relationship assignments persist
    db.add(user)
    db.flush()
    if church_ids:
        churches = list(db.scalars(select(Church).where(Church.id.in_(church_ids))))
        # assign the relationship explicitly
        user.churches = churches
    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session,
    *,
    user: User,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    role: Optional[UserRole] = None,
    password: Optional[str] = None,
    church_ids: Optional[List[int]] = None,
) -> User:
    if name is not None:
        user.name = name
    if email is not None:
        user.email = email
    if phone is not None:
        user.phone = phone
    if role is not None:
        user.role = role
    if password is not None:
        user.password_hash = get_password_hash(password)
    if church_ids is not None:
        churches = list(db.scalars(select(Church).where(Church.id.in_(church_ids))))
        # clear existing associations and set new ones
        user.churches = churches
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def toggle_active(db: Session, user: User) -> User:
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user
