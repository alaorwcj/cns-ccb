from __future__ import annotations
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    unit: str
    price: Decimal
    stock_qty: int = 0
    low_stock_threshold: int = 0
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit: Optional[str] = None
    price: Optional[Decimal] = None
    stock_qty: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    id: int
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    data: List[ProductRead]
    total: int
    page: int
    limit: int

    class Config:
        from_attributes = True
