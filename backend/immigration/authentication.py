"""
Multi-tenant JWT authentication for schema-per-tenant architecture.

This module provides tenant-bound JWT authentication that prevents cross-tenant token reuse.
A token generated for Tenant A cannot be used to access Tenant B's data.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.db import connection


class TenantJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that validates tenant_schema in token.

    This prevents a valid JWT token from one tenant being used to access
    another tenant's data, even if the user exists in both tenants.

    Security Check:
    1. Validates JWT signature (standard)
    2. Validates token expiry (standard)
    3. Validates tenant_schema in token matches current request's tenant (NEW)

    If tenant_schema mismatch detected → AuthenticationFailed exception
    """

    def authenticate(self, request):
        """
        Authenticate request and validate tenant_schema.

        Raises:
            AuthenticationFailed: If tenant_schema in token doesn't match
                                  the tenant from subdomain routing
        """
        # Standard JWT authentication (signature, expiry, user lookup)
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        # CRITICAL SECURITY CHECK: Validate tenant_schema
        token_tenant_schema = validated_token.get('tenant_schema')
        current_tenant_schema = connection.schema_name

        # Handle tokens without tenant_schema (backwards compatibility)
        # REMOVE THIS IN PRODUCTION - all tokens should have tenant_schema
        if token_tenant_schema is None:
            raise AuthenticationFailed(
                'Invalid token: missing tenant information. Please log in again.'
            )

        # Verify tenant_schema in token matches current request's tenant
        if token_tenant_schema != current_tenant_schema:
            raise AuthenticationFailed(
                f'Token is not valid for this tenant. '
                f'Please log in at the correct subdomain.'
            )

        return user, validated_token
