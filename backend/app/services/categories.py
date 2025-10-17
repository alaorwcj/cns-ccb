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
