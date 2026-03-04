from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import List

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InventoryStatus(str, Enum):
    EM_ANDAMENTO = "EM_ANDAMENTO"
    FINALIZADO = "FINALIZADO"


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[InventoryStatus] = mapped_column(String(20), default=InventoryStatus.EM_ANDAMENTO, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by = relationship("User", foreign_keys=[created_by_id])
    items: Mapped[List["InventoryItem"]] = relationship(
        back_populates="inventory",
        cascade="all,delete-orphan",
        lazy="selectin",
    )


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    inventory_id: Mapped[int] = mapped_column(ForeignKey("inventory_counts.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    expected_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    counted_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)
    difference: Mapped[int | None] = mapped_column(Integer, nullable=True)
    adjusted: Mapped[bool] = mapped_column(Boolean, default=False)

    inventory = relationship("InventoryCount", back_populates="items")
    product = relationship("Product")
