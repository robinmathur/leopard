"""
Schema extensions for drf-spectacular.

This module provides custom extensions for OpenAPI schema generation,
including authentication extensions and type hints for serializer methods.
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_bearer_security_scheme_object


class TenantJWTAuthenticationExtension(OpenApiAuthenticationExtension):
    """
    OpenAPI schema extension for TenantJWTAuthentication.
    
    This allows drf-spectacular to properly document JWT Bearer authentication
    with tenant-bound tokens.
    """
    target_class = 'immigration.authentication.TenantJWTAuthentication'
    name = 'BearerAuth'
    
    def get_security_definition(self, auto_schema):
        """
        Return the security scheme for JWT Bearer authentication.
        """
        return build_bearer_security_scheme_object(
            header_name='Authorization',
            token_prefix='Bearer',
            bearer_format='JWT',
        )

