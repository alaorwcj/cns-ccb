from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.stock_movement import MovementType
from app.schemas.stock import StockMovementCreate, StockMovementRead, StockMovementListResponse, BatchEntryCreate
from app.services.stock import add_movement, list_movements

router = APIRouter(prefix="/stock", tags=["stock"]) 


@router.get("/movements", response_model=StockMovementListResponse)
def get_movements(
    db: Session = Depends(db_dep),
    product_id: Optional[int] = None,
    type: Optional[MovementType] = None,
    start: Optional[datetime] = Query(default=None),
    end: Optional[datetime] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    _adm=Depends(require_role("ADM")),
):
    from app.services.stock import count_movements
    movements = list_movements(db, product_id=product_id, type=type, start=start, end=end, page=page, limit=limit)
    total = count_movements(db, product_id=product_id, type=type, start=start, end=end)
    return StockMovementListResponse(data=movements, total=total, page=page, limit=limit)


@router.post("/movements", response_model=StockMovementRead, status_code=status.HTTP_201_CREATED)
def post_movement(data: StockMovementCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    try:
        return add_movement(db, **data.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch-entry", status_code=status.HTTP_201_CREATED)
def post_batch_entry(data: BatchEntryCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    """
    Criar entrada múltipla de estoque com nota fiscal.
    Todos os itens são processados em uma transação única.
    """
    if not data.items:
        raise HTTPException(status_code=400, detail="Nenhum item fornecido")
    
    try:
        created_movements = []
        for item in data.items:
            movement = add_movement(
                db=db,
                product_id=item.product_id,
                type=MovementType.ENTRADA,
                qty=item.qty,
                unit_price=item.unit_price,
                invoice_number=data.invoice_number,
                invoice_date=data.invoice_date,
                note=data.note,
                commit=False,  # Não commitar individualmente
            )
            created_movements.append(movement)
        
        db.commit()  # Commit único para todos os itens
        return {
            "message": f"{len(created_movements)} movimentações criadas com sucesso",
            "movements": [{"id": m.id, "product_id": m.product_id, "qty": m.qty} for m in created_movements]
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar entrada múltipla: {str(e)}")
