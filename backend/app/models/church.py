from __future__ import annotations
from datetime import datetime
from typing import List

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import user_church


class Church(Base):
    __tablename__ = "churches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    users: Mapped[List["User"]] = relationship(
        "User",
        secondary=user_church,
        back_populates="churches",
        lazy="selectin",
    )

    orders: Mapped[List["Order"]] = relationship(
        back_populates="church",
        cascade="all,delete-orphan",
        lazy="selectin",
    )
