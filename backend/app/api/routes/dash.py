from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role, get_current_user_token
from app.services.dash import overview, user_overview

router = APIRouter(prefix="/dash", tags=["dash"]) 


@router.get("/overview")
def get_overview(db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return overview(db)


@router.get("/user-overview")
def get_user_overview(
    db: Session = Depends(db_dep),
    current_user: dict = Depends(get_current_user_token)
):
    return user_overview(db, current_user["user_id"])
