from __future__ import annotations
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel

from app.models.stock_movement import MovementType


class StockMovementBase(BaseModel):
    product_id: int
    type: MovementType
    qty: int
    note: Optional[str] = None
    related_order_id: Optional[int] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementRead(StockMovementBase):
    id: int

    class Config:
        from_attributes = True
