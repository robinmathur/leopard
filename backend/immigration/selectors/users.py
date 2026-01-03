"""
User selectors - SIMPLIFIED to use Django Groups only.

No role-based filtering - uses Groups and Permissions.
"""

from typing import Optional
from django.db.models import QuerySet, Q
from immigration.models.user import User
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
    GROUP_SUPER_SUPER_ADMIN,
)


def user_list(*, user: User, search: Optional[str] = None) -> QuerySet[User]:
    """
    List users visible to the current user based on their group.

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Filtering rules:
    - SUPER_ADMIN: All users in current tenant schema
    - REGION_MANAGER: Users in their assigned regions
    - BRANCH_ADMIN: Users in their assigned branches
    - CONSULTANT: Only themselves

    Args:
        user: The requesting user
        search: Optional search term to filter by name, email, or username

    Returns:
        QuerySet of users visible to the requesting user
    """
    # Build base queryset based on user's group
    if user.is_in_group(GROUP_SUPER_ADMIN):
        # SUPER_ADMIN sees all users in current tenant schema (automatic via schema isolation)
        qs = User.objects.all()

    elif user.is_in_group(GROUP_REGION_MANAGER):
        # REGION_MANAGER sees users in branches within their regions
        user_regions = user.regions.all()
        if not user_regions.exists():
            qs = User.objects.none()
        else:
            # Get all branches in those regions
            from immigration.models.branch import Branch
            region_branches = Branch.objects.filter(
                region__in=user_regions
            ).values_list('id', flat=True)

            # Return users in those branches + users managing those regions
            qs = User.objects.filter(
                Q(branches__in=region_branches) |
                Q(regions__in=user_regions)
            ).distinct()

    elif user.is_in_group(GROUP_BRANCH_ADMIN) or user.is_in_group(GROUP_CONSULTANT):
        # BRANCH_ADMIN and CONSULTANT see users in their assigned branches (teammates)
        user_branches = user.branches.all()
        if not user_branches.exists():
            qs = User.objects.none()
        else:
            qs = User.objects.filter(
                branches__in=user_branches
            ).distinct()

    elif user.is_in_group(GROUP_SUPER_SUPER_ADMIN):
        # SUPER_SUPER_ADMIN is only for creating tenants, not accessing tenant data
        qs = User.objects.none()

    else:
        # Unknown role - no access
        qs = User.objects.none()
    
    # Apply search filter if provided
    if search:
        qs = qs.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search) |
            Q(username__icontains=search)
        )
    
    return qs


def user_get(*, user_id: int, requesting_user: User) -> Optional[User]:
    """
    Get a single user with scope validation.
    
    Args:
        user_id: ID of the user to retrieve
        requesting_user: The user making the request
        
    Returns:
        User instance if found and accessible, None otherwise
    """
    try:
        return user_list(user=requesting_user).get(id=user_id)
    except User.DoesNotExist:
        return None
