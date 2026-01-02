"""
College application selectors for read operations with role-based filtering.

This module implements the selector pattern for college application queries,
providing role-based data scoping and filtering for:
- ApplicationType
- Stage
- CollegeApplication
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models import ApplicationType, Stage, CollegeApplication, Branch
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
)


# ============================================================================
# APPLICATION TYPE SELECTORS
# ============================================================================

def application_type_list(
    *,
    user,
    filters: Optional[Dict[str, Any]] = None
) -> QuerySet[ApplicationType]:
    """
    List application types with filtering.

    Note: ApplicationType is not explicitly tenant-scoped (no tenant FK),
    but in practice it's scoped via schema isolation for SUPER_ADMIN.

    Args:
        user: Authenticated user making the request
        filters: Optional dict of filters (is_active, title)

    Returns:
        QuerySet of ApplicationType objects
    """
    filters = filters or {}

    qs = ApplicationType.objects.all()

    # Apply filters
    if 'is_active' in filters and filters['is_active'] is not None:
        qs = qs.filter(is_active=filters['is_active'])

    if 'title' in filters and filters['title']:
        qs = qs.filter(title__icontains=filters['title'])

    return qs


def application_type_get(
    *,
    user,
    application_type_id: int
) -> ApplicationType:
    """
    Get specific application type.

    Args:
        user: Authenticated user
        application_type_id: ID of application type

    Returns:
        ApplicationType instance

    Raises:
        ApplicationType.DoesNotExist: If not found
    """
    qs = application_type_list(user=user)
    return qs.get(id=application_type_id)


# ============================================================================
# STAGE SELECTORS
# ============================================================================

def stage_list(
    *,
    user,
    filters: Optional[Dict[str, Any]] = None
) -> QuerySet[Stage]:
    """
    List stages with filtering by application_type.

    Args:
        user: Authenticated user
        filters: Optional dict of filters (application_type_id)

    Returns:
        QuerySet of Stage objects ordered by position
    """
    filters = filters or {}

    qs = Stage.objects.select_related('application_type').all()

    # Filter by application_type
    if 'application_type_id' in filters and filters['application_type_id']:
        qs = qs.filter(application_type_id=filters['application_type_id'])

    return qs.order_by('application_type', 'position')


def stage_get(
    *,
    user,
    stage_id: int
) -> Stage:
    """
    Get specific stage.

    Args:
        user: Authenticated user
        stage_id: ID of stage

    Returns:
        Stage instance

    Raises:
        Stage.DoesNotExist: If not found
    """
    qs = stage_list(user=user)
    return qs.get(id=stage_id)


# ============================================================================
# COLLEGE APPLICATION SELECTORS
# ============================================================================

def college_application_list(
    *,
    user,
    filters: Optional[Dict[str, Any]] = None
) -> QuerySet[CollegeApplication]:
    """
    Get college applications filtered by user's role and scope.

    Role-based filtering (same as visa applications):
    - Consultant/Branch Admin: applications for clients in their branch
    - Region Manager: applications for clients in their regions
    - Super Admin: applications in their tenant (schema isolation)
    - Super Super Admin: system-wide (all tenants)

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters

    Returns:
        QuerySet of CollegeApplication objects filtered by role and scope
    """
    filters = filters or {}

    # Start with base queryset with optimized joins
    # Exclude applications for soft-deleted clients
    qs = CollegeApplication.objects.select_related(
        'client',
        'application_type',
        'stage',
        'institute',
        'course',
        'location',
        'start_date',
        'super_agent',
        'sub_agent',
        'assigned_to',
        'created_by',
        'updated_by'
    ).filter(client__deleted_at__isnull=True).all()

    # Role-based scoping (same logic as visa applications)
    if user.is_in_group(GROUP_CONSULTANT) or user.is_in_group(GROUP_BRANCH_ADMIN):
        # Filter to applications for clients in the same branches as the user
        user_branches = user.branches.all()
        if user_branches.exists():
            qs = qs.filter(client__branch__in=user_branches)
        else:
            # If user has no branches assigned, they see no applications
            qs = qs.none()

    elif user.is_in_group(GROUP_REGION_MANAGER):
        # Filter to applications for clients in branches within the user's regions
        user_regions = user.regions.all()
        if user_regions.exists():
            branch_ids = Branch.objects.filter(region__in=user_regions).values_list('id', flat=True)
            qs = qs.filter(client__branch_id__in=branch_ids)
        else:
            # If user has no regions assigned, they see no applications
            qs = qs.none()

    elif user.is_in_group(GROUP_SUPER_ADMIN):
        # SUPER_ADMIN sees all college applications in current tenant schema
        # Schema isolation provides automatic tenant scoping
        pass

    elif user.is_in_group(GROUP_SUPER_SUPER_ADMIN):
        # SUPER_SUPER_ADMIN is only for creating tenants, not accessing tenant data
        # They should not see any college application data
        qs = qs.none()

    # Apply additional filters
    if 'client_id' in filters and filters['client_id']:
        qs = qs.filter(client_id=filters['client_id'])

    if 'application_type_id' in filters and filters['application_type_id']:
        qs = qs.filter(application_type_id=filters['application_type_id'])

    if 'stage_id' in filters and filters['stage_id']:
        qs = qs.filter(stage_id=filters['stage_id'])

    if 'institute_id' in filters and filters['institute_id']:
        qs = qs.filter(institute_id=filters['institute_id'])

    if 'assigned_to_id' in filters and filters['assigned_to_id']:
        qs = qs.filter(assigned_to_id=filters['assigned_to_id'])

    if 'client_name' in filters and filters['client_name']:
        # Search by client first_name or last_name
        qs = qs.filter(
            client__first_name__icontains=filters['client_name']
        ) | qs.filter(
            client__last_name__icontains=filters['client_name']
        )

    return qs


def college_application_get(
    *,
    user,
    application_id: int
) -> CollegeApplication:
    """
    Get specific college application with scope validation.

    Args:
        user: Authenticated user
        application_id: ID of college application

    Returns:
        CollegeApplication instance

    Raises:
        CollegeApplication.DoesNotExist: If not found
        PermissionError: If user lacks access
    """
    qs = college_application_list(user=user)

    try:
        return qs.get(id=application_id)
    except CollegeApplication.DoesNotExist:
        # Check if application exists but user doesn't have access
        if CollegeApplication.objects.filter(id=application_id).exists():
            raise PermissionError(
                f"User does not have access to college application {application_id}"
            )
        raise CollegeApplication.DoesNotExist(
            f"CollegeApplication {application_id} not found"
        )
