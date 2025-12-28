"""
Region selectors for read operations with role-based filtering.

This module implements the selector pattern for region queries,
providing role-based data scoping and filtering.

Multi-tenant: Schema isolation provides automatic tenant scoping.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models.region import Region


def region_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Region]:
    """
    Get regions filtered by user's role and scope.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    All queries are automatically scoped to current tenant schema.

    Role-based filtering:
    - Consultant/Branch Admin: only regions containing their assigned branches
    - Region Manager: only their assigned regions
    - Super Admin: entire tenant (schema-scoped automatically)
    - Super Super Admin: exists in public schema, needs explicit tenant context

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (name, search, etc.)

    Returns:
        QuerySet of Region objects filtered by role and scope
    """
    filters = filters or {}

    # Start with base queryset
    qs = Region.objects.all()
    
    # Group-based scoping
    # Multi-tenant: Schema provides automatic tenant isolation, no need to filter by tenant FK

    if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
        # Filter to regions containing user's assigned branches
        user_branches = user.branches.all()
        if user_branches.exists():
            qs = qs.filter(branches__in=user_branches).distinct()
        else:
            # User has no branches assigned, return empty queryset
            qs = qs.none()

    elif user.is_in_group('REGION_MANAGER'):
        # Filter to user's assigned regions
        user_regions = user.regions.all()
        if user_regions.exists():
            qs = qs.filter(id__in=user_regions.values_list('id', flat=True))
        else:
            # User has no regions assigned, return empty queryset
            qs = qs.none()

    # SUPER_ADMIN sees all in current tenant schema (automatic)
    # SUPER_SUPER_ADMIN would need explicit cross-tenant access (not implemented here)
    
    # Apply additional filters
    
    # General search across name and description
    if 'search' in filters and filters['search']:
        from django.db.models import Q
        search_term = filters['search']
        qs = qs.filter(
            Q(name__icontains=search_term) |
            Q(description__icontains=search_term)
        )
    
    if 'name' in filters and filters['name']:
        qs = qs.filter(name__icontains=filters['name'])
    
    return qs.order_by('name')


def region_get(*, region_id: int, user) -> Optional[Region]:
    """
    Get a single region by ID with scope validation.

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Args:
        region_id: ID of the region to retrieve
        user: Authenticated user making the request

    Returns:
        Region instance or None if not found or user lacks access
    """
    try:
        region = Region.objects.get(id=region_id)
        
        # Check if user has access to this region based on their role
        if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
            user_branches = user.branches.all()
            if not user_branches.filter(region=region).exists():
                return None
        elif user.is_in_group('REGION_MANAGER'):
            user_regions = user.regions.all()
            if not user_regions.filter(id=region_id).exists():
                return None
        
        # SUPER_ADMIN and SUPER_SUPER_ADMIN have access to all regions in their scope
        
        return region
    except Region.DoesNotExist:
        return None

