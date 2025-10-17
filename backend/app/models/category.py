from __future__ import annotations
from datetime import datetime
from typing import List

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    products: Mapped[List["Product"]] = relationship(
        back_populates="category",
        lazy="selectin",
    )
