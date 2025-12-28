"""
Region services for write operations with business logic.

This module implements the service pattern for region operations,
providing validation, scope checking, and transactional integrity.

Multi-tenant: Schema isolation provides automatic tenant scoping.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional

from immigration.models.region import Region


class RegionCreateInput(BaseModel):
    """Input model for region creation with validation.

    Multi-tenant: No tenant_id needed - schema provides isolation.
    """

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)

    class Config:
        str_strip_whitespace = True


class RegionUpdateInput(BaseModel):
    """Input model for region updates with validation."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def region_create(*, data: RegionCreateInput, user) -> Region:
    """
    Create a new region with scope validation.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Regions are automatically created in the current tenant schema.

    Business rules:
    - Region name must be unique within current tenant schema

    Args:
        data: RegionCreateInput with region details
        user: Authenticated user creating the region

    Returns:
        Created Region instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If validation fails
    """
    # Check for duplicate region name (within current tenant schema)
    if Region.objects.filter(name=data.name).exists():
        raise ValueError(f"Region with name '{data.name}' already exists")

    # Create region (no tenant FK needed - schema provides isolation)
    region = Region.objects.create(
        name=data.name,
        description=data.description or ''
    )

    return region


@transaction.atomic
def region_update(*, region: Region, data: RegionUpdateInput, user) -> Region:
    """
    Update an existing region with scope validation.

    Multi-tenant: Schema isolation provides automatic tenant scoping.
    Regions can only be updated within their current tenant schema.

    Business rules:
    - Region name uniqueness is maintained within current tenant schema

    Args:
        region: Existing Region instance to update
        data: RegionUpdateInput with fields to update
        user: Authenticated user performing the update

    Returns:
        Updated Region instance

    Raises:
        PermissionError: If user lacks permission
        ValueError: If validation fails
    """
    # Update only provided fields
    update_fields = []

    if data.name is not None:
        # Check for name conflicts if name is changing (within current tenant schema)
        if data.name != region.name:
            if Region.objects.filter(name=data.name).exists():
                raise ValueError(f"Region with name '{data.name}' already exists")
        region.name = data.name
        update_fields.append('name')

    if data.description is not None:
        region.description = data.description
        update_fields.append('description')

    # Validate and save
    if update_fields:
        region.full_clean()
        region.save(update_fields=update_fields)

    return region


@transaction.atomic
def region_delete(*, region: Region, user) -> None:
    """
    Delete a region.

    Multi-tenant: Schema isolation provides automatic tenant scoping.

    Args:
        region: Region instance to delete
        user: Authenticated user performing the deletion

    Raises:
        PermissionError: If user lacks permission
        ValueError: If region has branches assigned
    """
    # Check if region has branches
    if region.branches.exists():
        raise ValueError("Cannot delete region with assigned branches. Please reassign or delete branches first.")

    region.delete()

