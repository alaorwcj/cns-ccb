from __future__ import annotations
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.stock_movement import StockMovement, MovementType


def overview(db: Session) -> Dict[str, Any]:
    pedidos_abertos = db.scalar(
        select(func.count()).select_from(Order).where(Order.status != OrderStatus.ENTREGUE)
    ) or 0

    low_stock = list(
        db.scalars(
            select(Product).where(Product.stock_qty <= Product.low_stock_threshold, Product.is_active == True)  # noqa: E712
        )
    )
    low_stock_out = [
        {
            "id": p.id,
            "name": p.name,
            "stock_qty": p.stock_qty,
            "low_stock_threshold": p.low_stock_threshold,
        }
        for p in low_stock
    ]

    total_estoque_em_rs = db.scalar(
        select(func.coalesce(func.sum(Product.stock_qty * Product.price), 0))
    ) or Decimal("0")

    months = 6
    since = datetime.utcnow() - timedelta(days=30 * months)
    saidas_rs = db.scalar(
        select(
            func.coalesce(
                func.sum(StockMovement.qty * Product.price), 0
            )
        ).select_from(StockMovement)
        .join(Product, Product.id == StockMovement.product_id)
        .where(
            StockMovement.type.in_([MovementType.SAIDA_PEDIDO, MovementType.SAIDA_MANUAL, MovementType.PERDA]),
            StockMovement.created_at >= since,
        )
    ) or Decimal("0")
    medias_saida_mensal = (saidas_rs / months) if months else Decimal("0")

    # monthly series for the last 12 months
    months_series = 12
    now = datetime.utcnow()
    monthly_out = []
    labels = []
    for m in range(months_series - 1, -1, -1):
        start = datetime(now.year, now.month, 1)
        # shift back m months
        year = start.year
        month = start.month - m
        while month <= 0:
            month += 12
            year -= 1
        from_date = datetime(year, month, 1)
        if month == 12:
            to_year = year + 1
            to_month = 1
        else:
            to_year = year
            to_month = month + 1
        to_date = datetime(to_year, to_month, 1)

        total = db.scalar(
            select(func.coalesce(func.sum(StockMovement.qty * Product.price), 0))
            .select_from(StockMovement)
            .join(Product, Product.id == StockMovement.product_id)
            .where(
                StockMovement.type.in_([MovementType.SAIDA_PEDIDO, MovementType.SAIDA_MANUAL, MovementType.PERDA]),
                StockMovement.created_at >= from_date,
                StockMovement.created_at < to_date,
            )
        ) or Decimal("0")

        labels.append(f"{from_date.strftime('%b/%Y')}")
        monthly_out.append(str(total))

    return {
        "pedidos_abertos": int(pedidos_abertos),
        "low_stock": low_stock_out,
        "medias_saida_mensal": str(medias_saida_mensal),
        "total_estoque_em_rs": str(total_estoque_em_rs),
        "monthly_labels": labels,
        "monthly_out": monthly_out,
    }
