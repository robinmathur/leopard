"""
Custom CSRF middleware for multi-tenant architecture.

Automatically trusts origins matching the tenant subdomain pattern:
- *.immigrate.localhost:5173 (development frontend)
- *.immigrate.localhost:8000 (development backend)
- *.immigrate.company.com (production)

This allows unlimited tenants without hardcoding each subdomain in CSRF_TRUSTED_ORIGINS.
"""
import re
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware


class MultiTenantCsrfMiddleware(CsrfViewMiddleware):
    """
    Custom CSRF middleware that allows origins matching tenant subdomain patterns.

    For JWT-based APIs, CSRF protection is redundant since the JWT token
    itself provides protection against CSRF attacks. This middleware:
    1. Exempts all /api/ endpoints from CSRF (JWT authentication)
    2. Trusts all tenant subdomain origins for other endpoints
    """

    def process_view(self, request, callback, callback_args, callback_kwargs):
        """
        Exempt /api/ endpoints from CSRF protection.

        JWT tokens in Authorization headers are not vulnerable to CSRF attacks,
        so we skip CSRF checks for all API endpoints.
        """
        # Exempt all /api/ paths from CSRF
        if request.path.startswith('/api/'):
            return None  # Skip CSRF check

        # For non-API paths, use normal CSRF protection
        return super().process_view(request, callback, callback_args, callback_kwargs)

    def _is_tenant_origin_trusted(self, origin):
        """
        Check if origin matches tenant subdomain pattern.

        Returns True if origin matches:
        - http://*.immigrate.localhost:5173 (frontend dev)
        - http://*.immigrate.localhost:8000 (backend dev)
        - https://*.immigrate.company.com (production)
        """
        app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'immigrate')
        base_domain = getattr(settings, 'BASE_DOMAIN', 'localhost')

        # Development patterns
        dev_patterns = [
            rf'^http://[a-z0-9\-]+\.{app_subdomain}\.localhost:5173$',  # Frontend
            rf'^http://[a-z0-9\-]+\.{app_subdomain}\.localhost:8000$',  # Backend
            rf'^http://[a-z0-9\-]+\.{app_subdomain}\.localhost$',       # Backend (default port)
        ]

        # Production patterns
        prod_patterns = [
            rf'^https://[a-z0-9\-]+\.{app_subdomain}\.{re.escape(base_domain)}$',
        ]

        patterns = dev_patterns + prod_patterns

        for pattern in patterns:
            if re.match(pattern, origin):
                return True

        return False

    def _origin_verified(self, request):
        """
        Override to add tenant subdomain pattern matching.
        """
        # First try the standard verification
        if super()._origin_verified(request):
            return True

        # If standard verification fails, check tenant pattern
        request_origin = request.META.get('HTTP_ORIGIN')
        if request_origin and self._is_tenant_origin_trusted(request_origin):
            return True

        return False
