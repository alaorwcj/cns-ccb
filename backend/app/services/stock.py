from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.models.product import Product
from app.models.stock_movement import StockMovement, MovementType


def apply_stock_change(db: Session, product: Product, qty: int) -> None:
    new_qty = (product.stock_qty or 0) + qty
    if new_qty < 0:
        raise ValueError("Insufficient stock")
    product.stock_qty = new_qty


def add_movement(
    db: Session,
    *,
    product_id: int,
    type: MovementType,
    qty: int,
    note: Optional[str] = None,
    related_order_id: Optional[int] = None,
) -> StockMovement:
    if qty <= 0:
        raise ValueError("qty must be > 0")
    product = db.get(Product, product_id)
    if not product:
        raise ValueError("Product not found")

    delta = qty if type == MovementType.ENTRADA else -qty
    apply_stock_change(db, product, delta)

    mv = StockMovement(
        product_id=product_id,
        type=type,
        qty=qty,
        note=note,
        related_order_id=related_order_id,
        created_at=datetime.utcnow(),
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv


def list_movements(
    db: Session,
    *,
    product_id: Optional[int] = None,
    type: Optional[MovementType] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    page: int = 1,
    limit: int = 10,
) -> List[StockMovement]:
    stmt = select(StockMovement)
    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if type is not None:
        stmt = stmt.where(StockMovement.type == type)
    if start is not None:
        stmt = stmt.where(StockMovement.created_at >= start)
    if end is not None:
        stmt = stmt.where(StockMovement.created_at <= end)
    stmt = stmt.order_by(StockMovement.created_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    return list(db.scalars(stmt))


def count_movements(
    db: Session,
    *,
    product_id: Optional[int] = None,
    type: Optional[MovementType] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> int:
    stmt = select(func.count()).select_from(StockMovement)
    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if type is not None:
        stmt = stmt.where(StockMovement.type == type)
    if start is not None:
        stmt = stmt.where(StockMovement.created_at >= start)
    if end is not None:
        stmt = stmt.where(StockMovement.created_at <= end)
    return db.scalar(stmt) or 0
