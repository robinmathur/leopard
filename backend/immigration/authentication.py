"""
Multi-tenant JWT authentication for schema-per-tenant architecture.

This module provides tenant-bound JWT authentication that prevents cross-tenant token reuse.
A token generated for Tenant A cannot be used to access Tenant B's data.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.db import connection
import logging

logger = logging.getLogger(__name__)


class TenantJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that validates tenant identifier (tid) in token.

    This prevents a valid JWT token from one tenant being used to access
    another tenant's data, even if the user exists in both tenants.

    Security Check:
    1. Validates JWT signature (standard)
    2. Validates token expiry (standard)
    3. Validates tid (tenant name) in token matches current request's tenant

    The token contains only the tenant name (e.g., "main"), which is compared
    against the tenant name extracted from the current schema (e.g., "tenant_main").

    If tenant mismatch detected → AuthenticationFailed exception
    """

    def authenticate(self, request):
        """
        Authenticate request and validate tenant identifier (tid).

        CRITICAL: Validates tenant BEFORE user lookup to prevent cross-tenant access.

        Raises:
            AuthenticationFailed: If tid in token doesn't match the tenant from subdomain routing
        """
        # Step 1: Extract and validate JWT token (but don't look up user yet)
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        # Step 2: Validate token and decode claims (signature, expiry)
        validated_token = self.get_validated_token(raw_token)

        # Step 3: CRITICAL - Validate tenant BEFORE user lookup
        current_tenant_schema = connection.schema_name

        # Extract tenant name from current schema (e.g., "main" from "tenant_main")
        if current_tenant_schema.startswith('tenant_'):
            current_tenant_name = current_tenant_schema[7:]  # Remove "tenant_" prefix
        else:
            current_tenant_name = current_tenant_schema  # Fallback

        # Get tenant identifier from token
        token_tenant_name = validated_token.get('tid')

        # Handle tokens without tid (backwards compatibility)
        if token_tenant_name is None:
            old_tenant_schema = validated_token.get('tenant_schema')
            if old_tenant_schema:
                # Migrate old tokens: validate full schema name
                if old_tenant_schema != current_tenant_schema:
                    raise AuthenticationFailed(
                        'Token is not valid for this tenant. '
                        'Please log in at the correct subdomain.'
                    )
                # Token validated, proceed with user lookup
                return self.get_user(validated_token), validated_token
            else:
                raise AuthenticationFailed(
                    'Invalid token: missing tenant information. Please log in again.'
                )

        # Verify tenant name in token matches current request's tenant
        if token_tenant_name != current_tenant_name:
            logger.warning(
                f"🚨 SECURITY: Cross-tenant token detected! "
                f"Expected: {current_tenant_name}, Got: {token_tenant_name}"
            )
            raise AuthenticationFailed(
                f'Token is not valid for this tenant. '
                f'Please log in at the correct subdomain. '
                f'(Expected: {current_tenant_name}, Got: {token_tenant_name})'
            )

        # Step 4: Tenant validated - now safe to look up user in current schema
        user = self.get_user(validated_token)

        return user, validated_token
