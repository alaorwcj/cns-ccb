from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.stock_movement import MovementType
from app.schemas.stock import StockMovementCreate, StockMovementRead
from app.services.stock import add_movement, list_movements

router = APIRouter(prefix="/stock", tags=["stock"]) 


@router.get("/movements", response_model=List[StockMovementRead])
def get_movements(
    db: Session = Depends(db_dep),
    product_id: Optional[int] = None,
    type: Optional[MovementType] = None,
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
):
    return list_movements(db, product_id=product_id, type=type, start=start, end=end)


@router.post("/movements", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def post_movement(data: StockMovementCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    try:
        return add_movement(db, **data.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
