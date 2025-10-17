from __future__ import annotations
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.product import Product


def generate_order_receipt_pdf(db: Session, order: Order) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Comprovante de Recebimento")
    y -= 20

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Pedido: #{order.id}")
    y -= 15
    c.drawString(40, y, f"Igreja: {order.church_id}")
    y -= 15
    c.drawString(40, y, f"Solicitante: {order.requester_id}")
    y -= 15
    c.drawString(40, y, f"Status: {order.status.value}")
    y -= 15
    if order.delivered_at:
        c.drawString(40, y, f"Entregue em: {order.delivered_at}")
        y -= 20

    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, "Itens")
    y -= 15

    c.setFont("Helvetica", 10)
    total = Decimal("0")
    for it in order.items:
        prod = db.get(Product, it.product_id)
        name = prod.name if prod else f"Produto {it.product_id}"
        line = f"- {name}  x{it.qty}  @ R${it.unit_price}  = R${it.subtotal}"
        c.drawString(50, y, line)
        y -= 14
        total += it.subtotal
        if y < 80:
            c.showPage()
            y = height - 50

    y -= 10
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, y, f"Total: R${total}")

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
