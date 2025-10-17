from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.services.dash import overview

router = APIRouter(prefix="/dash", tags=["dash"]) 


@router.get("/overview")
def get_overview(db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    return overview(db)
