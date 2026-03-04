from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import List, Tuple
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.church import Church
from app.models.user import User
from app.services.stock import add_movement
from app.models.stock_movement import MovementType, StockMovement


def list_orders_for_user(db: Session, *, user: User, is_admin: bool, page: int = 1, limit: int = 10, 
                         date_from: datetime = None, date_until: datetime = None, church_id: int = None) -> List[Order]:
    # ensure we also load related product objects for each order item so callers can include product.name
    from app.models.order import OrderItem
    stmt = select(Order).options(
        selectinload(Order.church),
        selectinload(Order.items).selectinload(OrderItem.product),
    ).order_by(Order.created_at.desc())
    if not is_admin:
        # restrict to orders belonging to churches assigned to the user
        church_ids = [c.id for c in (user.churches or [])]
        if not church_ids:
            return []
        stmt = stmt.where(Order.church_id.in_(church_ids))
    
    # Filtro por igreja
    if church_id:
        stmt = stmt.where(Order.church_id == church_id)
    
    # Filtro por data
    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_until:
        stmt = stmt.where(Order.created_at <= date_until)
    
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    return list(db.scalars(stmt))


def count_orders_for_user(db: Session, *, user: User, is_admin: bool, 
                          date_from: datetime = None, date_until: datetime = None, church_id: int = None) -> int:
    stmt = select(func.count()).select_from(Order)
    if not is_admin:
        church_ids = [c.id for c in (user.churches or [])]
        if not church_ids:
            return 0
        stmt = stmt.where(Order.church_id.in_(church_ids))
    
    # Filtro por igreja
    if church_id:
        stmt = stmt.where(Order.church_id == church_id)
    
    # Filtro por data
    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_until:
        stmt = stmt.where(Order.created_at <= date_until)
    
    return db.scalar(stmt) or 0


def create_order(
    db: Session,
    *,
    requester_id: int,
    church_id: int,
    items: List[Tuple[int, int]],
) -> Order:
    if not church_id or church_id <= 0:
        raise ValueError("Invalid church")
    
    if not items:
        raise ValueError("Order must have items")

    # Validate church exists
    church = db.get(Church, church_id)
    if not church:
        raise ValueError("Invalid church")

    prods = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_([pid for pid, _ in items])))}
    order_items: List[OrderItem] = []

    for product_id, qty in items:
        prod = prods.get(product_id)
        if not prod or not prod.is_active:
            raise ValueError("Invalid product")
        if prod.stock_qty is None or prod.stock_qty < qty or qty <= 0:
            raise ValueError("Insufficient stock for one or more items")
        # Validar limite por pedido
        if prod.max_qty_per_order and prod.max_qty_per_order > 0 and qty > prod.max_qty_per_order:
            raise ValueError(f"Quantidade máxima por pedido para '{prod.name}': {prod.max_qty_per_order}")
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


def update_order(db: Session, *, order: Order, data, is_admin: bool = False) -> Order:
    # Permitir edição de pedidos PENDENTES sempre, ou APROVADOS se for admin
    if order.status == OrderStatus.ENTREGUE:
        raise ValueError("Delivered orders cannot be updated")
    if order.status == OrderStatus.APROVADO and not is_admin:
        raise ValueError("Only administrators can update approved orders")

    if data.church_id is not None:
        order.church_id = data.church_id

    if data.items is not None:
        items = [(it.product_id, it.qty) for it in data.items]
        if not items:
            raise ValueError("Order must have items")

        # Se pedido já estava APROVADO, reverter movimentações de estoque antigas
        if order.status == OrderStatus.APROVADO:
            for old_item in order.items:
                prod = db.get(Product, old_item.product_id)
                if prod:
                    prod.stock_qty = (prod.stock_qty or 0) + old_item.qty  # Devolver ao estoque
            # Deletar movimentações antigas relacionadas a este pedido
            db.query(StockMovement).filter(StockMovement.related_order_id == order.id).delete()

        prods = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_([pid for pid, _ in items])))}
        order_items: List[OrderItem] = []

        for product_id, qty in items:
            prod = prods.get(product_id)
            if not prod or not prod.is_active:
                raise ValueError("Invalid product")
            if prod.stock_qty is None or prod.stock_qty < qty or qty <= 0:
                raise ValueError("Insufficient stock for one or more items")
            # Validar limite por pedido
            if prod.max_qty_per_order and prod.max_qty_per_order > 0 and qty > prod.max_qty_per_order:
                raise ValueError(f"Quantidade máxima por pedido para '{prod.name}': {prod.max_qty_per_order}")
            unit_price: Decimal = prod.price
            subtotal: Decimal = (unit_price or Decimal("0")) * Decimal(qty)
            order_items.append(
                OrderItem(product_id=product_id, qty=qty, unit_price=unit_price, subtotal=subtotal)
            )

        # replace items
        order.items = order_items
        
        # Se ainda está APROVADO, reaplicar movimentações de estoque com novos itens
        if order.status == OrderStatus.APROVADO:
            for it in order.items:
                prod = db.get(Product, it.product_id)
                if prod:
                    prod.stock_qty = (prod.stock_qty or 0) - it.qty
                    add_movement(
                        db,
                        product_id=it.product_id,
                        type=MovementType.SAIDA_PEDIDO,
                        qty=it.qty,
                        note=f"Pedido #{order.id} editado",
                        related_order_id=order.id,
                    )

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
    
    # Send WhatsApp notification automatically
    if order.church and order.church.whatsapp_phone:
        try:
            from app.services.whatsapp import send_whatsapp_message, format_order_message
            order_dict = {
                "id": order.id,
                "church_name": order.church.name if order.church else None,
                "church_city": order.church.city if order.church else None,
                "status": "APROVADO",
                "created_at": order.created_at,
                "items": [
                    {
                        "product_name": item.product.name if item.product else f"Produto #{item.product_id}",
                        "quantity": item.qty,
                        "subtotal": float(item.subtotal)
                    }
                    for item in order.items
                ]
            }
            message = format_order_message(order_dict)
            send_whatsapp_message(order.church.whatsapp_phone, message)
        except Exception as e:
            # Log error but don't fail the approval
            print(f"WhatsApp notification failed for order {order.id}: {e}")
    
    return order


def deliver_order(db: Session, *, order: Order) -> Order:
    if order.status != OrderStatus.APROVADO:
        raise ValueError("Order is not approved")
    order.status = OrderStatus.ENTREGUE
    order.delivered_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def sign_order(db: Session, *, order: Order, signer_user_id: int) -> Order:
    """Mark the order as signed by the given user and set timestamp."""
    order.signed_by_id = signer_user_id
    order.signed_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, *, order: Order) -> Order:
    """Cancel an approved order and restore stock (ADM only)."""
    if order.status == OrderStatus.ENTREGUE:
        raise ValueError("Cannot cancel a delivered order")
    if order.status == OrderStatus.CANCELADO:
        raise ValueError("Order is already cancelled")
    
    # Se estava APROVADO, reverter o estoque
    if order.status == OrderStatus.APROVADO:
        for item in order.items:
            prod = db.get(Product, item.product_id)
            if prod:
                prod.stock_qty = (prod.stock_qty or 0) + item.qty
        
        # Deletar movimentações relacionadas
        db.query(StockMovement).filter(StockMovement.related_order_id == order.id).delete()
    
    order.status = OrderStatus.CANCELADO
    db.commit()
    db.refresh(order)
    return order
