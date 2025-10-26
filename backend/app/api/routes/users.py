from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.users import list_users, create_user, update_user, delete_user, toggle_active

router = APIRouter(prefix="/users", tags=["users"]) 


@router.get("", response_model=List[UserRead])
def get_users(
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    return list_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def post_user(
    data: UserCreate,
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    user = create_user(
        db,
        name=data.name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        password=data.password,
        church_ids=data.church_ids,
    )
    return user


@router.put("/{user_id}", response_model=UserRead)
def put_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return update_user(
        db,
        user=user,
        name=data.name,
        email=data.email,
        phone=data.phone,
        role=data.role,
        password=data.password,
        church_ids=data.church_ids,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_route(
    user_id: int,
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    delete_user(db, user)
    return None


@router.patch("/{user_id}/toggle-active", response_model=UserRead)
def toggle_active_route(
    user_id: int,
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return toggle_active(db, user)
