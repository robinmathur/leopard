"""
User selectors - SIMPLIFIED to use Django Groups only.

No role-based filtering - uses Groups and Permissions.
"""

from typing import Optional
from django.db.models import QuerySet, Q
from immigration.models.user import User


def user_list(*, user: User) -> QuerySet[User]:
    """
    List users visible to the current user based on their group.
    
    Filtering rules:
    - SUPER_SUPER_ADMIN: All users across all tenants
    - SUPER_ADMIN: All users in their tenant
    - REGION_MANAGER: Users in their assigned regions
    - BRANCH_ADMIN: Users in their assigned branches
    - CONSULTANT: Only themselves
    
    Args:
        user: The requesting user
        
    Returns:
        QuerySet of users visible to the requesting user
    """
    # SUPER_SUPER_ADMIN sees all users
    if user.is_in_group('SUPER_SUPER_ADMIN'):
        return User.objects.all()
    
    # SUPER_ADMIN sees all users in their tenant
    if user.is_in_group('SUPER_ADMIN'):
        return User.objects.filter(tenant=user.tenant)
    
    # REGION_MANAGER sees users in their assigned regions
    if user.is_in_group('REGION_MANAGER'):
        user_regions = user.regions.all()
        if not user_regions.exists():
            return User.objects.none()
        
        # Get all branches in those regions
        from immigration.models.branch import Branch
        region_branches = Branch.objects.filter(
            region__in=user_regions
        ).values_list('id', flat=True)
        
        # Return users in those branches + users managing those regions
        return User.objects.filter(
            tenant=user.tenant
        ).filter(
            Q(branches__in=region_branches) |
            Q(regions__in=user_regions)
        ).distinct()
    
    # BRANCH_ADMIN sees users in their assigned branches
    if user.is_in_group('BRANCH_ADMIN'):
        user_branches = user.branches.all()
        if not user_branches.exists():
            return User.objects.none()
        
        return User.objects.filter(
            branches__in=user_branches
        ).distinct()
    
    # CONSULTANT (or any other group) sees only themselves
    return User.objects.filter(id=user.id)


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
