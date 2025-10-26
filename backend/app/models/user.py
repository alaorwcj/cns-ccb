from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Table, UniqueConstraint, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, Enum):
    ADM = "ADM"
    USUARIO = "USUARIO"


user_church = Table(
    "user_church",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("church_id", ForeignKey("churches.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, name="user_role"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    churches: Mapped[List["Church"]] = relationship(
        "Church",
        secondary=user_church,
        back_populates="users",
        lazy="selectin",
    )

    requests: Mapped[List["Order"]] = relationship(
        back_populates="requester",
        foreign_keys='Order.requester_id',
        cascade="all,delete-orphan",
        lazy="selectin",
    )
