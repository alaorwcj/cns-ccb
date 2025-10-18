from __future__ import annotations
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.product import Product
from app.models.category import Category


def list_products(
    db: Session,
    *,
    category_id: Optional[int] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    stmt = select(
        Product.id,
        Product.name,
        Product.category_id,
        Product.unit,
        Product.price,
        Product.stock_qty,
        Product.low_stock_threshold,
        Product.is_active,
        Category.name.label("category_name")
    ).join(Category, Product.category_id == Category.id, isouter=True)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Product.name.ilike(like))
    stmt = stmt.order_by(Product.name)
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = db.execute(stmt).mappings().all()
    return result
def count_products(
    db: Session,
    *,
    category_id: Optional[int] = None,
    q: Optional[str] = None,
) -> int:
    stmt = select(func.count()).select_from(Product)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Product.name.ilike(like))
    return db.scalar(stmt) or 0


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
