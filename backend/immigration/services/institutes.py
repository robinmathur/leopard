"""
Institute services for write operations with business logic.

This module implements the service pattern for institute operations,
providing validation, scope checking, and transactional integrity.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional

from immigration.institute import Institute


class InstituteCreateInput(BaseModel):
    """Input model for institute creation with validation."""
    
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str = Field(..., min_length=1, max_length=20)
    phone: Optional[str] = Field(None, max_length=15)
    website: Optional[str] = Field(None, max_length=100)
    
    class Config:
        str_strip_whitespace = True


class InstituteUpdateInput(BaseModel):
    """Input model for institute updates with validation."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    short_name: Optional[str] = Field(None, min_length=1, max_length=20)
    phone: Optional[str] = Field(None, max_length=15)
    website: Optional[str] = Field(None, max_length=100)
    
    class Config:
        str_strip_whitespace = True


@transaction.atomic
def institute_create(*, data: InstituteCreateInput, user) -> Institute:
    """
    Create a new institute with proper validation.
    
    Business rules:
    - User must be authenticated
    - Created_by is automatically set to the requesting user
    
    Args:
        data: InstituteCreateInput with validated institute data
        user: Authenticated user creating the institute
    
    Returns:
        Created Institute instance
    
    Raises:
        ValueError: If validation fails
    """
    # Create institute instance
    institute = Institute(
        name=data.name,
        short_name=data.short_name,
        phone=data.phone or '',
        website=data.website or '',
        created_by=user,
        updated_by=user
    )
    
    # Validate and save
    institute.full_clean()
    institute.save()
    
    return institute


@transaction.atomic
def institute_update(*, institute: Institute, data: InstituteUpdateInput, user) -> Institute:
    """
    Update an existing institute with scope validation.
    
    Business rules:
    - User must have access to the institute (via selectors)
    - Only non-None fields in data are updated
    - Updated_by is automatically set to the requesting user
    
    Args:
        institute: Existing Institute instance to update
        data: InstituteUpdateInput with fields to update
        user: Authenticated user performing the update
    
    Returns:
        Updated Institute instance
    
    Raises:
        PermissionError: If user lacks permission for the operation
    """
    # Update only provided fields
    update_fields = ['updated_by']
    
    if data.name is not None:
        institute.name = data.name
        update_fields.append('name')
    
    if data.short_name is not None:
        institute.short_name = data.short_name
        update_fields.append('short_name')
    
    if data.phone is not None:
        institute.phone = data.phone
        update_fields.append('phone')
    
    if data.website is not None:
        institute.website = data.website
        update_fields.append('website')
    
    # Set updated_by
    institute.updated_by = user
    
    # Validate and save
    institute.full_clean()
    institute.save(update_fields=update_fields)
    
    return institute


@transaction.atomic
def institute_delete(*, institute: Institute, user) -> None:
    """
    Soft delete an institute (sets deleted_at timestamp).

    Args:
        institute: Institute instance to delete
        user: Authenticated user performing the deletion

    Note:
        Uses soft deletion - institute is marked as deleted but not removed from DB
    """
    institute.delete()  # Soft delete sets deleted_at field


@transaction.atomic
def institute_restore(*, institute: Institute, user) -> Institute:
    """
    Restore a soft-deleted institute.

    Args:
        institute: Soft-deleted Institute instance to restore
        user: Authenticated user performing the restoration

    Returns:
        Restored Institute instance

    Raises:
        ValueError: If institute is not soft-deleted
    """
    if not institute.is_deleted:
        raise ValueError("Institute is not soft-deleted")

    institute.restore()
    institute.updated_by = user
    institute.save(update_fields=['deleted_at', 'updated_by'])

    return institute
