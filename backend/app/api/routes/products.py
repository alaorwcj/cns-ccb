from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate, ProductListResponse
from app.services.products import (
    count_products,
    list_products,
    create_product,
    get_product,
    update_product,
    delete_product,
    duplicate_product,
)

router = APIRouter(prefix="/products", tags=["products"]) 


@router.get("", response_model=ProductListResponse)
def get_products(
    db: Session = Depends(db_dep),
    category_id: Optional[int] = None,
    q: Optional[str] = Query(default=None, alias="search"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
):
    data = list_products(db, category_id=category_id, q=q, page=page, limit=limit)
    total = count_products(db, category_id=category_id, q=q)
    return ProductListResponse(data=data, total=total, page=page, limit=limit)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def post_product(data: ProductCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return create_product(db, **data.dict())


@router.put("/{product_id}", response_model=ProductRead)
def put_product(product_id: int, data: ProductUpdate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    prod = get_product(db, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return update_product(db, prod, **data.dict(exclude_unset=True))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_route(product_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    prod = get_product(db, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    delete_product(db, prod)
    return None


@router.post("/{product_id}/duplicate", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def duplicate_product_route(product_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    prod = get_product(db, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return duplicate_product(db, prod)


@router.patch("/{product_id}/toggle-active", response_model=ProductRead)
def toggle_active_product(product_id: int, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    prod = get_product(db, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    prod.is_active = not prod.is_active
    db.commit()
    db.refresh(prod)
    return prod
