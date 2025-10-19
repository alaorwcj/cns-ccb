from __future__ import annotations
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, desc, case, text

from app.models.product import Product
from app.models.category import Category
from app.models.stock_movement import StockMovement, MovementType
from app.models.order import Order, OrderItem
from app.models.church import Church
from app.models.user import User
from app.schemas.reports import (
    StockMovementReport, StockMovementSummary, StockMovementReportItem,
    OrderReport, OrderSummary, OrderReportItem,
    ProductReport, ProductSummary, ProductReportItem,
    ChurchReport, ChurchSummary, ChurchReportItem,
    DashboardReport, DashboardKPIs, DashboardChartData,
    UserOrderReport, UserOrderReportItem,
    UserProductCatalog, UserProductCatalogItem,
    UserMovementReport, UserMovementReportItem
)


def get_stock_movement_report(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    product_id: Optional[int] = None,
    movement_type: Optional[MovementType] = None,
    church_id: Optional[int] = None
) -> StockMovementReport:
    """Relatório de movimentações de estoque para ADM"""

    # Base query
    query = select(
        StockMovement.product_id,
        Product.name.label('product_name'),
        StockMovement.type,
        func.sum(StockMovement.qty).label('total_quantity'),
        func.count(StockMovement.id).label('movement_count'),
        func.max(StockMovement.created_at).label('last_movement')
    ).join(Product).group_by(StockMovement.product_id, Product.name, StockMovement.type)

    # Apply filters
    conditions = []
    if start_date:
        conditions.append(StockMovement.created_at >= start_date)
    if end_date:
        conditions.append(StockMovement.created_at <= end_date)
    if product_id:
        conditions.append(StockMovement.product_id == product_id)
    if movement_type:
        conditions.append(StockMovement.type == movement_type)
    if church_id:
        # Filter by church through orders
        conditions.append(StockMovement.related_order_id.in_(
            select(Order.id).where(Order.church_id == church_id)
        ))

    if conditions:
        query = query.where(and_(*conditions))

    result = db.execute(query).fetchall()

    # Calculate summary
    summary_query = select(
        func.sum(case((StockMovement.type == MovementType.ENTRADA, StockMovement.qty), else_=0)).label('entries'),
        func.sum(case((StockMovement.type == MovementType.SAIDA_MANUAL, StockMovement.qty), else_=0)).label('manual_exits'),
        func.sum(case((StockMovement.type == MovementType.SAIDA_PEDIDO, StockMovement.qty), else_=0)).label('order_exits'),
        func.sum(case((StockMovement.type == MovementType.PERDA, StockMovement.qty), else_=0)).label('losses')
    )

    if conditions:
        summary_query = summary_query.where(and_(*conditions))

    summary_result = db.execute(summary_query).first()

    summary = StockMovementSummary(
        total_entries=summary_result.entries or 0,
        total_manual_exits=summary_result.manual_exits or 0,
        total_order_exits=summary_result.order_exits or 0,
        total_losses=summary_result.losses or 0,
        net_movement=(summary_result.entries or 0) - (summary_result.manual_exits or 0) - (summary_result.order_exits or 0) - (summary_result.losses or 0),
        period_start=start_date,
        period_end=end_date
    )

    movements = [
        StockMovementReportItem(
            product_id=row.product_id,
            product_name=row.product_name,
            type=row.type,
            total_quantity=row.total_quantity,
            movement_count=row.movement_count,
            last_movement=row.last_movement
        ) for row in result
    ]

    return StockMovementReport(
        summary=summary,
        movements=movements,
        total_products=len(set(row.product_id for row in result))
    )


def get_order_report(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    church_id: Optional[int] = None,
    status: Optional[str] = None
) -> OrderReport:
    """Relatório de pedidos para ADM"""

    # Base query for orders
    query = select(
        Order.id,
        Church.name.label('church_name'),
        Order.created_at,
        Order.status,
        func.count(OrderItem.id).label('total_items'),
        func.sum(OrderItem.quantity).label('total_quantity')
    ).join(Church).outerjoin(OrderItem).group_by(Order.id, Church.name, Order.created_at, Order.status)

    conditions = []
    if start_date:
        conditions.append(Order.created_at >= start_date)
    if end_date:
        conditions.append(Order.created_at <= end_date)
    if church_id:
        conditions.append(Order.church_id == church_id)
    if status:
        conditions.append(Order.status == status)

    if conditions:
        query = query.where(and_(*conditions))

    orders_result = db.execute(query).fetchall()

    # Summary
    summary_query = select(
        func.count(Order.id).label('total_orders'),
        func.sum(case((Order.status == 'PENDING', 1), else_=0)).label('pending_orders'),
        func.sum(case((Order.status == 'COMPLETED', 1), else_=0)).label('completed_orders'),
        func.sum(OrderItem.quantity).label('total_quantity')
    ).outerjoin(OrderItem)

    if conditions:
        summary_query = summary_query.where(and_(*conditions))

    summary_result = db.execute(summary_query).first()

    summary = OrderSummary(
        total_orders=summary_result.total_orders or 0,
        pending_orders=summary_result.pending_orders or 0,
        completed_orders=summary_result.completed_orders or 0,
        total_quantity=summary_result.total_quantity or 0,
        period_start=start_date,
        period_end=end_date
    )

    orders = [
        OrderReportItem(
            order_id=row.id,
            church_name=row.church_name,
            created_at=row.created_at,
            status=row.status,
            total_items=row.total_items,
            total_quantity=row.total_quantity or 0
        ) for row in orders_result
    ]

    # Top products
    top_products_query = select(
        Product.name,
        func.sum(OrderItem.quantity).label('total_quantity'),
        func.count(OrderItem.order_id.distinct()).label('order_count')
    ).join(OrderItem).join(Order).group_by(Product.id, Product.name).order_by(desc(func.sum(OrderItem.quantity))).limit(10)

    if conditions:
        top_products_query = top_products_query.where(and_(*conditions))

    top_products = [
        {"name": row.name, "quantity": row.total_quantity, "orders": row.order_count}
        for row in db.execute(top_products_query).fetchall()
    ]

    return OrderReport(
        summary=summary,
        orders=orders,
        top_products=top_products
    )


def get_product_report(db: Session) -> ProductReport:
    """Relatório de produtos para ADM"""

    query = select(
        Product.id,
        Product.name,
        Category.name.label('category_name'),
        Product.stock_qty,
        Product.min_stock,
        func.max(StockMovement.created_at).label('last_movement'),
        func.count(StockMovement.id).label('movement_count')
    ).outerjoin(Category).outerjoin(StockMovement).group_by(Product.id, Product.name, Category.name, Product.stock_qty, Product.min_stock)

    result = db.execute(query).fetchall()

    products = []
    low_stock_count = 0
    out_of_stock_count = 0

    for row in result:
        status = 'NORMAL'
        if row.stock_qty == 0:
            status = 'OUT_OF_STOCK'
            out_of_stock_count += 1
        elif row.min_stock and row.stock_qty <= row.min_stock:
            status = 'LOW_STOCK'
            low_stock_count += 1

        products.append(ProductReportItem(
            product_id=row.id,
            name=row.name,
            category_name=row.category_name or 'Sem categoria',
            stock_quantity=row.stock_qty or 0,
            min_stock=row.min_stock,
            last_movement=row.last_movement,
            movement_count=row.movement_count,
            status=status
        ))

    summary = ProductSummary(
        total_products=len(products),
        low_stock_products=low_stock_count,
        out_of_stock_products=out_of_stock_count,
        total_stock_value=sum(p.stock_quantity for p in products)
    )

    return ProductReport(summary=summary, products=products)


def get_church_report(db: Session) -> ChurchReport:
    """Relatório de igrejas para ADM"""

    query = select(
        Church.id,
        Church.name,
        func.count(Order.id).label('total_orders'),
        func.sum(OrderItem.quantity).label('total_quantity'),
        func.max(Order.created_at).label('last_order'),
        func.avg(OrderItem.quantity).label('avg_order_size')
    ).outerjoin(Order).outerjoin(OrderItem).group_by(Church.id, Church.name)

    result = db.execute(query).fetchall()

    churches = []
    active_count = 0
    total_orders = 0

    for row in result:
        # Consider active if had orders in last 30 days
        is_active = row.last_order and (datetime.utcnow() - row.last_order).days <= 30
        status = 'ACTIVE' if is_active else 'INACTIVE'
        if is_active:
            active_count += 1

        churches.append(ChurchReportItem(
            church_id=row.id,
            name=row.name,
            total_orders=row.total_orders,
            total_quantity=row.total_quantity or 0,
            last_order=row.last_order,
            avg_order_size=round(row.avg_order_size or 0, 2),
            status=status
        ))

        total_orders += row.total_orders

    summary = ChurchSummary(
        total_churches=len(churches),
        active_churches=active_count,
        inactive_churches=len(churches) - active_count,
        total_orders=total_orders
    )

    return ChurchReport(summary=summary, churches=churches)


def get_dashboard_report(db: Session) -> DashboardReport:
    """Dashboard executivo para ADM"""

    # KPIs
    total_products = db.scalar(select(func.count(Product.id)))
    total_stock = db.scalar(select(func.sum(Product.stock_qty)))
    total_orders_month = db.scalar(select(func.count(Order.id)).where(
        Order.created_at >= datetime.utcnow() - timedelta(days=30)
    ))
    pending_orders = db.scalar(select(func.count(Order.id)).where(Order.status == 'PENDING'))
    low_stock_products = db.scalar(select(func.count(Product.id)).where(
        and_(Product.min_stock.isnot(None), Product.stock_qty <= Product.min_stock)
    ))
    active_churches = db.scalar(select(func.count(Church.id)).where(
        Church.id.in_(select(Order.church_id).where(
            Order.created_at >= datetime.utcnow() - timedelta(days=30)
        ))
    ))

    kpis = DashboardKPIs(
        total_products=total_products or 0,
        total_stock_quantity=total_stock or 0,
        total_orders_month=total_orders_month or 0,
        pending_orders=pending_orders or 0,
        low_stock_alerts=low_stock_products or 0,
        active_churches=active_churches or 0
    )

    # Charts data
    # Orders by month (last 12 months)
    orders_by_month_query = text("""
        SELECT
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as count
        FROM orders
        WHERE created_at >= :start_date
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
    """)

    start_date = datetime.utcnow() - timedelta(days=365)
    orders_result = db.execute(orders_by_month_query, {"start_date": start_date}).fetchall()
    orders_by_month = [
        {"month": row.month.strftime("%Y-%m"), "count": row.count}
        for row in orders_result
    ]

    # Stock by category
    stock_by_category_query = select(
        Category.name,
        func.sum(Product.stock_qty).label('total_stock')
    ).join(Product).group_by(Category.id, Category.name)

    stock_result = db.execute(stock_by_category_query).fetchall()
    stock_by_category = [
        {"category": row.name or "Sem categoria", "stock": row.total_stock or 0}
        for row in stock_result
    ]

    # Top products by orders
    top_products_query = select(
        Product.name,
        func.sum(OrderItem.quantity).label('total_ordered')
    ).join(OrderItem).join(Order).group_by(Product.id, Product.name).order_by(desc(func.sum(OrderItem.quantity))).limit(10)

    top_products_result = db.execute(top_products_query).fetchall()
    top_products = [
        {"name": row.name, "ordered": row.total_ordered}
        for row in top_products_result
    ]

    charts = DashboardChartData(
        orders_by_month=orders_by_month,
        stock_by_category=stock_by_category,
        top_products=top_products
    )

    return DashboardReport(kpis=kpis, charts=charts)


# Relatórios para usuários comuns
def get_user_orders_report(db: Session, church_id: int) -> UserOrderReport:
    """Relatório de pedidos da igreja do usuário"""

    query = select(
        Order.id,
        Order.created_at,
        Order.status,
        func.count(OrderItem.id).label('total_items'),
        func.sum(OrderItem.quantity).label('total_quantity')
    ).outerjoin(OrderItem).where(Order.church_id == church_id).group_by(Order.id, Order.created_at, Order.status).order_by(desc(Order.created_at))

    result = db.execute(query).fetchall()

    orders = []
    pending_count = 0

    for row in result:
        if row.status == 'PENDING':
            pending_count += 1

        # Get order items
        items_query = select(
            Product.name,
            OrderItem.quantity
        ).join(Product).where(OrderItem.order_id == row.id)

        items_result = db.execute(items_query).fetchall()
        items = [{"product_name": item.name, "quantity": item.quantity} for item in items_result]

        orders.append(UserOrderReportItem(
            order_id=row.id,
            created_at=row.created_at,
            status=row.status,
            total_items=row.total_items,
            total_quantity=row.total_quantity or 0,
            items=items
        ))

    return UserOrderReport(
        orders=orders,
        total_orders=len(orders),
        pending_orders=pending_count
    )


def get_user_product_catalog(db: Session) -> UserProductCatalog:
    """Catálogo de produtos disponíveis para usuários"""

    query = select(
        Product.id,
        Product.name,
        Category.name.label('category_name'),
        Product.stock_qty,
        Product.description
    ).outerjoin(Category).where(Product.stock_qty > 0).order_by(Category.name, Product.name)

    result = db.execute(query).fetchall()

    products = [
        UserProductCatalogItem(
            product_id=row.id,
            name=row.name,
            category_name=row.category_name or 'Sem categoria',
            stock_quantity=row.stock_qty or 0,
            description=row.description
        ) for row in result
    ]

    return UserProductCatalog(
        products=products,
        total_products=len(products)
    )


def get_user_movements_report(db: Session, church_id: int) -> UserMovementReport:
    """Relatório de movimentações relacionadas aos pedidos da igreja"""

    query = select(
        StockMovement.id,
        Product.name.label('product_name'),
        StockMovement.type,
        StockMovement.qty,
        StockMovement.created_at,
        StockMovement.related_order_id
    ).join(Product).where(
        and_(
            StockMovement.related_order_id.in_(
                select(Order.id).where(Order.church_id == church_id)
            ),
            StockMovement.type == MovementType.SAIDA_PEDIDO
        )
    ).order_by(desc(StockMovement.created_at))

    result = db.execute(query).fetchall()

    movements = [
        UserMovementReportItem(
            movement_id=row.id,
            product_name=row.product_name,
            type=row.type,
            quantity=row.qty,
            created_at=row.created_at,
            order_id=row.related_order_id
        ) for row in result
    ]

    return UserMovementReport(
        movements=movements,
        total_movements=len(movements)
    )