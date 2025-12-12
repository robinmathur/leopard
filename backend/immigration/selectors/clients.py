"""
Client selectors for read operations with role-based filtering.

This module implements the selector pattern for client queries,
providing role-based data scoping and filtering.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models import Client


def client_list(*, user, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> QuerySet[Client]:
    """
    Get clients filtered by user's role and scope.

    Role-based filtering:
    - Consultant/Branch Admin: only their branch
    - Region Manager: all branches in their region
    - Country Manager/Super Admin: entire tenant
    - Super Super Admin: system-wide (all tenants)

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (email, stage, active, etc.)
        include_deleted: If True, include soft-deleted clients in results

    Returns:
        QuerySet of Client objects filtered by role and scope
    """
    filters = filters or {}

    # Start with base queryset with optimized joins
    base_manager = Client.all_objects if include_deleted else Client.objects

    qs = base_manager.select_related(
        'visa_category',
        'agent',
        'assigned_to',
        'created_by',
        'updated_by'
    ).all()
    
    # Group-based scoping
    # Note: Currently Client doesn't have direct branch/tenant FK
    # This will filter based on assigned_to user's branch/tenant
    
    if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
        # Filter to clients assigned to users in the same branches
        user_branches = user.branches.all()
        if user_branches.exists():
            qs = qs.filter(assigned_to__branches__in=user_branches)
    
    elif user.is_in_group('REGION_MANAGER'):
        # Filter to clients assigned to users in the same regions
        user_regions = user.regions.all()
        if user_regions.exists():
            qs = qs.filter(assigned_to__regions__in=user_regions)
    
    elif user.is_in_group('SUPER_ADMIN'):
        # Filter to clients assigned to users in the same tenant
        if user.tenant:
            qs = qs.filter(assigned_to__tenant=user.tenant)
    
    # SUPER_SUPER_ADMIN sees everything (no additional filter)
    
    # Apply additional filters
    if 'email' in filters and filters['email']:
        qs = qs.filter(email__icontains=filters['email'])
    
    if 'stage' in filters and filters['stage']:
        qs = qs.filter(stage=filters['stage'])
    
    if 'active' in filters and filters['active'] is not None:
        qs = qs.filter(active=filters['active'])
    
    if 'first_name' in filters and filters['first_name']:
        qs = qs.filter(first_name__icontains=filters['first_name'])
    
    if 'last_name' in filters and filters['last_name']:
        qs = qs.filter(last_name__icontains=filters['last_name'])
    
    if 'visa_category' in filters and filters['visa_category']:
        qs = qs.filter(visa_category_id=filters['visa_category'])
    
    return qs


def client_get(*, user, client_id: int) -> Client:
    """
    Get a specific client with scope validation.
    
    Args:
        user: Authenticated user making the request
        client_id: ID of the client to retrieve
    
    Returns:
        Client instance if user has access
    
    Raises:
        Client.DoesNotExist: If client doesn't exist or user lacks access
        PermissionError: If user doesn't have permission to access this client
    """
    # Use client_list to get scoped queryset, then filter by ID
    qs = client_list(user=user)
    
    try:
        client = qs.get(id=client_id)
        return client
    except Client.DoesNotExist:
        # Check if client exists at all
        if Client.objects.filter(id=client_id).exists():
            raise PermissionError(
                f"User {user.username} does not have permission to access client {client_id}"
            )
        raise Client.DoesNotExist(f"Client with id={client_id} does not exist")


def deleted_clients_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[Client]:
    """
    Get soft-deleted clients that the user can access.

    This selector returns only clients that are soft-deleted and the user
    has permission to see (based on their role and scope).

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters

    Returns:
        QuerySet of soft-deleted Client objects the user can access
    """
    # Get all clients (including deleted) within user's scope
    qs = client_list(user=user, filters=filters, include_deleted=True)

    # Filter to only soft-deleted clients
    return qs.filter(deleted_at__isnull=False)
