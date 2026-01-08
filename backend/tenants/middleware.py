"""
Custom middleware for 4-level subdomain architecture.

Domain Structure: tenant.app.company.com
- tenant: Tenant identifier (dynamic)
- app: Application namespace (fixed)
- company: Company domain (fixed)
- com: TLD

This middleware extracts the tenant subdomain and works with django-tenants.
"""

from django.conf import settings
from django.http import Http404
from django_tenants.middleware.main import TenantMainMiddleware as BaseTenantMainMiddleware


class FourLevelSubdomainMiddleware(BaseTenantMainMiddleware):
    """
    Custom middleware for 4-level subdomain architecture.

    Extracts tenant from the first subdomain level:
    - acme.app.company.com → tenant='acme'
    - demo.app.company.com → tenant='demo'
    - acme.app.localhost → tenant='acme' (development)

    Falls back to default behavior for 2-level domains (admin access):
    - app.company.com → no tenant (public schema)
    """

    def get_tenant_domain_model(self):
        """Get the Domain model."""
        return self.TENANT_DOMAIN_MODEL

    def hostname_from_request(self, request):
        """
        Extract hostname from request.

        Supports:
        - Standard HTTP_HOST header
        - X-Forwarded-Host for reverse proxy setups
        """
        return request.get_host().split(':')[0].lower()

    def get_tenant_subdomain(self, hostname):
        """
        Extract tenant identifier from 4-level subdomain.

        Examples:
        - acme.app.company.com → 'acme'
        - demo.app.localhost → 'demo'
        - app.company.com → None (public/admin access)
        - localhost → None (development without subdomain)

        Returns:
            str: Tenant subdomain or None if not a tenant request
        """
        # Split hostname into parts
        parts = hostname.split('.')

        # Check domain level
        if len(parts) >= 3:
            # 4-level subdomain: tenant.app.company.com
            # Extract the first part as tenant identifier
            tenant_subdomain = parts[0]

            # Validate it's not the app subdomain itself
            app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'app')
            if tenant_subdomain == app_subdomain:
                # This is app.company.com (no tenant)
                return None

            return tenant_subdomain

        elif len(parts) == 2:
            # 2-level: app.localhost or company.com (no tenant)
            return None

        elif len(parts) == 1:
            # Single hostname: localhost (development, no tenant)
            return None

        return None

    def get_domain_model(self, hostname):
        """
        Get tenant by hostname.

        For 4-level subdomains, we need to map the tenant subdomain
        to the full domain stored in the database.

        Args:
            hostname: Full hostname (e.g., 'acme.app.company.com')

        Returns:
            Domain model instance
        """
        Domain = self.get_tenant_domain_model()

        # Try exact match first (for backwards compatibility)
        try:
            return Domain.objects.select_related('tenant').get(domain=hostname)
        except Domain.DoesNotExist:
            pass

        # Extract tenant subdomain
        tenant_subdomain = self.get_tenant_subdomain(hostname)

        if not tenant_subdomain:
            # No tenant subdomain found, try default/public domain
            # This allows access to app.company.com for admin/public pages
            raise Http404("No tenant found for this domain")

        # Look up by tenant subdomain pattern
        # Supports wildcards like '*.app.company.com'
        try:
            # Try wildcard pattern match
            domain_suffix = hostname[len(tenant_subdomain) + 1:]  # Remove 'tenant.'
            wildcard_domain = f"*.{domain_suffix}"

            return Domain.objects.select_related('tenant').get(domain=wildcard_domain)
        except Domain.DoesNotExist:
            # Try exact domain match
            try:
                return Domain.objects.select_related('tenant').get(domain=hostname)
            except Domain.DoesNotExist:
                raise Http404(f"No tenant found for domain: {hostname}")

    def process_request(self, request):
        """
        Override to allow public access to certain paths.

        Public paths (no tenant required):
        - /health/ - Health check endpoint (for Docker and monitoring)
        - /api/public/tenant-info/ - Public tenant info endpoint (for login page)
        - /public/ - Public tenant management pages
        - /static/ - Static files
        - /media/ - Media files
        """
        # Check if this is a public path that doesn't require tenant context
        public_paths = ['/health/', '/api/public/tenant-info/', '/static/', '/media/']

        if any(request.path.startswith(path) for path in public_paths):
            # Use public schema for these requests
            request.tenant = self.get_public_tenant()
            return

        # Otherwise, use normal tenant resolution
        return super().process_request(request)

    def get_public_tenant(self):
        """
        Get the public tenant (for non-tenant-specific requests).

        Returns the special 'public' schema tenant.
        """
        from django.conf import settings

        # Return a mock tenant object for public schema
        class PublicTenant:
            schema_name = 'public'
            name = 'Public'

        return PublicTenant()


# Configuration helper
def get_tenant_from_hostname(hostname):
    """
    Helper function to extract tenant subdomain from hostname.

    Useful for scripts and management commands.

    Args:
        hostname: Full hostname (e.g., 'acme.app.company.com')

    Returns:
        str: Tenant subdomain (e.g., 'acme')

    Example:
        >>> get_tenant_from_hostname('acme.app.company.com')
        'acme'
        >>> get_tenant_from_hostname('demo.app.localhost')
        'demo'
    """
    parts = hostname.split('.')
    if len(parts) >= 3:
        return parts[0]
    return None
