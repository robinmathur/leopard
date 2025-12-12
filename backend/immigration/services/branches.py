"""
Branch services for write operations with business logic.

This module implements the service pattern for branch operations,
providing validation, scope checking, and transactional integrity.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional

from immigration.models.branch import Branch
from immigration.constants import GROUP_SUPER_SUPER_ADMIN


class BranchCreateInput(BaseModel):
    """Input model for branch creation with validation."""

    tenant_id: int
    region_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    website: Optional[str] = Field(None, max_length=100)
    street: Optional[str] = Field(None, max_length=100)
    suburb: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=2)

    class Config:
        str_strip_whitespace = True


class BranchUpdateInput(BaseModel):
    """Input model for branch updates with validation."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    website: Optional[str] = Field(None, max_length=100)
    street: Optional[str] = Field(None, max_length=100)
    suburb: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=2)

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def branch_create(*, data: BranchCreateInput, user) -> Branch:
    """
    Create a new branch with scope validation.

    Business rules:
    - SUPER_SUPER_ADMIN can create branches for any tenant
    - SUPER_ADMIN can only create branches for their tenant
    - Branch name must be unique within tenant

    Args:
        data: BranchCreateInput with branch details
        user: Authenticated user creating the branch

    Returns:
        Created Branch instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If validation fails
    """
    from immigration.models.tenant import Tenant
    from immigration.models.region import Region

    # Validate tenant access
    try:
        tenant = Tenant.objects.get(id=data.tenant_id)
    except Tenant.DoesNotExist:
        raise ValueError(f"Tenant with id={data.tenant_id} does not exist")

    if not user.is_in_group(GROUP_SUPER_SUPER_ADMIN) and tenant.id != user.tenant_id:
        raise PermissionError("Cannot create branches for other tenants")

    # Validate region if provided
    region = None
    if data.region_id:
        try:
            region = Region.objects.get(id=data.region_id)
            if region.tenant_id != tenant.id:
                raise ValueError("Region does not belong to the specified tenant")
        except Region.DoesNotExist:
            raise ValueError(f"Region with id={data.region_id} does not exist")

    # Check for duplicate branch name within tenant
    if Branch.objects.filter(tenant=tenant, name=data.name).exists():
        raise ValueError(f"Branch with name '{data.name}' already exists in this tenant")

    # Create branch
    branch = Branch.objects.create(
        tenant=tenant,
        region=region,
        name=data.name,
        phone=data.phone or '',
        website=data.website or '',
        street=data.street or '',
        suburb=data.suburb or '',
        state=data.state or '',
        postcode=data.postcode or '',
        country=data.country or '',
        created_by=user,
        updated_by=user
    )

    return branch


@transaction.atomic
def branch_update(*, branch: Branch, data: BranchUpdateInput, user) -> Branch:
    """
    Update an existing branch with scope validation.

    Business rules:
    - User must have access to the branch's tenant
    - Branch name uniqueness is maintained within tenant

    Args:
        branch: Existing Branch instance to update
        data: BranchUpdateInput with fields to update
        user: Authenticated user performing the update

    Returns:
        Updated Branch instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If validation fails
    """
    # Check tenant access
    if not user.is_in_group(GROUP_SUPER_SUPER_ADMIN) and branch.tenant_id != user.tenant_id:
        raise PermissionError("Cannot update branches for other tenants")

    # Update only provided fields
    update_fields = ['updated_by']

    if data.name is not None:
        # Check for name conflicts if name is changing
        if data.name != branch.name:
            if Branch.objects.filter(tenant=branch.tenant, name=data.name).exists():
                raise ValueError(f"Branch with name '{data.name}' already exists in this tenant")
        branch.name = data.name
        update_fields.append('name')

    if data.phone is not None:
        branch.phone = data.phone
        update_fields.append('phone')

    if data.website is not None:
        branch.website = data.website
        update_fields.append('website')

    if data.street is not None:
        branch.street = data.street
        update_fields.append('street')

    if data.suburb is not None:
        branch.suburb = data.suburb
        update_fields.append('suburb')

    if data.state is not None:
        branch.state = data.state
        update_fields.append('state')

    if data.postcode is not None:
        branch.postcode = data.postcode
        update_fields.append('postcode')

    if data.country is not None:
        branch.country = data.country
        update_fields.append('country')

    # Set updated_by
    branch.updated_by = user

    # Validate and save
    branch.full_clean()
    branch.save(update_fields=update_fields)

    return branch


@transaction.atomic
def branch_delete(*, branch: Branch, user) -> None:
    """
    Soft delete a branch (sets deleted_at timestamp).

    Args:
        branch: Branch instance to delete
        user: Authenticated user performing the deletion

    Raises:
        PermissionError: If user lacks permission
    """
    # Check tenant access
    if not user.is_in_group(GROUP_SUPER_SUPER_ADMIN) and branch.tenant_id != user.tenant_id:
        raise PermissionError("Cannot delete branches for other tenants")

    branch.delete()  # Soft delete sets deleted_at field


@transaction.atomic
def branch_restore(*, branch: Branch, user) -> Branch:
    """
    Restore a soft-deleted branch.

    Args:
        branch: Soft-deleted Branch instance to restore
        user: Authenticated user performing the restoration

    Returns:
        Restored Branch instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If branch is not soft-deleted
    """
    # Check tenant access
    if not user.is_in_group(GROUP_SUPER_SUPER_ADMIN) and branch.tenant_id != user.tenant_id:
        raise PermissionError("Cannot restore branches for other tenants")

    if not branch.is_deleted:
        raise ValueError("Branch is not soft-deleted")

    branch.restore()
    branch.updated_by = user
    branch.save(update_fields=['deleted_at', 'updated_by'])

    return branch