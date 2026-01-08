"""
Public Tenant Info API endpoint.

Provides tenant information based on request hostname.
This is a public endpoint (no authentication required) used by the login page.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_tenants.utils import schema_context
from django.conf import settings
from tenants.models import Domain
from django.http import Http404


def get_tenant_subdomain(hostname):
    """
    Extract tenant identifier from hostname.
    
    Supports both patterns:
    - 4-level: tenant.app.company.com → 'tenant'
    - Flattened: tenant-app.company.com → 'tenant'
    
    Args:
        hostname: Full hostname
        
    Returns:
        str: Tenant subdomain or None
    """
    parts = hostname.split('.')
    
    if len(parts) >= 3:
        # 4-level subdomain: tenant.app.company.com
        tenant_subdomain = parts[0]
        
        # Check if it's the app subdomain itself (no tenant)
        app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'app')
        if tenant_subdomain == app_subdomain:
            return None
            
        return tenant_subdomain
    
    return None


@api_view(['GET'])
@permission_classes([AllowAny])
def tenant_info(request):
    """
    Get tenant information based on request hostname.
    
    This is a public endpoint that doesn't require authentication.
    It extracts the tenant from the request hostname and returns tenant name and ID.
    
    GET /api/public/tenant-info/
    
    Returns:
        - 200: { "tenant_name": "Acme Immigration", "tenant_id": 1 }
        - 404: { "detail": "Tenant not found for this domain" }
    """
    hostname = request.get_host().split(':')[0].lower()
    
    # Use public schema to query tenant domains
    with schema_context('public'):
        DomainModel = Domain
        
        # Try exact match first
        try:
            domain = DomainModel.objects.select_related('tenant').get(domain=hostname)
            tenant = domain.tenant
            
            response = Response({
                'tenant_name': tenant.name,
                'tenant_id': tenant.id,
            })
            # Disable caching for this endpoint
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response
        except Domain.DoesNotExist:
            pass
        
        # Extract tenant subdomain
        tenant_subdomain = get_tenant_subdomain(hostname)
        
        if not tenant_subdomain:
            response = Response(
                {'detail': 'Tenant not found for this domain'},
                status=status.HTTP_404_NOT_FOUND
            )
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response
        
        # Try wildcard pattern match (e.g., *.app.company.com)
        try:
            # Remove tenant subdomain from hostname to get suffix
            domain_suffix = hostname[len(tenant_subdomain) + 1:]  # Remove 'tenant.'
            wildcard_domain = f"*.{domain_suffix}"
            
            domain = DomainModel.objects.select_related('tenant').get(domain=wildcard_domain)
            tenant = domain.tenant
            
            response = Response({
                'tenant_name': tenant.name,
                'tenant_id': tenant.id,
            })
            # Disable caching for this endpoint
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response
        except Domain.DoesNotExist:
            # No tenant found
            response = Response(
                {'detail': 'Tenant not found for this domain'},
                status=status.HTTP_404_NOT_FOUND
            )
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response

