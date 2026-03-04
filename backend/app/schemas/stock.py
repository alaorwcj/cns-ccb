from __future__ import annotations
from datetime import date
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
    unit_price: Optional[float] = None  # Preço unitário para atualizar produto (opcional)
    invoice_number: Optional[str] = None  # Número da nota fiscal
    invoice_date: Optional[date] = None  # Data da nota fiscal


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementRead(StockMovementBase):
    id: int

    class Config:
        from_attributes = True


class StockMovementListResponse(BaseModel):
    data: List[StockMovementRead]
    total: int
    page: int
    limit: int

    class Config:
        from_attributes = True


class BatchEntryItem(BaseModel):
    product_id: int
    qty: int
    unit_price: float


class BatchEntryCreate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    items: List[BatchEntryItem]
    note: Optional[str] = None
