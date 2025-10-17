from __future__ import annotations
import os
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.services.users import create_user


def run_bootstrap() -> None:
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "Admin")
    if not admin_email or not admin_password:
        return

    db: Session = SessionLocal()
    try:
        exists = db.scalar(select(User).where(User.email == admin_email))
        if exists:
            return
        create_user(
            db,
            name=admin_name,
            email=admin_email,
            phone=None,
            role=UserRole.ADM,
            password=admin_password,
            church_ids=[],
        )
        print("Bootstrap: admin user created")
    finally:
        db.close()


if __name__ == "__main__":
    run_bootstrap()
