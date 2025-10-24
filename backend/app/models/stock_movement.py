from __future__ import annotations
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MovementType(str, Enum):
    ENTRADA = "ENTRADA"
    SAIDA_PEDIDO = "SAIDA_PEDIDO"
    SAIDA_MANUAL = "SAIDA_MANUAL"
    PERDA = "PERDA"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    type: Mapped[MovementType] = mapped_column(SAEnum(MovementType, name="movement_type"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    related_order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    product = relationship("Product", back_populates="movements")
    related_order = relationship("Order")
