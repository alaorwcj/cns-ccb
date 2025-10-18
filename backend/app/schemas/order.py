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


class OrderUpdate(BaseModel):
    church_id: Optional[int] = None
    items: Optional[List[OrderItemCreate]] = None


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
    church_name: Optional[str] = None
    church_city: Optional[str] = None
    status: OrderStatus
    created_at: datetime
    approved_at: Optional[datetime]
    delivered_at: Optional[datetime]
    items: List[OrderItemRead]
    signed_by_id: Optional[int] = None
    signed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderSign(BaseModel):
    # optional note or signer name could be added in future
    pass
