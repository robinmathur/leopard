"""
Institute selectors for read operations with role-based filtering.

This module implements the selector pattern for institute queries,
providing role-based data scoping and filtering.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models import Institute


def institute_list(*, user, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> QuerySet[Institute]:
    """
    Get institutes filtered by user's role and scope.

    Role-based filtering:
    - Consultant/Branch Admin: only their branch
    - Region Manager: all branches in their region
    - Super Admin: entire tenant
    - Super Super Admin: system-wide (all tenants)

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (name, search, etc.)
        include_deleted: If True, include soft-deleted institutes in results

    Returns:
        QuerySet of Institute objects filtered by role and scope
    """
    filters = filters or {}

    # Start with base queryset
    base_manager = Institute.all_objects if include_deleted else Institute.objects
    qs = base_manager.select_related(
        'created_by',
        'updated_by'
    ).all()
    
    # Note: Currently Institute doesn't have direct branch/tenant FK
    # For now, we'll return all institutes (can be scoped later if needed)
    # TODO: Add tenant/branch relationship to Institute model if multi-tenancy is required
    
    # Apply additional filters
    
    # General search across name and short_name
    if 'search' in filters and filters['search']:
        from django.db.models import Q
        search_term = filters['search']
        qs = qs.filter(
            Q(name__icontains=search_term) |
            Q(short_name__icontains=search_term)
        )
    
    if 'name' in filters and filters['name']:
        qs = qs.filter(name__icontains=filters['name'])
    
    if 'short_name' in filters and filters['short_name']:
        qs = qs.filter(short_name__icontains=filters['short_name'])
    
    return qs.order_by('name')


def institute_get(*, user, institute_id: int) -> Institute:
    """
    Get a specific institute with scope validation.
    
    Args:
        user: Authenticated user making the request
        institute_id: ID of the institute to retrieve
    
    Returns:
        Institute instance if user has access
    
    Raises:
        Institute.DoesNotExist: If institute doesn't exist or user lacks access
        PermissionError: If user doesn't have permission to access this institute
    """
    # Use institute_list to get scoped queryset, then filter by ID
    qs = institute_list(user=user)
    
    try:
        institute = qs.get(id=institute_id)
        return institute
    except Institute.DoesNotExist:
        # Check if institute exists at all
        if Institute.objects.filter(id=institute_id).exists():
            raise PermissionError(
                f"User {user.username} does not have permission to access institute {institute_id}"
            )
        raise Institute.DoesNotExist(f"Institute with id={institute_id} does not exist")


def deleted_institutes_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Institute]:
    """
    Get soft-deleted institutes that the user can access.

    This selector returns only institutes that are soft-deleted and the user
    has permission to see (based on their role and scope).

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters

    Returns:
        QuerySet of soft-deleted Institute objects the user can access
    """
    # Get all institutes (including deleted) within user's scope
    qs = institute_list(user=user, filters=filters, include_deleted=True)

    # Filter to only soft-deleted institutes
    return qs.filter(deleted_at__isnull=False)
