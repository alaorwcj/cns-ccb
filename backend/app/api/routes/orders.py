from datetime import datetime
from typing import List
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.core.security import get_current_user_token
from app.models.order import Order, OrderStatus
from app.models.user import UserRole
from app.schemas.order import OrderCreate, OrderRead, OrderUpdate, OrderListResponse, BatchReceiptsRequest
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
    date_from: str = Query(default=None, description="Filtro data inicial (YYYY-MM-DD)"),
    date_until: str = Query(default=None, description="Filtro data final (YYYY-MM-DD)"),
    church_id: int = Query(default=None, description="Filtro por igreja"),
):
    is_admin = payload.get("role") == UserRole.ADM.value
    user_id = int(payload.get("user_id"))
    from app.models.user import User
    from app.services.orders import count_orders_for_user

    # Parse date filters
    date_from_dt = None
    date_until_dt = None
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD")
    if date_until:
        try:
            date_until_dt = datetime.fromisoformat(date_until + " 23:59:59")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_until format. Use YYYY-MM-DD")

    user = db.get(User, user_id)
    orders = list_orders_for_user(db, user=user, is_admin=is_admin, page=page, limit=limit, 
                                   date_from=date_from_dt, date_until=date_until_dt, church_id=church_id)
    total = count_orders_for_user(db, user=user, is_admin=is_admin, 
                                   date_from=date_from_dt, date_until=date_until_dt, church_id=church_id)
    # Add church_name and church_city to each order
    for order in orders:
        order.church_name = order.church.name if order.church else None
        order.church_city = order.church.city if order.church else None
        order.whatsapp_phone = order.church.whatsapp_phone if order.church else None
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
    
    # Validação data de corte: bloquear criação após dia 20 (exceto admin)
    from datetime import datetime
    import pytz
    brasilia_tz = pytz.timezone('America/Sao_Paulo')
    now_brasilia = datetime.now(brasilia_tz)
    if now_brasilia.day > 20 and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Período de pedidos encerrado. Novos pedidos podem ser criados a partir do dia 1º do próximo mês. Contate o administrador em caso de urgência."
        )
    
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
    order.whatsapp_phone = order.church.whatsapp_phone if order.church else None
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
    # Permitir imprimir se APROVADO ou ENTREGUE
    if order.status not in [OrderStatus.APROVADO, OrderStatus.ENTREGUE]:
        raise HTTPException(status_code=400, detail="Order must be approved or delivered to print receipt")

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


@router.put("/{order_id}/cancel", response_model=OrderRead)
def cancel(order_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    try:
        from app.services.orders import cancel_order
        return cancel_order(db, order=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{order_id}", response_model=OrderRead)
def update(order_id: int, data: OrderUpdate, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    # Allow requester or ADM to update PENDENTE
    # Allow ADM to update APROVADO
    user_id = int(payload.get("user_id"))
    user_role = payload.get("role")
    is_admin = user_role == UserRole.ADM.value
    
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check order status
    if order.status == OrderStatus.ENTREGUE:
        raise HTTPException(status_code=400, detail="Delivered orders cannot be updated")
    if order.status == OrderStatus.APROVADO and not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can update approved orders")
    
    # Allow update if: (1) ADM, or (2) user belongs to the order's church (for PENDENTE)
    if not is_admin and order.status == OrderStatus.PENDENTE:
        if not order.church or not any(u.id == user_id for u in order.church.users):
            raise HTTPException(status_code=403, detail="Not allowed")
    
    try:
        return update_order(db, order=order, data=data, is_admin=is_admin)
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


@router.post("/batch-receipts")
def batch_receipts(data: BatchReceiptsRequest, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    """Generate a consolidated PDF with receipts for multiple orders (ADM only).
    
    Each order will have 2 copies (VIA ADMINISTRAÇÃO and VIA COMPRADOR).
    """
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.services.receipt import generate_batch_receipts_pdf
    
    order_ids = data.order_ids
    
    if not order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    
    # Fetch all orders with relationships loaded
    from app.models.order import OrderItem
    
    stmt = select(Order).options(
        selectinload(Order.church),
        selectinload(Order.requester),
        selectinload(Order.signed_by),
        selectinload(Order.items).selectinload(OrderItem.product)
    ).where(Order.id.in_(order_ids), Order.status.in_([OrderStatus.APROVADO, OrderStatus.ENTREGUE]))
    
    orders = list(db.scalars(stmt))
    
    if not orders:
        raise HTTPException(status_code=404, detail="Nenhum pedido aprovado ou entregue encontrado com os IDs fornecidos")
    
    pdf = generate_batch_receipts_pdf(db, orders)
    headers = {"Content-Disposition": f"attachment; filename=recibos_lote.pdf"}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.post("/{order_id}/receipt-upload")
def upload_signed_receipt(
    order_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(db_dep),
    payload: dict = Depends(get_current_user_token)
):
    """Upload signed receipt for an order (ADM only or order requester)."""
    # Check if user is admin or order requester
    user_id = int(payload.get("user_id"))
    is_admin = payload.get("role") == UserRole.ADM.value
    
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only admin or requester can upload
    if not is_admin and order.requester_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to upload receipt for this order")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG, PNG, and PDF are allowed")
    
    # Validate file size (10MB max)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > 10 * 1024 * 1024:  # 10MB in bytes
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"receipts/{order_id}_{uuid.uuid4().hex}{file_extension}"
    
    # Read file content
    file_content = file.file.read()
    
    # Upload to S3
    try:
        from app.services.storage import upload_file_to_s3
        upload_file_to_s3(file_content, unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    # Delete old file from S3 if exists
    if order.signed_receipt_path:
        try:
            from app.services.storage import delete_file_from_s3
            delete_file_from_s3(order.signed_receipt_path)
        except Exception:
            pass  # Ignore errors deleting old file
    
    # Update order with new file path
    order.signed_receipt_path = unique_filename
    db.commit()
    db.refresh(order)
    
    return {"message": "Receipt uploaded successfully", "filename": unique_filename}


@router.get("/receipts/{filename:path}")
def get_signed_receipt(filename: str, db: Session = Depends(db_dep), payload: dict = Depends(get_current_user_token)):
    """Download a signed receipt file from S3."""
    # Validate filename to prevent issues
    if ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Download from S3
    try:
        from app.services.storage import download_file_from_s3
        file_content = download_file_from_s3(filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")
    
    # Determine media type
    media_type = "application/pdf" if filename.endswith(".pdf") else "image/jpeg"
    
    return Response(content=file_content, media_type=media_type)


@router.delete("/{order_id}/receipt-upload")
def delete_signed_receipt(
    order_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM"))
):
    """Delete signed receipt for an order (ADM only)."""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.signed_receipt_path:
        raise HTTPException(status_code=404, detail="No receipt file attached to this order")
    
    # Delete file from S3
    try:
        from app.services.storage import delete_file_from_s3
        delete_file_from_s3(order.signed_receipt_path)
    except Exception:
        pass  # Ignore errors deleting file
    
    # Update order
    order.signed_receipt_path = None
    db.commit()
    
    return {"message": "Receipt deleted successfully"}


@router.post("/{order_id}/whatsapp")
def send_order_whatsapp(
    order_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM"))
):
    """Send order notification via WhatsApp (ADM only)."""
    from app.services.whatsapp import send_whatsapp_message, format_order_message
    
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get church phone
    if not order.church or not order.church.whatsapp_phone:
        raise HTTPException(status_code=400, detail="Igreja não possui WhatsApp cadastrado")
    
    # Build order dict for formatting
    order_dict = {
        "id": order.id,
        "church_name": order.church.name if order.church else None,
        "church_city": order.church.city if order.church else None,
        "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
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
    result = send_whatsapp_message(order.church.whatsapp_phone, message)
    
    if result.get("success"):
        return {
            "success": True,
            "message": "WhatsApp enviado com sucesso",
            "message_sid": result.get("message_sid")
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar WhatsApp: {result.get('error', 'Erro desconhecido')}"
        )

