from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.schemas.category import CategoryCreate, CategoryRead
from app.services.categories import list_categories, create_category

router = APIRouter(prefix="/categories", tags=["categories"]) 


@router.get("", response_model=List[CategoryRead])
def get_categories(db: Session = Depends(db_dep)):
    return list_categories(db)


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def post_category(data: CategoryCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return create_category(db, data.name)
