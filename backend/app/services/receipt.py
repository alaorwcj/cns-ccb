from __future__ import annotations
from io import BytesIO
from decimal import Decimal
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from sqlalchemy.orm import Session
import os
from reportlab.lib.utils import ImageReader
from typing import List

from app.models.order import Order
from app.models.product import Product


def generate_order_receipt_pdf(db: Session, order: Order) -> bytes:
    """Generate a PDF receipt with TWO copies: one for ADM and one for the buyer/requester."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Helper function to draw a single receipt page
    def draw_receipt_page(via_label: str):
        # Gray header bar (matching #d3d3d3 from image)
        c.setFillColor(colors.HexColor('#d3d3d3'))
        c.rect(0, height - 60, width, 60, fill=True, stroke=False)
        
        # Logo (left side of header) - try multiple paths
        logo_paths = ['/app/ccb.png', '/app/backend/ccb.png', 'ccb.png']
        logo_loaded = False
        for logo_path in logo_paths:
            if os.path.exists(logo_path):
                try:
                    img = ImageReader(logo_path)
                    c.drawImage(img, 30, height - 55, width=50, height=50, preserveAspectRatio=True, mask='auto')
                    logo_loaded = True
                    break
                except Exception as e:
                    continue
        
        # Company info (left side of header) - black text on gray
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(90, height - 25, "CNS - CCB")
        c.setFont("Helvetica", 8)
        c.drawString(90, height - 37, "Sistema de Controle de Estoque")
        c.drawString(90, height - 48, "Congregação Cristã no Brasil")
        
        # "Recibo de Entrega" title (right side of header)
        c.setFont("Helvetica-Bold", 20)
        c.drawRightString(width - 30, height - 35, "Recibo de")
        c.drawRightString(width - 30, height - 52, "Entrega")
        
        # Reset fill color for body
        c.setFillColor(colors.black)
        
        y = height - 90
        
        # VIA label in box (light gray background)
        c.setFillColor(colors.HexColor('#f0f0f0'))
        c.rect(30, y - 5, 150, 25, fill=True, stroke=True)
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y + 5, f"VIA: {via_label}")
        c.setFillColor(colors.black)
        
        y -= 40
        
        # Left column: Delivery To
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(30, y, "Entregar para")
        c.setFillColor(colors.black)
        
        y -= 18
        c.setFont("Helvetica", 9)
        c.drawString(30, y, "Para:")
        requester_name = order.requester.name if getattr(order, 'requester', None) and order.requester.name else f"Usuario #{order.requester_id}"
        c.setFont("Helvetica-Bold", 9)
        c.drawString(80, y, requester_name)
        
        y -= 14
        c.setFont("Helvetica", 9)
        c.drawString(30, y, "Igreja:")
        church_name = order.church.name if getattr(order, 'church', None) and order.church.name else f"Igreja #{order.church_id}"
        c.setFont("Helvetica-Bold", 9)
        c.drawString(80, y, church_name)
        
        # Display church city if available
        if getattr(order, 'church', None) and getattr(order.church, 'city', None):
            y -= 14
            c.setFont("Helvetica", 9)
            c.drawString(30, y, "Cidade:")
            c.setFont("Helvetica-Bold", 9)
            c.drawString(80, y, order.church.city)
        
        # Right column: Dates
        y_right = height - 130
        c.setFont("Helvetica", 9)
        c.drawString(width - 200, y_right, "Data:")
        if order.delivered_at:
            try:
                delivered_str = order.delivered_at.strftime('%d/%m/%Y')
            except Exception:
                delivered_str = str(order.delivered_at)[:10]
            c.setFont("Helvetica-Bold", 9)
            c.drawString(width - 135, y_right, delivered_str)
        
        y_right -= 14
        c.setFont("Helvetica", 9)
        c.drawString(width - 200, y_right, "Pedido:")
        c.setFont("Helvetica-Bold", 9)
        c.drawString(width - 135, y_right, f"#{order.id}")
        
        y_right -= 14
        c.setFont("Helvetica", 9)
        c.drawString(width - 200, y_right, "Status:")
        c.setFont("Helvetica-Bold", 9)
        c.drawString(width - 135, y_right, order.status.value)
        
        y -= 35
        
        # Table header (gray like #d3d3d3)
        table_y = y
        c.setFillColor(colors.HexColor('#d3d3d3'))
        c.rect(30, table_y - 20, width - 60, 20, fill=True, stroke=True)
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(40, table_y - 12, "Item")
        c.drawString(250, table_y - 12, "Descrição")
        c.drawString(420, table_y - 12, "Qtd")
        c.drawString(480, table_y - 12, "Preço Un.")
        
        # Table rows
        table_y -= 20
        item_num = 1
        total = Decimal("0")
        
        for it in order.items:
            # Alternate row colors
            if item_num % 2 == 0:
                c.setFillColor(colors.HexColor('#F5F5F5'))
                c.rect(30, table_y - 18, width - 60, 18, fill=True, stroke=False)
            
            c.setFillColor(colors.black)
            c.setFont("Helvetica", 9)
            
            prod = getattr(it, 'product', None) or db.get(Product, it.product_id)
            name = prod.name if prod else f"Produto #{it.product_id}"
            
            # Truncate long names
            if len(name) > 30:
                name = name[:27] + "..."
            
            c.drawString(40, table_y - 12, str(item_num))
            c.drawString(250, table_y - 12, name)
            c.drawString(420, table_y - 12, str(it.qty))
            c.drawString(480, table_y - 12, f"R$ {it.unit_price:.2f}")
            
            total += it.subtotal
            table_y -= 18
            item_num += 1
            
            # Page break if needed
            if table_y < 180:
                c.showPage()
                table_y = height - 50
        
        # Table bottom border
        c.setStrokeColor(colors.black)
        c.line(30, table_y, width - 30, table_y)
        
        # Signature section
        y = 140
        c.setFont("Helvetica-Bold", 9)
        c.drawString(30, y, "Assinatura:")
        c.setFont("Helvetica", 8)
        c.line(30, y - 15, 280, y - 15)
        
        if getattr(order, 'signed_by', None) and getattr(order, 'signed_at', None):
            try:
                signed_name = order.signed_by.name
                signed_at = order.signed_at.strftime('%d/%m/%Y %H:%M')
                c.setFont("Helvetica", 7)
                c.drawString(30, y - 25, f"Assinado por: {signed_name} em {signed_at}")
            except Exception:
                pass
        
        c.setFont("Helvetica-Bold", 9)
        c.drawString(310, y, "Data:")
        c.setFont("Helvetica", 8)
        c.line(310, y - 15, 560, y - 15)
        
        # Terms and conditions footer
        y = 80
        c.setFont("Helvetica-Bold", 8)
        c.drawString(30, y, "Termos e Condições:")
        y -= 12
        c.setFont("Helvetica", 7)
        c.drawString(30, y, "Este documento comprova o recebimento dos itens listados acima. Verificar quantidade e qualidade dos produtos no ato do recebimento.")
        y -= 10
        c.drawString(30, y, "Em caso de divergências, entrar em contato com a administração em até 24 horas.")

    # Draw VIA ADMINISTRAÇÃO
    draw_receipt_page("ADMINISTRAÇÃO")
    c.showPage()
    
    # Draw VIA COMPRADOR
    draw_receipt_page("COMPRADOR")
    c.showPage()
    
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def generate_batch_receipts_pdf(db: Session, orders: List[Order]) -> bytes:
    """Generate a consolidated PDF with receipts for multiple orders (2 copies each)."""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    for order in orders:
        # Helper function to draw a single receipt page for this order
        def draw_receipt_page(via_label: str):
            # Gray header bar (matching #d3d3d3 from image)
            c.setFillColor(colors.HexColor('#d3d3d3'))
            c.rect(0, height - 60, width, 60, fill=True, stroke=False)
            
            # Logo (left side of header) - try multiple paths
            logo_paths = ['/app/ccb.png', '/app/backend/ccb.png', 'ccb.png']
            logo_loaded = False
            for logo_path in logo_paths:
                if os.path.exists(logo_path):
                    try:
                        img = ImageReader(logo_path)
                        c.drawImage(img, 30, height - 55, width=50, height=50, preserveAspectRatio=True, mask='auto')
                        logo_loaded = True
                        break
                    except Exception as e:
                        continue
            
            # Company info (left side of header) - black text on gray
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(90, height - 25, "CNS - CCB")
            c.setFont("Helvetica", 8)
            c.drawString(90, height - 37, "Sistema de Controle de Estoque")
            c.drawString(90, height - 48, "Congregação Cristã no Brasil")
            
            # "Recibo de Entrega" title (right side of header)
            c.setFont("Helvetica-Bold", 20)
            c.drawRightString(width - 30, height - 35, "Recibo de")
            c.drawRightString(width - 30, height - 52, "Entrega")
            
            # Reset fill color for body
            c.setFillColor(colors.black)
            
            y = height - 90
            
            # VIA label in box (light gray background)
            c.setFillColor(colors.HexColor('#f0f0f0'))
            c.rect(30, y - 5, 150, 25, fill=True, stroke=True)
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(40, y + 5, f"VIA: {via_label}")
            c.setFillColor(colors.black)
            
            y -= 40
            
            # Left column: Delivery To
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(30, y, "Entregar para")
            c.setFillColor(colors.black)
            
            y -= 18
            c.setFont("Helvetica", 9)
            c.drawString(30, y, "Para:")
            requester_name = order.requester.name if getattr(order, 'requester', None) and order.requester.name else f"Usuario #{order.requester_id}"
            c.setFont("Helvetica-Bold", 9)
            c.drawString(80, y, requester_name)
            
            y -= 14
            c.setFont("Helvetica", 9)
            c.drawString(30, y, "Igreja:")
            church_name = order.church.name if getattr(order, 'church', None) and order.church.name else f"Igreja #{order.church_id}"
            c.setFont("Helvetica-Bold", 9)
            c.drawString(80, y, church_name)
            
            # Display church city if available
            if getattr(order, 'church', None) and getattr(order.church, 'city', None):
                y -= 14
                c.setFont("Helvetica", 9)
                c.drawString(30, y, "Cidade:")
                c.setFont("Helvetica-Bold", 9)
                c.drawString(80, y, order.church.city)
            
            # Right column: Dates
            y_right = height - 130
            c.setFont("Helvetica", 9)
            c.drawString(width - 200, y_right, "Data:")
            if order.delivered_at:
                try:
                    delivered_str = order.delivered_at.strftime('%d/%m/%Y')
                except Exception:
                    delivered_str = str(order.delivered_at)[:10]
                c.setFont("Helvetica-Bold", 9)
                c.drawString(width - 135, y_right, delivered_str)
            
            y_right -= 14
            c.setFont("Helvetica", 9)
            c.drawString(width - 200, y_right, "Pedido:")
            c.setFont("Helvetica-Bold", 9)
            c.drawString(width - 135, y_right, f"#{order.id}")
            
            y_right -= 14
            c.setFont("Helvetica", 9)
            c.drawString(width - 200, y_right, "Status:")
            c.setFont("Helvetica-Bold", 9)
            c.drawString(width - 135, y_right, order.status.value)
            
            y -= 35
            
            # Table header (gray like #d3d3d3)
            table_y = y
            c.setFillColor(colors.HexColor('#d3d3d3'))
            c.rect(30, table_y - 20, width - 60, 20, fill=True, stroke=True)
            
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(40, table_y - 12, "Item")
            c.drawString(250, table_y - 12, "Descrição")
            c.drawString(420, table_y - 12, "Qtd")
            c.drawString(480, table_y - 12, "Preço Un.")
            
            # Table rows
            table_y -= 20
            item_num = 1
            total = Decimal("0")
            
            for it in order.items:
                # Alternate row colors
                if item_num % 2 == 0:
                    c.setFillColor(colors.HexColor('#F5F5F5'))
                    c.rect(30, table_y - 18, width - 60, 18, fill=True, stroke=False)
                
                c.setFillColor(colors.black)
                c.setFont("Helvetica", 9)
                
                prod = getattr(it, 'product', None) or db.get(Product, it.product_id)
                name = prod.name if prod else f"Produto #{it.product_id}"
                
                # Truncate long names
                if len(name) > 30:
                    name = name[:27] + "..."
                
                c.drawString(40, table_y - 12, str(item_num))
                c.drawString(250, table_y - 12, name)
                c.drawString(420, table_y - 12, str(it.qty))
                c.drawString(480, table_y - 12, f"R$ {it.unit_price:.2f}")
                
                total += it.subtotal
                table_y -= 18
                item_num += 1
                
                # Page break if needed
                if table_y < 180:
                    c.showPage()
                    table_y = height - 50
            
            # Table bottom border
            c.setStrokeColor(colors.black)
            c.line(30, table_y, width - 30, table_y)
            
            # Signature section
            y = 140
            c.setFont("Helvetica-Bold", 9)
            c.drawString(30, y, "Assinatura:")
            c.setFont("Helvetica", 8)
            c.line(30, y - 15, 280, y - 15)
            
            if getattr(order, 'signed_by', None) and getattr(order, 'signed_at', None):
                try:
                    signed_name = order.signed_by.name
                    signed_at = order.signed_at.strftime('%d/%m/%Y %H:%M')
                    c.setFont("Helvetica", 7)
                    c.drawString(30, y - 25, f"Assinado por: {signed_name} em {signed_at}")
                except Exception:
                    pass
            
            c.setFont("Helvetica-Bold", 9)
            c.drawString(310, y, "Data:")
            c.setFont("Helvetica", 8)
            c.line(310, y - 15, 560, y - 15)
            
            # Terms and conditions footer
            y = 80
            c.setFont("Helvetica-Bold", 8)
            c.drawString(30, y, "Termos e Condições:")
            y -= 12
            c.setFont("Helvetica", 7)
            c.drawString(30, y, "Este documento comprova o recebimento dos itens listados acima. Verificar quantidade e qualidade dos produtos no ato do recebimento.")
            y -= 10
            c.drawString(30, y, "Em caso de divergências, entrar em contato com a administração em até 24 horas.")

        # Draw VIA ADMINISTRAÇÃO for this order
        draw_receipt_page("ADMINISTRAÇÃO")
        c.showPage()
        
        # Draw VIA COMPRADOR for this order
        draw_receipt_page("COMPRADOR")
        c.showPage()
    
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
