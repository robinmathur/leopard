"""
Multi-tenant JWT token views.

This module provides tenant-bound JWT token generation.
Separated from authentication.py to avoid circular imports.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import connection


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes tenant identifier (tid) in token claims.

    This ensures tokens are bound to a specific tenant and cannot be used
    across tenants even if a user has access to multiple tenants.

    The tenant identifier stores only the tenant name (e.g., "main") without
    the "tenant_" prefix, making it less obvious to users.

    Example JWT payload:
    {
        "user_id": 123,
        "token_type": "access",
        "exp": 1234567890,
        "iat": 1234567890,
        "tid": "main",  # Tenant identifier (extracted from "tenant_main")
        "email": "user@main.com",
        "username": "user@main.com",
        "groups": ["SUPER_ADMIN"]
    }
    """

    @classmethod
    def get_token(cls, user):
        """
        Generate JWT token with tenant identifier (tid) claim.

        The tenant name is extracted from the current database connection
        context set by TenantMainMiddleware based on the subdomain.

        Security Note:
        - Only the tenant name is stored (e.g., "main" from "tenant_main")
        - The full schema name is reconstructed in middleware for validation
        - This makes the tenant identifier less obvious to users

        Example:
        - User logs in at main.immigrate.localhost
        - TenantMainMiddleware sets connection.schema_name = 'tenant_main'
        - Token is generated with tid = 'main' (not 'tenant_main')
        - Token can ONLY be used for main.immigrate.localhost requests
        """
        token = super().get_token(user)

        # CRITICAL: Add tenant identifier (tid) to token claims
        # Extract tenant name from schema (e.g., "main" from "tenant_main")
        # This is set by TenantMainMiddleware based on subdomain
        tenant_schema = connection.schema_name
        
        # Extract tenant name by removing "tenant_" prefix
        if tenant_schema.startswith('tenant_'):
            tenant_name = tenant_schema[7:]  # Remove "tenant_" prefix
        else:
            tenant_name = tenant_schema  # Fallback for non-standard schemas
        
        # Store only the tenant name, not the full schema name
        token['tid'] = tenant_name

        # Optional: Add additional user claims for frontend convenience
        token['email'] = user.email
        token['username'] = user.username

        # Optional: Add user groups for frontend permission checks
        # This allows frontend to hide/show UI elements based on role
        token['groups'] = list(user.groups.values_list('name', flat=True))

        return token


class TenantTokenObtainPairView(TokenObtainPairView):
    """
    Custom token obtain view using tenant-bound serializer.

    This replaces the default TokenObtainPairView to generate tokens
    with tenant_schema claims.

    Usage in urls.py:
    path('api/token/', TenantTokenObtainPairView.as_view(), name='token_obtain_pair')
    """
    serializer_class = TenantTokenObtainPairSerializer
