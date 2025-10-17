from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    qty: int


class OrderCreate(BaseModel):
    church_id: int
    items: List[OrderItemCreate]


class OrderItemRead(BaseModel):
    id: int
    product_id: int
    qty: int
    unit_price: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    requester_id: int
    church_id: int
    status: OrderStatus
    created_at: datetime
    approved_at: Optional[datetime]
    delivered_at: Optional[datetime]
    items: List[OrderItemRead]

    class Config:
        from_attributes = True
