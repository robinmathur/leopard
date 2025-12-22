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
    Custom JWT serializer that includes tenant_schema in token claims.

    This ensures tokens are bound to a specific tenant and cannot be used
    across tenants even if a user has access to multiple tenants.

    Example JWT payload:
    {
        "user_id": 123,
        "token_type": "access",
        "exp": 1234567890,
        "iat": 1234567890,
        "tenant_schema": "tenant_acme",  # NEW
        "email": "user@acme.com",
        "username": "user@acme.com",
        "groups": ["SUPER_ADMIN"]
    }
    """

    @classmethod
    def get_token(cls, user):
        """
        Generate JWT token with tenant_schema claim.

        The tenant_schema is captured from the current database connection
        context set by TenantMainMiddleware based on the subdomain.

        Security Note:
        The tenant_schema is automatically set by TenantMainMiddleware
        based on the subdomain in the request URL. This ensures the token
        is bound to the correct tenant from the authentication request.

        Example:
        - User logs in at acme.leopard.com
        - TenantMainMiddleware sets connection.schema_name = 'tenant_acme'
        - Token is generated with tenant_schema = 'tenant_acme'
        - Token can ONLY be used for acme.leopard.com requests
        """
        token = super().get_token(user)

        # CRITICAL: Add tenant_schema to token claims
        # This is set by TenantMainMiddleware based on subdomain
        tenant_schema = connection.schema_name
        token['tenant_schema'] = tenant_schema

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
