from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.category import Category


def list_categories(db: Session) -> List[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)))


def create_category(db: Session, name: str) -> Category:
    cat = Category(name=name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_category(db: Session, category_id: int, name: str) -> Optional[Category]:
    cat = db.get(Category, category_id)
    if not cat:
        return None
    cat.name = name
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int) -> bool:
    cat = db.get(Category, category_id)
    if not cat:
        return False
    db.delete(cat)
    db.commit()
    return True
