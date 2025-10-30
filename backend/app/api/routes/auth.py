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
from app.schemas.auth import TokenPair, LoginRequest, ResetInitRequest, ResetConfirmRequest, ChangePasswordRequest
from app.services.users import get_by_email
from app.services.password_reset import init_reset, confirm_reset
from app.api.deps import db_dep, require_role, get_current_user_token
from app.models.user import User

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
def reset_init(req: ResetInitRequest, db: Session = Depends(db_dep)):
    """Public endpoint for forgot password - sends reset email if user exists"""
    user = get_by_email(db, req.email)
    if not user:
        # Don't reveal if user exists or not for security
        return {
            "status": "ok", 
            "message": "Se o email estiver cadastrado, você receberá as instruções de redefinição",
            "fallback_info": "Caso não receba o email, entre em contato com o administrador"
        }
    
    # Send email with reset token
    pr = init_reset(db, user=user, send_email=True)
    
    # If email service is not configured, provide fallback
    from app.services.email_service import email_service
    if not email_service._is_configured():
        return {
            "status": "ok",
            "message": "Email não configurado. Entre em contato com o administrador",
            "admin_token": pr.token,  # Only show if email is not configured
            "expires_at": pr.expires_at
        }
    
    return {
        "status": "ok", 
        "message": "Se o email estiver cadastrado, você receberá as instruções de redefinição"
    }


@router.post("/reset/init-admin")
def reset_init_admin(req: ResetInitRequest, db: Session = Depends(db_dep), _adm=Depends(require_role("ADM"))):
    """Admin-only endpoint for generating password reset tokens"""
    user = get_by_email(db, req.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # For admin, don't send email, return token directly
    pr = init_reset(db, user=user, send_email=False)
    return {"token": pr.token, "expires_at": pr.expires_at}


@router.post("/reset/confirm")
def reset_confirm(req: ResetConfirmRequest, db: Session = Depends(db_dep)):
    ok = confirm_reset(db, token=req.token, new_password=req.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    return {"status": "ok"}


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, db: Session = Depends(db_dep), current_user: dict = Depends(get_current_user_token)):
    """Allow logged-in users to change their own password"""
    user = db.get(User, current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    from app.core.security import get_password_hash
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    
    return {"status": "ok", "message": "Password changed successfully"}
