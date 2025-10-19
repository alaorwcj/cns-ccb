from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, and_, or_, func

from app.api.deps import db_dep, require_role
from app.models.audit_log import AuditLog, AuditAction, AuditResource
from app.models.user import User
from app.schemas.audit import AuditLogRead, AuditLogFilter


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=List[AuditLogRead])
def get_audit_logs(
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
    # Filters
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    resource_id: Optional[int] = Query(None, description="Filter by resource ID"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    # Date range
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    # Pagination
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=1000, description="Number of records to return"),
    # Search
    search: Optional[str] = Query(None, description="Search in error messages and metadata"),
):
    """
    Get audit logs with filtering and pagination.
    Only accessible to ADM users.
    """

    # Build query with user join
    query = select(AuditLog, User.name.label("user_name")).outerjoin(User, AuditLog.user_id == User.id)

    # Apply filters
    filters = []
    if user_id is not None:
        filters.append(AuditLog.user_id == user_id)
    if action:
        filters.append(AuditLog.action == action)
    if resource:
        filters.append(AuditLog.resource == resource)
    if resource_id is not None:
        filters.append(AuditLog.resource_id == resource_id)
    if success is not None:
        filters.append(AuditLog.success == success)
    if start_date:
        filters.append(AuditLog.timestamp >= start_date)
    if end_date:
        filters.append(AuditLog.timestamp <= end_date)
    if search:
        # Search in error messages and metadata
        search_filter = or_(
            AuditLog.error_message.ilike(f"%{search}%"),
            AuditLog.extra_metadata.cast(str).ilike(f"%{search}%")
        )
        filters.append(search_filter)

    if filters:
        query = query.where(and_(*filters))

    # Order by timestamp descending (most recent first)
    query = query.order_by(desc(AuditLog.timestamp))

    # Apply pagination
    query = query.offset(skip).limit(limit)

    # Execute query
    results = db.execute(query).all()
    
    # Convert to AuditLogRead objects
    audit_logs = []
    for audit_log, user_name in results:
        audit_log_dict = {
            "id": audit_log.id,
            "timestamp": audit_log.timestamp,
            "user_id": audit_log.user_id,
            "user_name": user_name,
            "action": audit_log.action,
            "resource": audit_log.resource,
            "resource_id": audit_log.resource_id,
            "old_values": audit_log.old_values,
            "new_values": audit_log.new_values,
            "ip_address": audit_log.ip_address,
            "user_agent": audit_log.user_agent,
            "session_id": audit_log.session_id,
            "success": audit_log.success,
            "error_message": audit_log.error_message,
            "extra_metadata": audit_log.extra_metadata,
        }
        audit_logs.append(AuditLogRead(**audit_log_dict))

    return audit_logs


@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    """
    Get audit statistics summary.
    """

    # Total logs
    total_logs = db.scalar(select(func.count(AuditLog.id)))

    # Logs by action
    action_stats = db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
    ).all()

    # Logs by resource
    resource_stats = db.execute(
        select(AuditLog.resource, func.count(AuditLog.id))
        .group_by(AuditLog.resource)
    ).all()

    # Success/failure ratio
    success_stats = db.execute(
        select(AuditLog.success, func.count(AuditLog.id))
        .group_by(AuditLog.success)
    ).all()

    # Recent failed operations
    recent_failures = db.scalars(
        select(AuditLog)
        .where(AuditLog.success == False)
        .order_by(desc(AuditLog.timestamp))
        .limit(10)
    ).all()

    return {
        "total_logs": total_logs,
        "action_stats": dict(action_stats),
        "resource_stats": dict(resource_stats),
        "success_stats": dict(success_stats),
        "recent_failures": [
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "action": log.action,
                "resource": log.resource,
                "error_message": log.error_message,
            }
            for log in recent_failures
        ],
    }


@router.get("/{audit_id}", response_model=AuditLogRead)
def get_audit_log(
    audit_id: int,
    db: Session = Depends(db_dep),
    _admin=Depends(require_role("ADM")),
):
    """
    Get a specific audit log by ID.
    """
    audit_log = db.get(AuditLog, audit_id)
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    return audit_log