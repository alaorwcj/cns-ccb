from __future__ import annotations
from typing import Any, Dict, Optional, Union
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audit_log import AuditLog, AuditAction, AuditResource


class AuditService:
    """Service for logging audit events"""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def create_audit_log(
        db: Session,
        user_id: Optional[int],
        action: Union[AuditAction, str],
        resource: Union[AuditResource, str],
        resource_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Create and save an audit log entry"""

        # Convert enums to strings if needed
        action_str = action.value if isinstance(action, AuditAction) else action
        resource_str = resource.value if isinstance(resource, AuditResource) else resource

        audit_log = AuditLog(
            user_id=user_id,
            action=action_str,
            resource=resource_str,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            success=success,
            error_message=error_message,
            extra_metadata=extra_metadata,
        )

        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return audit_log

    def log_auth_event(
        self,
        user_id: Optional[int],
        action: str,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log authentication events"""
        return self.create_audit_log(
            db=self.db,
            user_id=user_id,
            action=action,
            resource=AuditResource.AUTH,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            extra_metadata=extra_metadata,
        )

    def log_crud_operation(
        self,
        user_id: int,
        action: str,
        resource: str,
        resource_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log CRUD operations"""
        return self.create_audit_log(
            db=self.db,
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            old_values=old_values,
            new_values=new_values,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_metadata=extra_metadata,
        )

    def log_user_action(
        self,
        user_id: int,
        action: str,
        target_user_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log user-related actions"""
        return self.log_crud_operation(
            user_id=user_id,
            action=action,
            resource=AuditResource.USER,
            resource_id=target_user_id,
            old_values=old_values,
            new_values=new_values,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_metadata=extra_metadata,
        )

    def log_order_action(
        self,
        user_id: int,
        action: str,
        order_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log order-related actions"""
        return self.log_crud_operation(
            user_id=user_id,
            action=action,
            resource=AuditResource.ORDER,
            resource_id=order_id,
            old_values=old_values,
            new_values=new_values,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_metadata=extra_metadata,
        )

    def log_product_action(
        self,
        user_id: int,
        action: str,
        product_id: Optional[int] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log product-related actions"""
        return self.log_crud_operation(
            user_id=user_id,
            action=action,
            resource=AuditResource.PRODUCT,
            resource_id=product_id,
            old_values=old_values,
            new_values=new_values,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_metadata=extra_metadata,
        )

    def log_security_event(
        self,
        user_id: Optional[int],
        action: str,
        resource: str = "SYSTEM",
        resource_id: Optional[int] = None,
        success: bool = False,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Log security-related events (unauthorized access, etc.)"""
        return self.create_audit_log(
            db=self.db,
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            extra_metadata=extra_metadata,
        )


# Convenience functions for easy auditing
def audit_log(
    db: Session,
    user_id: Optional[int],
    action: Union[AuditAction, str],
    resource: Union[AuditResource, str],
    **kwargs
) -> AuditLog:
    """Convenience function to create audit logs"""
    return AuditService.create_audit_log(db, user_id, action, resource, **kwargs)