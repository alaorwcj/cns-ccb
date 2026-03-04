from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.models.inventory import InventoryStatus


class InventoryItemCreate(BaseModel):
    product_id: int
    expected_qty: int
    counted_qty: Optional[int] = None


class InventoryItemUpdate(BaseModel):
    counted_qty: int


class InventoryItemRead(BaseModel):
    id: int
    inventory_id: int
    product_id: int
    product_name: Optional[str] = None
    expected_qty: int
    counted_qty: Optional[int] = None
    difference: Optional[int] = None
    adjusted: bool

    class Config:
        from_attributes = True


class InventoryCreate(BaseModel):
    notes: Optional[str] = None


class InventoryUpdate(BaseModel):
    notes: Optional[str] = None


class InventoryRead(BaseModel):
    id: int
    created_at: datetime
    created_by_id: int
    created_by_name: Optional[str] = None
    status: InventoryStatus
    notes: Optional[str] = None
    finalized_at: Optional[datetime] = None
    items: List[InventoryItemRead] = []

    class Config:
        from_attributes = True


class InventoryListResponse(BaseModel):
    data: List[InventoryRead]
    total: int
