from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.categories import list_categories, create_category, update_category, delete_category

router = APIRouter(prefix="/categories", tags=["categories"]) 


@router.get("", response_model=List[CategoryRead])
def get_categories(db: Session = Depends(db_dep)):
    return list_categories(db)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def post_category(data: CategoryCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return create_category(db, data.name)


@router.put("/{category_id}", response_model=CategoryRead)
def put_category(category_id: int, data: CategoryUpdate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    cat = update_category(db, category_id, data.name)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.delete("/{category_id}")
def delete_category_route(category_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    ok = delete_category(db, category_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "ok"}
