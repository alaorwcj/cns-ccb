from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.services.stock import add_movement
from app.models.stock_movement import MovementType


def list_orders_for_user(db: Session, *, user: User, is_admin: bool) -> List[Order]:
    stmt = select(Order).order_by(Order.created_at.desc())
    if not is_admin:
        stmt = stmt.where(Order.requester_id == user.id)
    return list(db.scalars(stmt))


def create_order(
    db: Session,
    *,
    requester_id: int,
    church_id: int,
    items: List[Tuple[int, int]],
) -> Order:
    if not items:
        raise ValueError("Order must have items")

    prods = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_([pid for pid, _ in items])))}
    order_items: List[OrderItem] = []

    for product_id, qty in items:
        prod = prods.get(product_id)
        if not prod or not prod.is_active:
            raise ValueError("Invalid product")
        if prod.stock_qty is None or prod.stock_qty < qty or qty <= 0:
            raise ValueError("Insufficient stock for one or more items")
        unit_price: Decimal = prod.price
        subtotal: Decimal = (unit_price or Decimal("0")) * Decimal(qty)
        order_items.append(
            OrderItem(product_id=product_id, qty=qty, unit_price=unit_price, subtotal=subtotal)
        )

    order = Order(
        requester_id=requester_id,
        church_id=church_id,
        status=OrderStatus.PENDENTE,
        items=order_items,
        created_at=datetime.utcnow(),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def approve_order(db: Session, *, order: Order) -> Order:
    if order.status != OrderStatus.PENDENTE:
        raise ValueError("Order is not pending")

    for it in order.items:
        prod = db.get(Product, it.product_id)
        if not prod or (prod.stock_qty or 0) < it.qty:
            raise ValueError("Insufficient stock at approval time")

    for it in order.items:
        add_movement(
            db,
            product_id=it.product_id,
            type=MovementType.SAIDA_PEDIDO,
            qty=it.qty,
            note=f"Order #{order.id}",
            related_order_id=order.id,
        )

    order.status = OrderStatus.APROVADO
    order.approved_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def deliver_order(db: Session, *, order: Order) -> Order:
    if order.status != OrderStatus.APROVADO:
        raise ValueError("Order is not approved")
    order.status = OrderStatus.ENTREGUE
    order.delivered_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order
