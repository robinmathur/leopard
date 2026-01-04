"""
Branch services for write operations with business logic.

This module implements the service pattern for branch operations,
providing validation, scope checking, and transactional integrity.

Multi-tenant: Schema isolation provides automatic tenant scoping.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional

from immigration.models.branch import Branch


class BranchCreateInput(BaseModel):
    """Input model for branch creation with validation.

    Multi-tenant: No tenant_id needed - schema provides isolation.
    """

    # REMOVED: tenant_id (schema provides isolation)
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

    region_id: Optional[int] = None
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

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Branches are automatically created in the current tenant schema.

    Business rules:
    - Branch name must be unique within current tenant schema

    Args:
        data: BranchCreateInput with branch details
        user: Authenticated user creating the branch

    Returns:
        Created Branch instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If validation fails
    """
    from immigration.models.region import Region

    # REMOVED: tenant validation (schema provides isolation)

    # Validate region if provided
    region = None
    if data.region_id:
        try:
            region = Region.objects.get(id=data.region_id)
            # REMOVED: tenant FK check (schema ensures region belongs to current tenant)
        except Region.DoesNotExist:
            raise ValueError(f"Region with id={data.region_id} does not exist")

    # Check for duplicate branch name (within current tenant schema)
    if Branch.objects.filter(name=data.name).exists():
        raise ValueError(f"Branch with name '{data.name}' already exists")

    # Create branch (no tenant FK needed - schema provides isolation)
    branch = Branch.objects.create(
        # REMOVED: tenant assignment
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

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Branches can only be updated within their current tenant schema.

    Business rules:
    - Branch name uniqueness is maintained within current tenant schema

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
    # REMOVED: tenant access check (schema provides isolation)

    # Update only provided fields
    update_fields = ['updated_by']

    # Handle region update
    if data.region_id is not None:
        from immigration.models.region import Region
        if data.region_id:
            try:
                region = Region.objects.get(id=data.region_id)
                # REMOVED: tenant FK check (schema ensures region belongs to current tenant)
            except Region.DoesNotExist:
                raise ValueError(f"Region with id={data.region_id} does not exist")
            branch.region = region
        else:
            branch.region = None
        update_fields.append('region')

    if data.name is not None:
        # Check for name conflicts if name is changing (within current tenant schema)
        if data.name != branch.name:
            if Branch.objects.filter(name=data.name).exists():
                raise ValueError(f"Branch with name '{data.name}' already exists")
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

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Args:
        branch: Branch instance to delete
        user: Authenticated user performing the deletion

    Raises:
        PermissionError: If user lacks permission
    """
    # REMOVED: tenant access check (schema provides isolation)

    branch.delete()  # Soft delete sets deleted_at field


@transaction.atomic
def branch_restore(*, branch: Branch, user) -> Branch:
    """
    Restore a soft-deleted branch.

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Args:
        branch: Soft-deleted Branch instance to restore
        user: Authenticated user performing the restoration

    Returns:
        Restored Branch instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If branch is not soft-deleted
    """
    # REMOVED: tenant access check (schema provides isolation)

    if not branch.is_deleted:
        raise ValueError("Branch is not soft-deleted")

    branch.restore()
    branch.updated_by = user
    branch.save(update_fields=['deleted_at', 'updated_by'])

    return branch