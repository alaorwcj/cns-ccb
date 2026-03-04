"""WhatsApp notification service using Twilio API."""
from twilio.rest import Client
from app.core.config import settings


def send_whatsapp_message(to_phone: str, message: str) -> dict:
    """
    Send a WhatsApp message using Twilio.
    
    Args:
        to_phone: Phone number with country code (e.g., 5511999999999)
        message: Text message to send
        
    Returns:
        dict with status and message_sid on success, or error on failure
    """
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        return {"success": False, "error": "Twilio not configured"}
    
    if not settings.twilio_whatsapp_from:
        return {"success": False, "error": "Twilio WhatsApp number not configured"}
    
    # Ensure to_phone has proper format
    to_phone_clean = to_phone.lstrip("+")
    if not to_phone_clean.startswith("whatsapp:"):
        to_phone_formatted = f"whatsapp:+{to_phone_clean}"
    else:
        to_phone_formatted = to_phone
    
    from_phone = settings.twilio_whatsapp_from
    if not from_phone.startswith("whatsapp:"):
        from_phone = f"whatsapp:{from_phone}"
    
    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        
        msg = client.messages.create(
            body=message,
            from_=from_phone,
            to=to_phone_formatted
        )
        
        return {
            "success": True,
            "message_sid": msg.sid,
            "status": msg.status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def format_order_message(order: dict) -> str:
    """
    Format an order into a WhatsApp message.
    
    Args:
        order: Order dict with id, church_name, church_city, items, status, created_at
        
    Returns:
        Formatted message string
    """
    items_text = "\n".join([
        f"• {item.get('product_name', 'Produto')} × {item.get('qty', item.get('quantity', 0))}"
        for item in order.get("items", [])
    ])
    
    total = sum(
        float(item.get("subtotal", 0))
        for item in order.get("items", [])
    )
    
    from datetime import datetime
    created_at = order.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except:
            pass
    
    if isinstance(created_at, datetime):
        date_str = created_at.strftime("%d/%m/%Y")
    else:
        date_str = str(created_at)[:10] if created_at else "N/A"
    
    message = f"""📋 *PEDIDO #{order.get('id', 'N/A')}*
Igreja: {order.get('church_name', 'N/A')} - {order.get('church_city', 'N/A')}
Data: {date_str}

*ITENS:*
{items_text}

Total: R$ {total:,.2f}
Status: {order.get('status', 'N/A')}"""
    
    return message
