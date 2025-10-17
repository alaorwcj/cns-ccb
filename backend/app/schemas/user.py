from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    church_ids: List[int] = []


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True
