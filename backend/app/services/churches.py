from __future__ import annotations
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.church import Church


def list_churches(db: Session) -> List[Church]:
    return list(db.scalars(select(Church).order_by(Church.city, Church.name)))


def list_cities(db: Session) -> List[str]:
    cities = db.execute(select(Church.city).distinct().order_by(Church.city)).scalars().all()
    return list(cities)


def create_church(db: Session, name: str, city: str) -> Church:
    ch = Church(name=name, city=city)
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


def update_church(db: Session, church: Church, name: str, city: str) -> Church:
    church.name = name
    church.city = city
    db.commit()
    db.refresh(church)
    return church


def delete_church(db: Session, church: Church) -> None:
    db.delete(church)
    db.commit()
