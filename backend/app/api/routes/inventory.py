from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.core.security import get_current_user_token
from app.schemas.inventory import (
    InventoryCreate,
    InventoryRead,
    InventoryUpdate,
    InventoryItemUpdate,
    InventoryListResponse,
    InventoryItemRead
)
from app.services import inventory as inventory_service

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("", response_model=InventoryRead, status_code=status.HTTP_201_CREATED)
def create_inventory(
    data: InventoryCreate,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
    payload: dict = Depends(get_current_user_token)
):
    """Create a new inventory count (ADM only). Includes all products."""
    user_id = int(payload.get("user_id"))
    inventory = inventory_service.create_inventory(db, user_id, data)
    
    # Add creator name and product names to items
    inventory.created_by_name = inventory.created_by.name if inventory.created_by else None
    for item in inventory.items:
        item.product_name = item.product.name if item.product else None
    
    return inventory


@router.get("", response_model=InventoryListResponse)
def list_inventories(
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM"))
):
    """List all inventories (ADM only)."""
    inventories = inventory_service.list_inventories(db)
    
    # Add creator names and product names
    for inv in inventories:
        inv.created_by_name = inv.created_by.name if inv.created_by else None
        for item in inv.items:
            item.product_name = item.product.name if item.product else None
    
    return {"data": inventories, "total": len(inventories)}


@router.get("/{inventory_id}", response_model=InventoryRead)
def get_inventory(
    inventory_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM"))
):
    """Get inventory details (ADM only)."""
    inventory = inventory_service.get_inventory(db, inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    # Add creator name and product names
    inventory.created_by_name = inventory.created_by.name if inventory.created_by else None
    for item in inventory.items:
        item.product_name = item.product.name if item.product else None
    
    return inventory


@router.put("/{inventory_id}", response_model=InventoryRead)
def update_inventory(
    inventory_id: int,
    data: InventoryUpdate,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
    payload: dict = Depends(get_current_user_token)
):
    """Update inventory notes (ADM only)."""
    user_id = int(payload.get("user_id"))
    
    try:
        inventory = inventory_service.update_inventory(db, inventory_id, user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Add creator name and product names
    inventory.created_by_name = inventory.created_by.name if inventory.created_by else None
    for item in inventory.items:
        item.product_name = item.product.name if item.product else None
    
    return inventory


@router.put("/{inventory_id}/items/{item_id}", response_model=InventoryItemRead)
def update_item_count(
    inventory_id: int,
    item_id: int,
    data: InventoryItemUpdate,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
    payload: dict = Depends(get_current_user_token)
):
    """Update counted quantity for an item (ADM only)."""
    user_id = int(payload.get("user_id"))
    
    try:
        item = inventory_service.update_item_count(db, inventory_id, item_id, user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Add product name
    item.product_name = item.product.name if item.product else None
    
    return item


@router.post("/{inventory_id}/finalize", response_model=InventoryRead)
def finalize_inventory(
    inventory_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
    payload: dict = Depends(get_current_user_token)
):
    """Finalize inventory and adjust stock (ADM only)."""
    user_id = int(payload.get("user_id"))
    
    try:
        inventory = inventory_service.finalize_inventory(db, inventory_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Add creator name and product names
    inventory.created_by_name = inventory.created_by.name if inventory.created_by else None
    for item in inventory.items:
        item.product_name = item.product.name if item.product else None
    
    return inventory


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
    payload: dict = Depends(get_current_user_token)
):
    """Delete an inventory (only if not finalized) (ADM only)."""
    user_id = int(payload.get("user_id"))
    
    try:
        deleted = inventory_service.delete_inventory(db, inventory_id, user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Inventory not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return None
