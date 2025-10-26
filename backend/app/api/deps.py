from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user_token


def db_dep(db: Session = Depends(get_db)) -> Session:
    return db


def require_role(required: str):
    def _checker(payload: dict = Depends(get_current_user_token)):
        role = payload.get("role")
        if role != required:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return payload

    return _checker
