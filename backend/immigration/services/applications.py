"""
Visa application services for write operations with business logic.

This module implements the service pattern for visa application operations,
providing validation, scope checking, and transactional integrity.
"""

from django.db import transaction
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal

from immigration.models import VisaApplication
from immigration.constants import (
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
)


class VisaApplicationCreateInput(BaseModel):
    """Input model for visa application creation with validation."""
    
    client_id: int = Field(..., gt=0)
    visa_type_id: int = Field(..., gt=0)
    
    # Financial fields
    immigration_fee: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    immigration_fee_currency: str = Field(default='USD', max_length=3)
    service_fee: Decimal = Field(..., ge=0, max_digits=10, decimal_places=2)
    service_fee_currency: str = Field(default='USD', max_length=3)
    
    # Application details
    transaction_reference_no: Optional[str] = Field(None, max_length=150)
    dependent: bool = False
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = Field(None, gt=0)
    required_documents: Optional[list] = Field(default_factory=list)
    
    # Status and dates
    status: str = Field(
        default='TO_BE_APPLIED',
        pattern="^(TO_BE_APPLIED|VISA_APPLIED|CASE_OPENED|GRANTED|REJECTED|WITHDRAWN)$"
    )
    expiry_date: Optional[date] = None
    date_applied: Optional[date] = None
    date_opened: Optional[date] = None
    final_date: Optional[date] = None
    date_granted: Optional[date] = None
    date_rejected: Optional[date] = None
    date_withdrawn: Optional[date] = None
    
    class Config:
        str_strip_whitespace = True


class VisaApplicationUpdateInput(BaseModel):
    """Input model for visa application updates with validation."""
    
    visa_type_id: Optional[int] = Field(None, gt=0)
    
    # Financial fields
    immigration_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    immigration_fee_currency: Optional[str] = Field(None, max_length=3)
    service_fee: Optional[Decimal] = Field(None, ge=0, max_digits=10, decimal_places=2)
    service_fee_currency: Optional[str] = Field(None, max_length=3)
    
    # Application details
    transaction_reference_no: Optional[str] = Field(None, max_length=150)
    dependent: Optional[bool] = None
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = Field(None, gt=0)
    required_documents: Optional[list] = None
    
    # Status and dates
    status: Optional[str] = Field(
        None,
        pattern="^(TO_BE_APPLIED|VISA_APPLIED|CASE_OPENED|GRANTED|REJECTED|WITHDRAWN)$"
    )
    expiry_date: Optional[date] = None
    date_applied: Optional[date] = None
    date_opened: Optional[date] = None
    final_date: Optional[date] = None
    date_granted: Optional[date] = None
    date_rejected: Optional[date] = None
    date_withdrawn: Optional[date] = None
    
    class Config:
        str_strip_whitespace = True


@transaction.atomic
def visa_application_create(*, data: VisaApplicationCreateInput, user) -> VisaApplication:
    """
    Create a new visa application with proper scope validation.
    
    Business rules:
    - Client must exist and user must have access to it
    - Visa type must exist
    - Assigned user must be within scope
    - Immigration fee and service fee must be positive
    
    Args:
        data: VisaApplicationCreateInput with validated application data
        user: Authenticated user creating the application
    
    Returns:
        Created VisaApplication instance
    
    Raises:
        PermissionError: If user lacks permission for the operation
        ValueError: If validation fails
    """
    from immigration.models.client import Client
    from immigration.models.visa import VisaType
    from immigration.selectors.clients import client_get
    
    # Validate client exists and user has access
    try:
        client = client_get(user=user, client_id=data.client_id)
    except Client.DoesNotExist:
        raise ValueError(f"Client with id={data.client_id} does not exist or you lack access")
    except PermissionError as e:
        raise PermissionError(f"Cannot create application for client {data.client_id}: {e}")
    
    # Validate visa type exists
    try:
        visa_type = VisaType.objects.get(id=data.visa_type_id)
    except VisaType.DoesNotExist:
        raise ValueError(f"Visa type with id={data.visa_type_id} does not exist")
    
    # Validate assigned_to user scope
    if data.assigned_to_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            assigned_user = User.objects.get(id=data.assigned_to_id)
        except User.DoesNotExist:
            raise ValueError(f"Assigned user with id={data.assigned_to_id} does not exist")
        
        # Apply scope rules based on groups
        if user.is_in_group(GROUP_BRANCH_ADMIN):
            # Check if assigned user shares any branches with the creator
            user_branch_ids = set(user.branches.values_list('id', flat=True))
            assigned_branch_ids = set(assigned_user.branches.values_list('id', flat=True))
            if not user_branch_ids.intersection(assigned_branch_ids):
                raise PermissionError(
                    "Branch Admin cannot assign applications to users outside their branches"
                )
        elif user.is_in_group(GROUP_REGION_MANAGER):
            # Check if assigned user shares any regions with the creator
            user_region_ids = set(user.regions.values_list('id', flat=True))
            assigned_region_ids = set(assigned_user.regions.values_list('id', flat=True))
            if not user_region_ids.intersection(assigned_region_ids):
                raise PermissionError(
                    "Region Manager cannot assign applications to users outside their regions"
                )
        # REMOVED: SUPER_ADMIN tenant check (schema provides isolation)
        # elif user.is_in_group(GROUP_SUPER_ADMIN):
        #     if assigned_user.tenant_id != user.tenant_id:
        #         raise PermissionError(
        #             "Cannot assign applications to users outside your tenant"
        #         )
        
        # SUPER_ADMIN can assign to any user in current tenant schema (automatic isolation)
    
    # Create application instance
    application = VisaApplication(
        client=client,
        visa_type=visa_type,
        immigration_fee=data.immigration_fee,
        immigration_fee_currency=data.immigration_fee_currency,
        service_fee=data.service_fee,
        service_fee_currency=data.service_fee_currency,
        transaction_reference_no=data.transaction_reference_no or '',
        dependent=data.dependent,
        notes=data.notes or '',
        assigned_to_id=data.assigned_to_id,
        required_documents=data.required_documents or [],
        status=data.status,
        expiry_date=data.expiry_date,
        date_applied=data.date_applied,
        date_opened=data.date_opened,
        final_date=data.final_date,
        date_granted=data.date_granted,
        date_rejected=data.date_rejected,
        date_withdrawn=data.date_withdrawn,
        created_by=user,
        updated_by=user
    )
    
    # Validate and save
    application.full_clean()
    application.save()
    
    return application


@transaction.atomic
def visa_application_update(
    *, 
    application: VisaApplication, 
    data: VisaApplicationUpdateInput, 
    user
) -> VisaApplication:
    """
    Update an existing visa application with scope validation.
    
    Business rules:
    - User must have access to the application (via selectors)
    - Only non-None fields in data are updated
    - Updated_by is automatically set to the requesting user
    - Cannot change client_id (immutable)
    
    Args:
        application: Existing VisaApplication instance to update
        data: VisaApplicationUpdateInput with fields to update
        user: Authenticated user performing the update
    
    Returns:
        Updated VisaApplication instance
    
    Raises:
        PermissionError: If user lacks permission for the operation
    """
    # Update only provided fields
    update_fields = ['updated_by']
    
    if data.visa_type_id is not None:
        from immigration.models.visa import VisaType
        try:
            visa_type = VisaType.objects.get(id=data.visa_type_id)
            application.visa_type = visa_type
            update_fields.append('visa_type')
        except VisaType.DoesNotExist:
            raise ValueError(f"Visa type with id={data.visa_type_id} does not exist")
    
    if data.immigration_fee is not None:
        application.immigration_fee = data.immigration_fee
        update_fields.append('immigration_fee')
    
    if data.immigration_fee_currency is not None:
        application.immigration_fee_currency = data.immigration_fee_currency
        update_fields.append('immigration_fee_currency')
    
    if data.service_fee is not None:
        application.service_fee = data.service_fee
        update_fields.append('service_fee')
    
    if data.service_fee_currency is not None:
        application.service_fee_currency = data.service_fee_currency
        update_fields.append('service_fee_currency')
    
    if data.transaction_reference_no is not None:
        application.transaction_reference_no = data.transaction_reference_no
        update_fields.append('transaction_reference_no')
    
    if data.dependent is not None:
        application.dependent = data.dependent
        update_fields.append('dependent')
    
    if data.notes is not None:
        application.notes = data.notes
        update_fields.append('notes')
    
    if data.assigned_to_id is not None:
        # Validate scope for assigned_to change
        if data.assigned_to_id != application.assigned_to_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            try:
                assigned_user = User.objects.get(id=data.assigned_to_id)
            except User.DoesNotExist:
                raise ValueError(f"Assigned user with id={data.assigned_to_id} does not exist")
            
            # Apply same scope rules as create (group-based)
            if user.is_in_group(GROUP_BRANCH_ADMIN):
                # Check if assigned user shares any branches with the updater
                user_branch_ids = set(user.branches.values_list('id', flat=True))
                assigned_branch_ids = set(assigned_user.branches.values_list('id', flat=True))
                if not user_branch_ids.intersection(assigned_branch_ids):
                    raise PermissionError(
                        "Branch Admin cannot assign to users outside their branches"
                    )
            elif user.is_in_group(GROUP_REGION_MANAGER):
                # Check if assigned user shares any regions with the updater
                user_region_ids = set(user.regions.values_list('id', flat=True))
                assigned_region_ids = set(assigned_user.regions.values_list('id', flat=True))
                if not user_region_ids.intersection(assigned_region_ids):
                    raise PermissionError(
                        "Region Manager cannot assign to users outside their regions"
                    )
            # REMOVED: SUPER_ADMIN tenant check (schema provides isolation)
            # elif user.is_in_group(GROUP_SUPER_ADMIN):
            #     if assigned_user.tenant_id != user.tenant_id:
            #         raise PermissionError(
            #             "Cannot assign to users outside your tenant"
            #         )
            
            # SUPER_ADMIN can assign to any user in current tenant schema (automatic isolation)
        
        application.assigned_to_id = data.assigned_to_id
        update_fields.append('assigned_to_id')
    
    if data.required_documents is not None:
        application.required_documents = data.required_documents
        update_fields.append('required_documents')
    
    if data.status is not None:
        application.status = data.status
        update_fields.append('status')
    
    if data.expiry_date is not None:
        application.expiry_date = data.expiry_date
        update_fields.append('expiry_date')
    
    if data.date_applied is not None:
        application.date_applied = data.date_applied
        update_fields.append('date_applied')
    
    if data.date_opened is not None:
        application.date_opened = data.date_opened
        update_fields.append('date_opened')
    
    if data.final_date is not None:
        application.final_date = data.final_date
        update_fields.append('final_date')
    
    if data.date_granted is not None:
        application.date_granted = data.date_granted
        update_fields.append('date_granted')
    
    if data.date_rejected is not None:
        application.date_rejected = data.date_rejected
        update_fields.append('date_rejected')
    
    if data.date_withdrawn is not None:
        application.date_withdrawn = data.date_withdrawn
        update_fields.append('date_withdrawn')
    
    # Set updated_by
    application.updated_by = user
    
    # Validate and save
    application.full_clean()
    application.save(update_fields=update_fields)
    
    return application
