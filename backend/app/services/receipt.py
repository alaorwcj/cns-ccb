from __future__ import annotations
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
import os
from reportlab.lib.utils import ImageReader

from app.models.order import Order
from app.models.product import Product


def generate_order_receipt_pdf(db: Session, order: Order) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50
    # draw logo if available at /app/ccb.png
    logo_path = '/app/ccb.png'
    if os.path.exists(logo_path):
        try:
            img = ImageReader(logo_path)
            c.drawImage(img, 40, y - 40, width=80, preserveAspectRatio=True, mask='auto')
        except Exception:
            pass
    c.setFont("Helvetica-Bold", 14)
    c.drawString(140, y, "Comprovante de Recebimento")
    y -= 20

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Pedido: #{order.id}")
    y -= 15
    # show church name if relationship loaded
    church_name = order.church.name if getattr(order, 'church', None) and order.church.name else f"Igreja #{order.church_id}"
    c.drawString(40, y, f"Igreja: {church_name}")
    y -= 15
    requester_name = order.requester.name if getattr(order, 'requester', None) and order.requester.name else f"Usuario #{order.requester_id}"
    c.drawString(40, y, f"Solicitante: {requester_name}")
    y -= 15
    # include requester contact info when available
    if getattr(order, 'requester', None):
        requester = order.requester
        if getattr(requester, 'email', None):
            c.drawString(40, y, f"Email: {requester.email}")
            y -= 12
        if getattr(requester, 'phone', None):
            c.drawString(40, y, f"Telefone: {requester.phone}")
            y -= 12
    c.drawString(40, y, f"Status: {order.status.value}")
    y -= 15
    if order.delivered_at:
        # format delivered date/time human friendly
        try:
            delivered_str = order.delivered_at.strftime('%d/%m/%Y %H:%M')
        except Exception:
            delivered_str = str(order.delivered_at)
        c.drawString(40, y, f"Entregue em: {delivered_str}")
        y -= 20

    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Itens")
    y -= 15

    c.setFont("Helvetica", 10)
    total = Decimal("0")
    for it in order.items:
        # prefer loaded relationship product, else fetch
        prod = getattr(it, 'product', None) or db.get(Product, it.product_id)
        name = prod.name if prod else f"Produto #{it.product_id}"
        line = f"- {name}  x{it.qty}  @ R${it.unit_price}  = R${it.subtotal}"
        c.drawString(50, y, line)
        y -= 14
        total += it.subtotal
        if y < 140:
            c.showPage()
            y = height - 50

    y -= 10
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, f"Total: R${total}")

    # signature block
    y -= 50
    c.setFont("Helvetica", 10)
    c.drawString(40, y, "Assinatura do responsável:")
    # draw a signature line and label for signed by
    c.line(40, y - 12, 300, y - 12)
    # show who signed if available
    if getattr(order, 'signed_by', None) and getattr(order, 'signed_at', None):
        try:
            signed_name = order.signed_by.name
            signed_at = order.signed_at.strftime('%d/%m/%Y %H:%M')
            c.drawString(40, y - 28, f"Assinado por: {signed_name} em {signed_at}")
        except Exception:
            c.drawString(40, y - 28, "Assinado")
    else:
        c.drawString(40, y - 28, "Assinado por: _______________________________")

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
