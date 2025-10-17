from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserRead
from app.services.users import list_users, create_user

router = APIRouter(prefix="/users", tags=["users"]) 


@router.get("", response_model=List[UserRead])
def get_users(
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    return list_users(db)


@router.post("", response_model=UserRead, status_code=201)
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
