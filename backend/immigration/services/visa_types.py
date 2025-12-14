"""
Visa type services for write operations with business logic.

This module implements the service pattern for visa type operations.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal

from immigration.models.visa import VisaType, VisaCategory


class VisaTypeCreateInput(BaseModel):
    """Input model for visa type creation with validation."""
    
    visa_category_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    checklist: Optional[List[str]] = Field(default_factory=list)
    immigration_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    service_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    
    class Config:
        str_strip_whitespace = True


class VisaTypeUpdateInput(BaseModel):
    """Input model for visa type updates with validation."""
    
    visa_category_id: Optional[int] = Field(None, gt=0)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    checklist: Optional[List[str]] = None
    immigration_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    service_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    
    class Config:
        str_strip_whitespace = True


@transaction.atomic
def visa_type_create(*, data: VisaTypeCreateInput, user) -> VisaType:
    """
    Create a new visa type.
    
    Args:
        data: VisaTypeCreateInput with validated visa type data
        user: Authenticated user creating the visa type
    
    Returns:
        Created VisaType instance
    
    Raises:
        ValueError: If validation fails
    """
    # Validate visa category exists
    try:
        visa_category = VisaCategory.objects.get(id=data.visa_category_id)
    except VisaCategory.DoesNotExist:
        raise ValueError(f"Visa category with id={data.visa_category_id} does not exist")
    
    # Create visa type instance
    visa_type = VisaType(
        visa_category=visa_category,
        name=data.name,
        code=data.code or '',
        description=data.description or '',
        checklist=data.checklist or [],
    )
    
    # Validate and save
    visa_type.full_clean()
    visa_type.save()
    
    return visa_type


@transaction.atomic
def visa_type_update(
    *, 
    visa_type: VisaType, 
    data: VisaTypeUpdateInput, 
    user
) -> VisaType:
    """
    Update an existing visa type.
    
    Args:
        visa_type: Existing VisaType instance to update
        data: VisaTypeUpdateInput with fields to update
        user: Authenticated user performing the update
    
    Returns:
        Updated VisaType instance
    
    Raises:
        ValueError: If validation fails
    """
    # Update only provided fields
    if data.visa_category_id is not None:
        try:
            visa_category = VisaCategory.objects.get(id=data.visa_category_id)
            visa_type.visa_category = visa_category
        except VisaCategory.DoesNotExist:
            raise ValueError(f"Visa category with id={data.visa_category_id} does not exist")
    
    if data.name is not None:
        visa_type.name = data.name
    
    if data.code is not None:
        visa_type.code = data.code
    
    if data.description is not None:
        visa_type.description = data.description
    
    if data.checklist is not None:
        visa_type.checklist = data.checklist
    
    # Validate and save
    visa_type.full_clean()
    visa_type.save()
    
    return visa_type


@transaction.atomic
def visa_type_delete(*, visa_type: VisaType, user) -> None:
    """
    Delete a visa type.
    
    Args:
        visa_type: VisaType instance to delete
        user: Authenticated user performing the delete
    
    Raises:
        ValueError: If visa type has associated applications
    """
    # Check if visa type has associated applications
    if visa_type.applications.exists():
        raise ValueError(
            f"Cannot delete visa type '{visa_type.name}' as it has associated applications"
        )
    
    visa_type.delete()
