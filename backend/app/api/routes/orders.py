from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.core.security import get_current_user_token
from app.models.order import Order, OrderStatus
from app.models.user import UserRole
from app.schemas.order import OrderCreate, OrderRead
from app.services.orders import list_orders_for_user, create_order, approve_order, deliver_order
from app.services.receipt import generate_order_receipt_pdf

router = APIRouter(prefix="/orders", tags=["orders"]) 


@router.get("", response_model=List[OrderRead])
def get_orders(db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    is_admin = payload.get("role") == UserRole.ADM.value
    user_id = int(payload.get("user_id"))
    from app.models.user import User

    user = db.get(User, user_id)
    return list_orders_for_user(db, user=user, is_admin=is_admin)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def post_order(data: OrderCreate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    user_id = int(payload.get("user_id"))
    try:
        items = [(it.product_id, it.qty) for it in data.items]
        order = create_order(db, requester_id=user_id, church_id=data.church_id, items=items)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}/receipt")
def receipt(order_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.ENTREGUE:
        raise HTTPException(status_code=400, detail="Order not delivered yet")
    from app.services.receipt import generate_order_receipt_pdf

    pdf = generate_order_receipt_pdf(db, order)
    headers = {"Content-Disposition": f"attachment; filename=pedido_{order.id}_recibo.pdf"}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.put("/{order_id}/approve", response_model=OrderRead)
def approve(order_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        return approve_order(db, order=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{order_id}/deliver", response_model=OrderRead)
def deliver(order_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        return deliver_order(db, order=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
