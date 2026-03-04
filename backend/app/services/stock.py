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
    unit_price: Optional[float] = None,  # Novo: preço unitário para atualizar produto
    invoice_number: Optional[str] = None,  # Número da nota fiscal
    invoice_date: Optional[datetime] = None,  # Data da nota fiscal
    commit: bool = True,  # Se False, não faz commit (para uso em batch)
) -> StockMovement:
    if qty <= 0:
        raise ValueError("qty must be > 0")
    product = db.get(Product, product_id)
    if not product:
        raise ValueError("Product not found")

    delta = qty if type == MovementType.ENTRADA else -qty
    apply_stock_change(db, product, delta)
    
    # Se for ENTRADA e informou novo preço, atualizar preço do produto e recalcular pedidos abertos
    if type == MovementType.ENTRADA and unit_price is not None and unit_price > 0:
        from decimal import Decimal
        old_price = product.price
        new_price = Decimal(str(unit_price))
        product.price = new_price
        
        # Recalcular pedidos PENDENTES e APROVADOS (não ENTREGUE)
        from app.models.order import Order, OrderItem, OrderStatus
        pending_or_approved_orders = db.query(Order).filter(
            Order.status.in_([OrderStatus.PENDENTE, OrderStatus.APROVADO])
        ).all()
        
        for order in pending_or_approved_orders:
            for item in order.items:
                if item.product_id == product_id:
                    item.unit_price = new_price
                    item.subtotal = item.qty * new_price

    mv = StockMovement(
        product_id=product_id,
        type=type,
        qty=qty,
        note=note,
        related_order_id=related_order_id,
        unit_price=unit_price,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        created_at=datetime.utcnow(),
    )
    db.add(mv)
    if commit:
        db.commit()
        db.refresh(mv)
    else:
        db.flush()  # Gera o ID sem fazer commit
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
