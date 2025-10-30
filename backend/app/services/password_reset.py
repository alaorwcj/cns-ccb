from __future__ import annotations
from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.password_reset import PasswordReset
from app.models.user import User
from app.core.security import get_password_hash
from app.services.email_service import email_service


def init_reset(db: Session, *, user: User, ttl_minutes: int = 60 * 24, send_email: bool = True) -> PasswordReset:
    """Create a password reset token and optionally send email"""
    token = secrets.token_urlsafe(32)
    pr = PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        used=False,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    
    # Send email if requested and email service is configured
    if send_email:
        email_sent = email_service.send_password_reset_email(
            to_email=user.email,
            user_name=user.name,
            reset_token=token
        )
        if not email_sent:
            # Log warning but don't fail the process
            print(f"Warning: Failed to send password reset email to {user.email}")
    
    return pr


def confirm_reset(db: Session, *, token: str, new_password: str) -> bool:
    pr = db.scalar(select(PasswordReset).where(PasswordReset.token == token))
    if not pr or pr.used:
        return False
    now = datetime.now(timezone.utc)
    if pr.expires_at < now:
        return False
    user = db.get(User, pr.user_id)
    if not user:
        return False
    user.password_hash = get_password_hash(new_password)
    pr.used = True
    db.commit()
    return True
