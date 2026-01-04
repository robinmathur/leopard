"""
Branch selectors for read operations with role-based filtering.

This module implements the selector pattern for branch queries,
providing role-based data scoping and filtering.

Multi-tenant: Schema isolation provides automatic tenant scoping.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models.branch import Branch


def branch_list(*, user, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> QuerySet[Branch]:
    """
    Get branches filtered by user's role and scope.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    All queries are automatically scoped to current tenant schema.

    Role-based filtering:
    - Consultant/Branch Admin: only their assigned branches
    - Region Manager: all branches in their assigned regions
    - Super Admin: entire tenant (schema-scoped automatically)
    - Super Super Admin: exists in public schema, needs explicit tenant context

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (name, search, region_id, etc.)
        include_deleted: If True, include soft-deleted branches in results

    Returns:
        QuerySet of Branch objects filtered by role and scope
    """
    filters = filters or {}

    # Start with base queryset with optimized joins
    base_manager = Branch.all_objects if include_deleted else Branch.objects

    qs = base_manager.select_related(
        'region',
        'created_by',
        'updated_by'
    ).all()
    
    # Group-based scoping
    # Multi-tenant: Schema provides automatic tenant isolation, no need to filter by tenant FK

    if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
        # Filter to user's assigned branches
        user_branches = user.branches.all()
        if user_branches.exists():
            qs = qs.filter(id__in=user_branches.values_list('id', flat=True))
        else:
            # User has no branches assigned, return empty queryset
            qs = qs.none()

    elif user.is_in_group('REGION_MANAGER'):
        # Filter to branches in user's assigned regions
        user_regions = user.regions.all()
        if user_regions.exists():
            qs = qs.filter(region__in=user_regions)
        else:
            # User has no regions assigned, return empty queryset
            qs = qs.none()

    # SUPER_ADMIN sees all in current tenant schema (automatic)
    # SUPER_SUPER_ADMIN would need explicit cross-tenant access (not implemented here)
    
    # Apply additional filters
    
    # General search across name, phone, website
    if 'search' in filters and filters['search']:
        from django.db.models import Q
        search_term = filters['search']
        qs = qs.filter(
            Q(name__icontains=search_term) |
            Q(phone__icontains=search_term) |
            Q(website__icontains=search_term) |
            Q(suburb__icontains=search_term) |
            Q(state__icontains=search_term)
        )
    
    if 'name' in filters and filters['name']:
        qs = qs.filter(name__icontains=filters['name'])
    
    if 'region_id' in filters and filters['region_id']:
        qs = qs.filter(region_id=filters['region_id'])
    
    if 'phone' in filters and filters['phone']:
        qs = qs.filter(phone__icontains=filters['phone'])
    
    if 'country' in filters and filters['country']:
        qs = qs.filter(country=filters['country'])
    
    if 'state' in filters and filters['state']:
        qs = qs.filter(state__icontains=filters['state'])
    
    return qs.order_by('name')


def branch_get(*, branch_id: int, user, include_deleted: bool = False) -> Optional[Branch]:
    """
    Get a single branch by ID with scope validation.

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Args:
        branch_id: ID of the branch to retrieve
        user: Authenticated user making the request
        include_deleted: If True, include soft-deleted branches

    Returns:
        Branch instance or None if not found or user lacks access
    """
    base_manager = Branch.all_objects if include_deleted else Branch.objects
    
    try:
        branch = base_manager.select_related(
            'region',
            'created_by',
            'updated_by'
        ).get(id=branch_id)
        
        # Check if user has access to this branch based on their role
        if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
            user_branches = user.branches.all()
            if not user_branches.filter(id=branch_id).exists():
                return None
        elif user.is_in_group('REGION_MANAGER'):
            user_regions = user.regions.all()
            if branch.region and not user_regions.filter(id=branch.region.id).exists():
                return None
        
        # SUPER_ADMIN and SUPER_SUPER_ADMIN have access to all branches in their scope
        
        return branch
    except Branch.DoesNotExist:
        return None

