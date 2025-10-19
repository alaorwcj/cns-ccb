from __future__ import annotations
from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, Optional, Union
from sqlalchemy.orm import Session

from app.services.audit import AuditService
from app.models.audit_log import AuditAction, AuditResource


def audit_operation(
    action: Union[AuditAction, str],
    resource: Union[AuditResource, str],
    get_user_id: Callable = None,
    get_resource_id: Callable = None,
    capture_old_values: bool = False,
    capture_new_values: bool = False,
):
    """
    Decorator to audit service operations

    Args:
        action: The audit action (CREATE, UPDATE, DELETE, etc.)
        resource: The resource type being operated on
        get_user_id: Function to extract user_id from function arguments
        get_resource_id: Function to extract resource_id from function arguments
        capture_old_values: Whether to capture old values before operation
        capture_new_values: Whether to capture new values after operation
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get database session (assume it's the first argument after self)
            db = None
            for arg in args:
                if isinstance(arg, Session):
                    db = arg
                    break

            if not db:
                # If no session found, just execute the function
                return func(*args, **kwargs)

            audit_service = AuditService(db)

            # Extract user_id
            user_id = None
            if get_user_id:
                try:
                    user_id = get_user_id(*args, **kwargs)
                except:
                    pass

            # Extract resource_id
            resource_id = None
            if get_resource_id:
                try:
                    resource_id = get_resource_id(*args, **kwargs)
                except:
                    pass

            # Capture old values if needed
            old_values = None
            if capture_old_values and resource_id:
                # This would need to be implemented per service
                # For now, we'll skip this complexity
                pass

            try:
                # Execute the original function
                result = func(*args, **kwargs)

                # Capture new values if needed
                new_values = None
                if capture_new_values and result:
                    # Convert result to dict for logging
                    if hasattr(result, '__dict__'):
                        new_values = {}
                        for k, v in result.__dict__.items():
                            if not k.startswith('_'):
                                # Convert datetime objects to ISO strings
                                if isinstance(v, datetime):
                                    new_values[k] = v.isoformat()
                                # Convert enum objects to their values
                                elif hasattr(v, 'value'):
                                    new_values[k] = v.value
                                # Skip complex objects that can't be serialized
                                elif hasattr(v, '__dict__') or isinstance(v, (list, dict)):
                                    continue  # Skip relationships and complex objects
                                else:
                                    new_values[k] = v

                # Log successful operation
                audit_service.log_crud_operation(
                    user_id=user_id,
                    action=action,
                    resource=resource,
                    resource_id=resource_id,
                    old_values=old_values,
                    new_values=new_values,
                    success=True,
                )

                return result

            except Exception as e:
                # Log failed operation
                audit_service.log_crud_operation(
                    user_id=user_id,
                    action=action,
                    resource=resource,
                    resource_id=resource_id,
                    success=False,
                    error_message=str(e),
                )
                raise

        return wrapper
    return decorator


# Convenience decorators for common operations
def audit_create(resource: Union[AuditResource, str]):
    """Decorator for CREATE operations"""
    return audit_operation(
        action=AuditAction.CREATE,
        resource=resource,
        capture_new_values=True,
    )

def audit_update(resource: Union[AuditResource, str]):
    """Decorator for UPDATE operations"""
    return audit_operation(
        action=AuditAction.UPDATE,
        resource=resource,
        capture_old_values=True,
        capture_new_values=True,
    )

def audit_delete(resource: Union[AuditResource, str]):
    """Decorator for DELETE operations"""
    return audit_operation(
        action=AuditAction.DELETE,
        resource=resource,
        capture_old_values=True,
    )


# Helper functions for extracting IDs from common patterns
def extract_user_id_from_token(*args, **kwargs) -> Optional[int]:
    """Extract user_id from JWT token in kwargs"""
    token_data = kwargs.get('current_user') or kwargs.get('token_data')
    if token_data and isinstance(token_data, dict):
        return token_data.get('user_id') or token_data.get('sub')
    return None

def extract_id_from_obj(obj) -> Optional[int]:
    """Extract ID from object (first argument after db)"""
    if hasattr(obj, 'id'):
        return obj.id
    return None

def extract_id_from_kwargs(key: str = 'id') -> Callable:
    """Create function to extract ID from kwargs"""
    def extractor(*args, **kwargs) -> Optional[int]:
        return kwargs.get(key)
    return extractor