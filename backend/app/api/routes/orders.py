from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.core.security import get_current_user_token
from app.models.order import Order, OrderStatus
from app.models.user import UserRole
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate, OrderListResponse
from app.services.orders import list_orders_for_user, create_order, approve_order, deliver_order
from app.services.orders import update_order
from app.services.receipt import generate_order_receipt_pdf
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"]) 


@router.get("", response_model=OrderListResponse)
def get_orders(
    db: Session = Depends(db_dep), 
    payload: dict = Depends(get_current_user_token),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
):
    is_admin = payload.get("role") == UserRole.ADM.value
    user_id = int(payload.get("user_id"))
    from app.models.user import User
    from app.services.orders import count_orders_for_user

    user = db.get(User, user_id)
    orders = list_orders_for_user(db, user=user, is_admin=is_admin, page=page, limit=limit)
    total = count_orders_for_user(db, user=user, is_admin=is_admin)
    # Add church_name and church_city to each order
    for order in orders:
        order.church_name = order.church.name if order.church else None
        order.church_city = order.church.city if order.church else None
        # also add product_name to each item (if product relation loaded)
        for it in getattr(order, 'items', []) or []:
            try:
                it.product_name = it.product.name if it.product else None
            except Exception:
                it.product_name = None
    return OrderListResponse(data=orders, total=total, page=page, limit=limit)


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def post_order(data: OrderCreate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    user_id = int(payload.get("user_id"))
    is_admin = payload.get("role") == UserRole.ADM.value
    # ensure user is allowed to create orders for the chosen church
    from app.models.user import User as UserModel, user_church
    from sqlalchemy import select, func
    user = db.get(UserModel, user_id)
    if not is_admin:
        # verify membership directly in DB (don't rely on relationship being pre-loaded)
        cnt = db.scalar(select(func.count()).select_from(user_church).where(user_church.c.user_id == user_id, user_church.c.church_id == data.church_id))
        if not cnt:
            raise HTTPException(status_code=403, detail="Not allowed to create orders for this church")
    try:
        items = [(it.product_id, it.qty) for it in data.items]
        order = create_order(db, requester_id=user_id, church_id=data.church_id, items=items)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    user_id = int(payload.get("user_id"))
    is_admin = payload.get("role") == UserRole.ADM.value
    
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    
    stmt = select(Order).options(selectinload(Order.church), selectinload(Order.items)).where(Order.id == order_id)
    order = db.scalar(stmt)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Allow if admin, the requester, or a user assigned to the church
    if not is_admin and order.requester_id != user_id:
        # check church membership
        if not order.church or not any(u.id == user_id for u in order.church.users):
            raise HTTPException(status_code=403, detail="Not allowed")
    
    # Add church_name and church_city
    order.church_name = order.church.name if order.church else None
    order.church_city = order.church.city if order.church else None
    # add product_name to each item for convenience
    for it in getattr(order, 'items', []) or []:
        try:
            it.product_name = it.product.name if it.product else None
        except Exception:
            it.product_name = None
    
    return order


@router.get("/{order_id}/receipt")
def receipt(order_id: int, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    """Return PDF receipt for the order.

    Allowed for ADM role or the original requester.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.ENTREGUE:
        raise HTTPException(status_code=400, detail="Order not delivered yet")

    # allow ADM or the requester who created the order
    user_role = payload.get("role")
    user_id = int(payload.get("user_id"))
    if user_role != UserRole.ADM.value and user_id != order.requester_id:
        raise HTTPException(status_code=403, detail="Not allowed")

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


@router.put("/{order_id}", response_model=OrderRead)
def update(order_id: int, data: OrderUpdate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    # only requester can update while PENDENTE
    user_id = int(payload.get("user_id"))
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # allow update if requester or if user belongs to the same church
    if order.requester_id != user_id:
        if not order.church or not any(u.id == user_id for u in order.church.users):
            raise HTTPException(status_code=403, detail="Not allowed")
    if order.status != OrderStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Only pending orders can be updated")
    try:
        return update_order(db, order=order, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/sign", response_model=OrderRead)
def sign_order(order_id: int, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    """Mark the order as signed by the current user. Allowed if user is ADM or belongs to the same church or is requester."""
    user_id = int(payload.get("user_id"))
    role = payload.get("role")
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # permission: ADM, requester, or same church
    if role != UserRole.ADM.value and user_id != order.requester_id and (order.church and not any(u.id == user_id for u in order.church.users)):
        raise HTTPException(status_code=403, detail="Not allowed to sign")
    # persist signature
    from datetime import datetime
    order.signed_by_id = user_id
    order.signed_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
