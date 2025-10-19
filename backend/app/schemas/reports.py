from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


# Relatório de Movimentações de Estoque
class StockMovementReportItem(BaseModel):
    product_id: int
    product_name: str
    type: str
    total_quantity: int
    movement_count: int
    last_movement: Optional[datetime]

class StockMovementSummary(BaseModel):
    total_entries: int
    total_manual_exits: int
    total_order_exits: int
    total_losses: int
    net_movement: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]

class StockMovementReport(BaseModel):
    summary: StockMovementSummary
    movements: List[StockMovementReportItem]
    total_products: int


# Relatório de Pedidos
class OrderReportItem(BaseModel):
    order_id: int
    church_name: str
    created_at: datetime
    status: str
    total_items: int
    total_quantity: int

class OrderSummary(BaseModel):
    total_orders: int
    pending_orders: int
    completed_orders: int
    total_quantity: int
    period_start: Optional[datetime]
    period_end: Optional[datetime]

class OrderReport(BaseModel):
    summary: OrderSummary
    orders: List[OrderReportItem]
    top_products: List[Dict[str, Any]]


# Relatório de Produtos
class ProductReportItem(BaseModel):
    product_id: int
    name: str
    category_name: str
    stock_quantity: int
    min_stock: Optional[int]
    last_movement: Optional[datetime]
    movement_count: int
    status: str  # 'LOW_STOCK', 'OUT_OF_STOCK', 'NORMAL'

class ProductSummary(BaseModel):
    total_products: int
    low_stock_products: int
    out_of_stock_products: int
    total_stock_value: int

class ProductReport(BaseModel):
    summary: ProductSummary
    products: List[ProductReportItem]


# Relatório de Igrejas
class ChurchReportItem(BaseModel):
    church_id: int
    name: str
    total_orders: int
    total_quantity: int
    last_order: Optional[datetime]
    avg_order_size: float
    status: str  # 'ACTIVE', 'INACTIVE'

class ChurchSummary(BaseModel):
    total_churches: int
    active_churches: int
    inactive_churches: int
    total_orders: int

class ChurchReport(BaseModel):
    summary: ChurchSummary
    churches: List[ChurchReportItem]


# Dashboard Executivo (ADM)
class DashboardKPIs(BaseModel):
    total_products: int
    total_stock_quantity: int
    total_orders_month: int
    pending_orders: int
    low_stock_alerts: int
    active_churches: int

class DashboardChartData(BaseModel):
    orders_by_month: List[Dict[str, Any]]
    stock_by_category: List[Dict[str, Any]]
    top_products: List[Dict[str, Any]]

class DashboardReport(BaseModel):
    kpis: DashboardKPIs
    charts: DashboardChartData


# Relatórios para Usuário
class UserOrderReportItem(BaseModel):
    order_id: int
    created_at: datetime
    status: str
    total_items: int
    total_quantity: int
    items: List[Dict[str, Any]]

class UserOrderReport(BaseModel):
    orders: List[UserOrderReportItem]
    total_orders: int
    pending_orders: int

class UserProductCatalogItem(BaseModel):
    product_id: int
    name: str
    category_name: str
    stock_quantity: int
    description: Optional[str]

class UserProductCatalog(BaseModel):
    products: List[UserProductCatalogItem]
    total_products: int

class UserMovementReportItem(BaseModel):
    movement_id: int
    product_name: str
    type: str
    quantity: int
    created_at: datetime
    order_id: Optional[int]

class UserMovementReport(BaseModel):
    movements: List[UserMovementReportItem]
    total_movements: int