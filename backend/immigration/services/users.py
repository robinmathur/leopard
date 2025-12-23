"""
User services - SIMPLIFIED to use Django Groups and Permissions only.

No role field - uses Django Groups exclusively.
Multi-tenant: Schema isolation provides automatic tenant scoping.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, validator
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from immigration.models.user import User
# REMOVED: from immigration.models.tenant import Tenant (now in tenants app, schema provides isolation)
from immigration.models.branch import Branch
from immigration.models.region import Region
from immigration.constants import ALL_GROUPS


class UserCreateInput(BaseModel):
    """Input model for creating a new user.

    Multi-tenant: No tenant_id needed - schema provides isolation.
    """

    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    group_name: str  # Group name instead of role
    # REMOVED: tenant_id (schema provides isolation)
    branch_ids: Optional[list] = None  # For multiple branches
    region_ids: Optional[list] = None  # For multiple regions
    is_active: bool = True
    
    @validator('group_name')
    def validate_group(cls, v):
        """Validate that group is valid."""
        if v not in ALL_GROUPS:
            raise ValueError(f"Invalid group. Must be one of: {', '.join(ALL_GROUPS)}")
        return v
    
    class Config:
        arbitrary_types_allowed = True


class UserUpdateInput(BaseModel):
    """Input model for updating a user.

    Multi-tenant: No tenant_id needed - schema provides isolation.
    """

    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    group_name: Optional[str] = None  # Group name instead of role
    # REMOVED: tenant_id (schema provides isolation)
    branch_ids: Optional[list] = None
    region_ids: Optional[list] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    
    @validator('group_name')
    def validate_group(cls, v):
        """Validate that group is valid."""
        if v is None:
            return v
        if v not in ALL_GROUPS:
            raise ValueError(f"Invalid group. Must be one of: {', '.join(ALL_GROUPS)}")
        return v
    
    class Config:
        arbitrary_types_allowed = True


@transaction.atomic
def user_create(*, data: UserCreateInput, created_by: User) -> User:
    """
    Create a new user.

    Permission check: Requires 'add_user' permission.
    Only SUPER_SUPER_ADMIN and SUPER_ADMIN groups have this permission.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Users are created in the current tenant schema (no tenant FK needed).

    Args:
        data: User creation input data
        created_by: The user creating the new user

    Returns:
        Created User instance

    Raises:
        PermissionError: If creator doesn't have permission
        ValueError: If validation fails
    """
    # Check permission
    if not created_by.has_perm('immigration.add_user'):
        raise PermissionError("You don't have permission to create users")

    # REMOVED: tenant validation (schema provides isolation)
    # All users are automatically created in the current tenant schema

    # Validate branch assignments
    if data.branch_ids:
        branches = Branch.objects.filter(id__in=data.branch_ids)
        if branches.count() != len(data.branch_ids):
            raise ValueError("One or more branch IDs are invalid")

        # REMOVED: tenant FK check (schema ensures branches belong to current tenant)

    # Validate region assignments
    if data.region_ids:
        regions = Region.objects.filter(id__in=data.region_ids)
        if regions.count() != len(data.region_ids):
            raise ValueError("One or more region IDs are invalid")

        # REMOVED: tenant FK check (schema ensures regions belong to current tenant)

    # Check username uniqueness (within current tenant schema)
    if User.objects.filter(username=data.username).exists():
        raise ValueError(f"Username '{data.username}' already exists")

    # Check email uniqueness (within current tenant schema)
    if User.objects.filter(email=data.email).exists():
        raise ValueError(f"Email '{data.email}' already exists")

    # Create user (no tenant FK needed - schema provides isolation)
    user = User(
        username=data.username,
        email=data.email,
        password=make_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        # REMOVED: tenant_id assignment
        is_active=data.is_active
    )
    user.save()

    # Assign to group
    group, created = Group.objects.get_or_create(name=data.group_name)
    user.groups.add(group)

    # Set multiple branches
    if data.branch_ids:
        user.branches.set(data.branch_ids)

    # Set multiple regions
    if data.region_ids:
        user.regions.set(data.region_ids)

    return user


@transaction.atomic
def user_update(*, user_id: int, data: UserUpdateInput, updated_by: User) -> User:
    """
    Update a user.

    Permission check: Requires 'change_user' permission.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Users can only be updated within their current tenant schema.

    Args:
        user_id: ID of user to update
        data: Update input data
        updated_by: The user performing the update

    Returns:
        Updated User instance

    Raises:
        PermissionError: If updater doesn't have permission
        ValueError: If validation fails or user not found
    """
    # Check permission
    if not updated_by.has_perm('immigration.change_user'):
        raise PermissionError("You don't have permission to update users")

    # Get user to update (automatically scoped to current tenant schema)
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError(f"User with id {user_id} does not exist")

    # Update fields
    if data.email:
        if User.objects.filter(email=data.email).exclude(id=user_id).exists():
            raise ValueError(f"Email '{data.email}' already exists")
        user.email = data.email

    if data.first_name:
        user.first_name = data.first_name

    if data.last_name:
        user.last_name = data.last_name

    # Update group
    if data.group_name:
        # Remove from all groups
        user.groups.clear()
        # Add to new group
        group, created = Group.objects.get_or_create(name=data.group_name)
        user.groups.add(group)

    # REMOVED: tenant_id update (users cannot move between tenants)

    # Handle multiple branches
    if data.branch_ids is not None:
        if data.branch_ids:
            branches = Branch.objects.filter(id__in=data.branch_ids)
            if branches.count() != len(data.branch_ids):
                raise ValueError("One or more branch IDs are invalid")
            # REMOVED: tenant FK check (schema ensures branches belong to current tenant)
            user.branches.set(data.branch_ids)
        else:
            user.branches.clear()

    # Handle multiple regions
    if data.region_ids is not None:
        if data.region_ids:
            regions = Region.objects.filter(id__in=data.region_ids)
            if regions.count() != len(data.region_ids):
                raise ValueError("One or more region IDs are invalid")
            # REMOVED: tenant FK check (schema ensures regions belong to current tenant)
            user.regions.set(data.region_ids)
        else:
            user.regions.clear()

    if data.is_active is not None:
        user.is_active = data.is_active

    if data.password:
        user.password = make_password(data.password)

    user.save()

    return user
