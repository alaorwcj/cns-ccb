from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.inventory import InventoryCount, InventoryItem, InventoryStatus
from app.models.product import Product
from app.models.stock_movement import StockMovement, MovementType
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryItemUpdate
from app.services.audit import audit_log
from app.models.audit_log import AuditAction, AuditResource


def create_inventory(db: Session, user_id: int, data: InventoryCreate) -> InventoryCount:
    """Create a new inventory count with all products."""
    # Get all products
    products = db.scalars(select(Product)).all()
    
    # Create inventory count
    inventory = InventoryCount(
        created_by_id=user_id,
        status=InventoryStatus.EM_ANDAMENTO,
        notes=data.notes
    )
    db.add(inventory)
    db.flush()
    
    # Create items for each product with current stock as expected qty
    for product in products:
        item = InventoryItem(
            inventory_id=inventory.id,
            product_id=product.id,
            expected_qty=product.stock_qty,
            counted_qty=None,
            difference=None,
            adjusted=False,
        )
        db.add(item)
    
    db.commit()
    db.refresh(inventory)
    
    # Audit log
    audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.CREATE,
        resource=AuditResource.INVENTORY,
        resource_id=inventory.id,
        extra_metadata={"notes": data.notes, "total_products": len(products)}
    )
    
    return inventory


def list_inventories(db: Session, limit: int = 50) -> List[InventoryCount]:
    """List all inventories, most recent first."""
    stmt = select(InventoryCount).order_by(InventoryCount.created_at.desc()).limit(limit)
    return list(db.scalars(stmt))


def get_inventory(db: Session, inventory_id: int) -> InventoryCount | None:
    """Get inventory by ID with items."""
    return db.get(InventoryCount, inventory_id)


def update_inventory(db: Session, inventory_id: int, user_id: int, data: InventoryUpdate) -> InventoryCount:
    """Update inventory notes."""
    inventory = db.get(InventoryCount, inventory_id)
    if not inventory:
        raise ValueError("Inventory not found")
    
    if inventory.status == InventoryStatus.FINALIZADO:
        raise ValueError("Cannot update finalized inventory")
    
    if data.notes is not None:
        inventory.notes = data.notes
    
    db.commit()
    db.refresh(inventory)
    
    return inventory


def update_item_count(
    db: Session,
    inventory_id: int,
    item_id: int,
    user_id: int,
    data: InventoryItemUpdate
) -> InventoryItem:
    """Update counted quantity for an inventory item."""
    inventory = db.get(InventoryCount, inventory_id)
    if not inventory:
        raise ValueError("Inventory not found")
    
    if inventory.status == InventoryStatus.FINALIZADO:
        raise ValueError("Cannot update finalized inventory")
    
    item = db.get(InventoryItem, item_id)
    if not item or item.inventory_id != inventory_id:
        raise ValueError("Item not found or doesn't belong to this inventory")
    
    item.counted_qty = data.counted_qty
    item.difference = data.counted_qty - item.expected_qty
    
    db.commit()
    db.refresh(item)
    
    return item


def finalize_inventory(db: Session, inventory_id: int, user_id: int) -> InventoryCount:
    """Finalize inventory and create stock adjustment movements."""
    inventory = db.get(InventoryCount, inventory_id)
    if not inventory:
        raise ValueError("Inventory not found")
    
    if inventory.status == InventoryStatus.FINALIZADO:
        raise ValueError("Inventory already finalized")
    
    # Check all items have been counted
    uncounted = [item for item in inventory.items if item.counted_qty is None]
    if uncounted:
        raise ValueError(f"{len(uncounted)} items not counted yet")
    
    # Create adjustment movements for items with differences
    adjustments_made = 0
    for item in inventory.items:
        if item.difference != 0:
            # Create stock movement
            movement_type = MovementType.ENTRADA if item.difference > 0 else MovementType.SAIDA_MANUAL
            qty = abs(item.difference)
            
            movement = StockMovement(
                product_id=item.product_id,
                type=movement_type,
                qty=qty,
                note=f"Ajuste de inventário #{inventory.id}"
            )
            db.add(movement)
            
            # Update product stock
            product = db.get(Product, item.product_id)
            if product:
                if movement_type == MovementType.ENTRADA:
                    product.stock_qty = (product.stock_qty or 0) + qty
                else:
                    product.stock_qty = (product.stock_qty or 0) - qty
            
            item.adjusted = True
            adjustments_made += 1
    
    # Mark inventory as finalized
    inventory.status = InventoryStatus.FINALIZADO
    inventory.finalized_at = datetime.utcnow()
    
    db.commit()
    db.refresh(inventory)
    
    # Audit log
    audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.UPDATE,
        resource=AuditResource.INVENTORY,
        resource_id=inventory.id,
        extra_metadata={
            "finalized": True,
            "adjustments_made": adjustments_made,
            "total_items": len(inventory.items)
        }
    )
    
    return inventory


def delete_inventory(db: Session, inventory_id: int, user_id: int) -> bool:
    """Delete an inventory (only if not finalized)."""
    inventory = db.get(InventoryCount, inventory_id)
    if not inventory:
        return False
    
    if inventory.status == InventoryStatus.FINALIZADO:
        raise ValueError("Cannot delete finalized inventory")
    
    # Audit log before deletion
    audit_log(
        db=db,
        user_id=user_id,
        action=AuditAction.DELETE,
        resource=AuditResource.INVENTORY,
        resource_id=inventory.id,
        extra_metadata={"status": inventory.status.value}
    )
    
    db.delete(inventory)
    db.commit()
    
    return True
