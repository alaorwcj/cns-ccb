from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.church import Church
from app.schemas.church import ChurchCreate, ChurchRead
from app.services.churches import list_churches, list_cities, create_church, update_church, delete_church

router = APIRouter(prefix="/churches", tags=["churches"]) 


@router.get("", response_model=List[ChurchRead])
def get_churches(db: Session = Depends(db_dep)):
    return list_churches(db)


@router.get("/cities", response_model=List[str])
def get_cities(db: Session = Depends(db_dep)):
    return list_cities(db)


@router.post("", response_model=ChurchRead, status_code=status.HTTP_201_CREATED)
def post_church(data: ChurchCreate, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return create_church(db, data.name, data.city)


@router.put("/{church_id}", response_model=ChurchRead)
def put_church(
    church_id: int,
    data: ChurchCreate,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    return update_church(db, church, data.name, data.city)


@router.delete("/{church_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_church_route(
    church_id: int,
    db: Session = Depends(db_dep),
    _adm=Depends(require_role("ADM")),
):
    church = db.get(Church, church_id)
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    delete_church(db, church)
    return None
