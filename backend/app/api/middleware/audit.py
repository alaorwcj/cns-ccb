from __future__ import annotations
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.session import get_db
from app.services.audit import AuditService
from app.models.audit_log import AuditResource
from app.core.security import decode_token


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to audit HTTP requests and authentication events"""

    def __init__(self, app: Callable, exclude_paths: list[str] = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/redoc", "/openapi.json"]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auditing for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Get database session
        db: Session = next(get_db())

        try:
            # Extract user info from JWT token in Authorization header
            user_id = None
            session_id = None
            
            auth_header = request.headers.get('authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
                payload = decode_token(token)
                if payload:
                    user_id = payload.get('user_id')
                    session_id = payload.get('sub')  # Use subject as session_id

            # Extract client info
            ip_address = self._get_client_ip(request)
            user_agent = request.headers.get('user-agent')

            # Process the request
            response = await call_next(request)

            # Log successful requests for sensitive endpoints
            if self._should_audit_request(request):
                await self._audit_request(
                    db, request, response, user_id, session_id, ip_address, user_agent
                )

            return response

        except Exception as e:
            # Log failed requests
            if self._should_audit_request(request):
                await self._audit_failed_request(
                    db, request, user_id, session_id, ip_address, user_agent, str(e)
                )
            raise

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers first
        forwarded = request.headers.get('x-forwarded-for')
        if forwarded:
            return forwarded.split(',')[0].strip()

        # Check for other proxy headers
        real_ip = request.headers.get('x-real-ip')
        if real_ip:
            return real_ip

        # Fall back to direct client
        client = request.client
        return client.host if client else "unknown"

    def _should_audit_request(self, request: Request) -> bool:
        """Determine if this request should be audited"""
        # Audit all authentication requests
        if request.url.path.startswith('/auth'):
            return True

        # Audit sensitive operations
        sensitive_paths = [
            '/users', '/orders', '/products', '/categories',
            '/churches', '/stock', '/reports'
        ]

        for path in sensitive_paths:
            if request.url.path.startswith(path):
                return True

        return False

    async def _audit_request(
        self,
        db: Session,
        request: Request,
        response: Response,
        user_id: int = None,
        session_id: str = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Audit successful requests"""
        audit_service = AuditService(db)

        # Determine action based on HTTP method
        method = request.method
        path = request.url.path

        if path.startswith('/auth/login'):
            action = "LOGIN_SUCCESS" if response.status_code == 200 else "LOGIN_FAILED"
        elif path.startswith('/auth/logout'):
            action = "LOGOUT"
        elif method == 'POST':
            action = "CREATE"
        elif method == 'PUT' or method == 'PATCH':
            action = "UPDATE"
        elif method == 'DELETE':
            action = "DELETE"
        else:
            action = f"{method}_REQUEST"

        # Determine resource
        resource = self._get_resource_from_path(path)

        # Create audit log
        audit_service.create_audit_log(
            db=db,
            user_id=user_id,
            action=action,
            resource=resource,
            success=response.status_code < 400,
            error_message=None if response.status_code < 400 else f"HTTP {response.status_code}",
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            extra_metadata={
                'method': method,
                'path': path,
                'status_code': response.status_code,
                'query_params': dict(request.query_params),
            }
        )

    async def _audit_failed_request(
        self,
        db: Session,
        request: Request,
        user_id: int = None,
        session_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        error_message: str = None
    ):
        """Audit failed requests"""
        audit_service = AuditService(db)

        path = request.url.path
        resource = self._get_resource_from_path(path)

        audit_service.create_audit_log(
            db=db,
            user_id=user_id,
            action="REQUEST_FAILED",
            resource=resource,
            success=False,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            extra_metadata={
                'method': request.method,
                'path': path,
                'query_params': dict(request.query_params),
            }
        )

    def _get_resource_from_path(self, path: str) -> str:
        """Extract resource type from URL path"""
        if path.startswith('/auth'):
            return AuditResource.AUTH
        elif path.startswith('/users'):
            return AuditResource.USER
        elif path.startswith('/orders'):
            return AuditResource.ORDER
        elif path.startswith('/products'):
            return AuditResource.PRODUCT
        elif path.startswith('/categories'):
            return AuditResource.CATEGORY
        elif path.startswith('/churches'):
            return AuditResource.CHURCH
        elif path.startswith('/stock'):
            return AuditResource.STOCK
        else:
            return "SYSTEM"