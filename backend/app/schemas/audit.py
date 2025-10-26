from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel

from app.models.audit_log import AuditAction, AuditResource


class AuditLogRead(BaseModel):
    """Schema for reading audit logs"""

    id: int
    timestamp: datetime
    user_id: Optional[int]
    user_name: Optional[str]
    action: str
    resource: str
    resource_id: Optional[int]
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    success: bool
    error_message: Optional[str]
    extra_metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs"""

    user_id: Optional[int] = None
    action: Optional[AuditAction] = None
    resource: Optional[AuditResource] = None
    resource_id: Optional[int] = None
    success: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None


class AuditStats(BaseModel):
    """Schema for audit statistics"""

    total_logs: int
    action_stats: Dict[str, int]
    resource_stats: Dict[str, int]
    success_stats: Dict[bool, int]
    recent_failures: list[Dict[str, Any]]