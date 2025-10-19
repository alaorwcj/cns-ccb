from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.stock_movement import MovementType
from app.services.reports import (
    get_stock_movement_report,
    get_order_report,
    get_product_report,
    get_church_report,
    get_dashboard_report,
    get_user_orders_report,
    get_user_product_catalog,
    get_user_movements_report
)
from app.schemas.reports import (
    StockMovementReport,
    OrderReport,
    ProductReport,
    ChurchReport,
    DashboardReport,
    UserOrderReport,
    UserProductCatalog,
    UserMovementReport
)

router = APIRouter(prefix="/reports", tags=["reports"])


# Endpoints para ADM
@router.get("/stock-movements", response_model=StockMovementReport)
def get_stock_movements_report(
    start_date: Optional[datetime] = Query(None, description="Data inicial (YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[datetime] = Query(None, description="Data final (YYYY-MM-DDTHH:MM:SS)"),
    product_id: Optional[int] = Query(None, description="ID do produto"),
    movement_type: Optional[MovementType] = Query(None, description="Tipo de movimento"),
    church_id: Optional[int] = Query(None, description="ID da igreja"),
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    """Relatório de movimentações de estoque - Apenas ADM"""
    try:
        return get_stock_movement_report(
            db=db,
            start_date=start_date,
            end_date=end_date,
            product_id=product_id,
            movement_type=movement_type,
            church_id=church_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/orders", response_model=OrderReport)
def get_orders_report(
    start_date: Optional[datetime] = Query(None, description="Data inicial (YYYY-MM-DDTHH:MM:SS)"),
    end_date: Optional[datetime] = Query(None, description="Data final (YYYY-MM-DDTHH:MM:SS)"),
    church_id: Optional[int] = Query(None, description="ID da igreja"),
    status: Optional[str] = Query(None, description="Status do pedido"),
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    """Relatório de pedidos - Apenas ADM"""
    try:
        return get_order_report(
            db=db,
            start_date=start_date,
            end_date=end_date,
            church_id=church_id,
            status=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/products", response_model=ProductReport)
def get_products_report(
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    """Relatório de produtos - Apenas ADM"""
    try:
        return get_product_report(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/churches", response_model=ChurchReport)
def get_churches_report(
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    """Relatório de igrejas - Apenas ADM"""
    try:
        return get_church_report(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/dashboard", response_model=DashboardReport)
def get_dashboard_report_endpoint(
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    """Dashboard executivo - Apenas ADM"""
    try:
        return get_dashboard_report(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


# Endpoints para usuários comuns
@router.get("/my-orders", response_model=UserOrderReport)
def get_my_orders_report(
    db: Session = Depends(db_dep),
    current_user=Depends(require_role("USUARIO")),
):
    """Relatório dos pedidos da minha igreja - Usuários"""
    try:
        # Assumindo que o usuário tem church_id no token ou profile
        # Por enquanto, vamos usar um church_id fixo para teste
        church_id = 1  # TODO: Obter do token do usuário
        return get_user_orders_report(db, church_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/product-catalog", response_model=UserProductCatalog)
def get_product_catalog(
    db: Session = Depends(db_dep),
    current_user=Depends(require_role("USUARIO")),
):
    """Catálogo de produtos disponíveis - Usuários"""
    try:
        return get_user_product_catalog(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")


@router.get("/my-movements", response_model=UserMovementReport)
def get_my_movements_report(
    db: Session = Depends(db_dep),
    current_user=Depends(require_role("USUARIO")),
):
    """Movimentações relacionadas aos meus pedidos - Usuários"""
    try:
        # Assumindo que o usuário tem church_id no token ou profile
        church_id = 1  # TODO: Obter do token do usuário
        return get_user_movements_report(db, church_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar relatório: {str(e)}")