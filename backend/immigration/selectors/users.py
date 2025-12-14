"""
User selectors - SIMPLIFIED to use Django Groups only.

No role-based filtering - uses Groups and Permissions.
"""

from typing import Optional
from django.db.models import QuerySet, Q
from immigration.models.user import User


def user_list(*, user: User, search: Optional[str] = None) -> QuerySet[User]:
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
        search: Optional search term to filter by name, email, or username
        
    Returns:
        QuerySet of users visible to the requesting user
    """
    # Build base queryset based on user's group
    if user.is_in_group('SUPER_SUPER_ADMIN'):
        qs = User.objects.all()
    elif user.is_in_group('SUPER_ADMIN'):
        qs = User.objects.filter(tenant=user.tenant)
    elif user.is_in_group('REGION_MANAGER'):
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
                tenant=user.tenant
            ).filter(
                Q(branches__in=region_branches) |
                Q(regions__in=user_regions)
            ).distinct()
    elif user.is_in_group('BRANCH_ADMIN'):
        user_branches = user.branches.all()
        if not user_branches.exists():
            qs = User.objects.none()
        else:
            qs = User.objects.filter(
                branches__in=user_branches
            ).distinct()
    else:
        # CONSULTANT (or any other group) sees only themselves
        qs = User.objects.filter(id=user.id)
    
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
