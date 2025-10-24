from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import db_dep, require_role
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.schemas.auth import TokenPair, LoginRequest, ResetInitRequest, ResetConfirmRequest
from app.services.users import get_by_email
from app.services.password_reset import init_reset, confirm_reset

router = APIRouter(prefix="/auth", tags=["auth"]) 


class RefreshRequest(BaseModel):
    refresh: str


@router.post("/login", response_model=TokenPair)
def login(data: LoginRequest, db: Session = Depends(db_dep)):
    user = get_by_email(db, data.username)
    if not user or not verify_password(data.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    claims = {"role": user.role.value, "user_id": user.id}
    return TokenPair(
        access=create_access_token(str(user.id), extra=claims),
        refresh=create_refresh_token(str(user.id), extra=claims),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(req: RefreshRequest):
    payload = decode_token(req.refresh)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    claims = {k: v for k, v in payload.items() if k in {"role", "user_id"}}
    user_id = payload["sub"]
    return TokenPair(
        access=create_access_token(user_id, extra=claims),
        refresh=create_refresh_token(user_id, extra=claims),
    )


@router.post("/reset/init")
def reset_init(req: ResetInitRequest, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    user = get_by_email(db, req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    pr = init_reset(db, user=user)
    # For now, return the token so ADM can share it securely
    return {"token": pr.token, "expires_at": pr.expires_at}


@router.post("/reset/confirm")
def reset_confirm(req: ResetConfirmRequest, db: Session = Depends(db_dep)):
    ok = confirm_reset(db, token=req.token, new_password=req.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"status": "ok"}
