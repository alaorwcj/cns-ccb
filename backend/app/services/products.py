from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.product import Product


def list_products(db: Session, *, category_id: Optional[int] = None, q: Optional[str] = None) -> List[Product]:
    stmt = select(Product)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Product.name.ilike(like))
    stmt = stmt.order_by(Product.name)
    return list(db.scalars(stmt))


def get_product(db: Session, product_id: int) -> Optional[Product]:
    return db.get(Product, product_id)


def create_product(db: Session, **kwargs) -> Product:
    prod = Product(**kwargs)
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod


def update_product(db: Session, product: Product, **kwargs) -> Product:
    for k, v in kwargs.items():
        if v is not None:
            setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> None:
    db.delete(product)
    db.commit()


def duplicate_product(db: Session, source: Product) -> Product:
    dup = Product(
        name=f"{source.name} (copy)",
        category_id=source.category_id,
        unit=source.unit,
        price=source.price,
        stock_qty=0,
        low_stock_threshold=source.low_stock_threshold,
        is_active=source.is_active,
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    return dup
