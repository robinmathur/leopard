"""
Visa application selectors for read operations with role-based filtering.

This module implements the selector pattern for visa application queries,
providing role-based data scoping and filtering.
"""

from django.db.models import QuerySet, Q
from typing import Optional, Dict, Any

from immigration.models import VisaApplication
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
)


def visa_application_list(
    *, 
    user, 
    filters: Optional[Dict[str, Any]] = None
) -> QuerySet[VisaApplication]:
    """
    Get visa applications filtered by user's role and scope.
    
    Role-based filtering:
    - Consultant/Branch Admin: applications for clients assigned to their branch
    - Region Manager: applications for clients in their region
    - Country Manager/Super Admin: applications for clients in their tenant
    - Super Super Admin: system-wide (all tenants)
    
    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (status, client_id, etc.)
    
    Returns:
        QuerySet of VisaApplication objects filtered by role and scope
    """
    filters = filters or {}
    
    # Start with base queryset with optimized joins
    # Exclude applications for soft-deleted clients
    qs = VisaApplication.objects.select_related(
        'client',
        'visa_type',
        'visa_type__visa_category',
        'assigned_to',
        'created_by',
        'updated_by'
    ).filter(client__deleted_at__isnull=True).all()
    
    # Group-based scoping
    # Filter based on the client's assigned_to user's branch/tenant
    
    if user.is_in_group(GROUP_CONSULTANT) or user.is_in_group(GROUP_BRANCH_ADMIN):
        # Filter to applications for clients assigned to users in the same branches
        user_branches = user.branches.all()
        if user_branches.exists():
            qs = qs.filter(client__assigned_to__branches__in=user_branches)
    
    elif user.is_in_group(GROUP_REGION_MANAGER):
        # Filter to applications for clients in the same regions
        user_regions = user.regions.all()
        if user_regions.exists():
            qs = qs.filter(client__assigned_to__regions__in=user_regions)
    
    elif user.is_in_group(GROUP_SUPER_ADMIN):
        # Filter to applications for clients in the same tenant
        if user.tenant:
            qs = qs.filter(client__assigned_to__tenant=user.tenant)
    
    # SUPER_SUPER_ADMIN sees everything (no additional filter)
    
    # Apply additional filters
    if 'status' in filters and filters['status']:
        qs = qs.filter(status=filters['status'])
    
    if 'client_id' in filters and filters['client_id']:
        qs = qs.filter(client_id=filters['client_id'])
    
    # Client name search (case-insensitive)
    if 'client_name' in filters and filters['client_name']:
        search_term = filters['client_name']
        qs = qs.filter(
            Q(client__first_name__icontains=search_term) |
            Q(client__last_name__icontains=search_term)
        )
    
    if 'visa_type_id' in filters and filters['visa_type_id']:
        qs = qs.filter(visa_type_id=filters['visa_type_id'])
    
    if 'assigned_to_id' in filters and filters['assigned_to_id']:
        qs = qs.filter(assigned_to_id=filters['assigned_to_id'])
    
    # Created by filter (applied by)
    if 'created_by_id' in filters and filters['created_by_id']:
        qs = qs.filter(created_by_id=filters['created_by_id'])
    
    if 'dependent' in filters and filters['dependent'] is not None:
        qs = qs.filter(dependent=filters['dependent'])
    
    # Date range filters
    if 'date_applied_from' in filters and filters['date_applied_from']:
        qs = qs.filter(date_applied__gte=filters['date_applied_from'])
    
    if 'date_applied_to' in filters and filters['date_applied_to']:
        qs = qs.filter(date_applied__lte=filters['date_applied_to'])
    
    return qs


def visa_application_get(*, user, application_id: int) -> VisaApplication:
    """
    Get a specific visa application with scope validation.
    
    Args:
        user: Authenticated user making the request
        application_id: ID of the visa application to retrieve
    
    Returns:
        VisaApplication instance if user has access
    
    Raises:
        VisaApplication.DoesNotExist: If application doesn't exist or user lacks access
        PermissionError: If user doesn't have permission to access this application
    """
    # Use visa_application_list to get scoped queryset, then filter by ID
    qs = visa_application_list(user=user)
    
    try:
        application = qs.get(id=application_id)
        return application
    except VisaApplication.DoesNotExist:
        # Check if application exists at all
        if VisaApplication.objects.filter(id=application_id).exists():
            raise PermissionError(
                f"User {user.username} does not have permission to access "
                f"visa application {application_id}"
            )
        raise VisaApplication.DoesNotExist(
            f"VisaApplication with id={application_id} does not exist"
        )
