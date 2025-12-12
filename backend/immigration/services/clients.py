"""
Client services for write operations with business logic.

This module implements the service pattern for client operations,
providing validation, scope checking, and transactional integrity.
"""

from django.db import transaction
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date

from immigration.models import Client
from immigration.constants import (
    ClientStage,
    GROUP_CONSULTANT,
    GROUP_BRANCH_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_SUPER_ADMIN,
    GROUP_SUPER_SUPER_ADMIN,
)


class ClientCreateInput(BaseModel):
    """Input model for client creation with validation."""
    
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=15)
    gender: str = Field(..., pattern="^(MALE|FEMALE|OTHER)$")
    dob: Optional[date] = None
    country: str = Field(..., min_length=2, max_length=2)
    
    # Address fields
    street: Optional[str] = Field(None, max_length=20)
    suburb: Optional[str] = Field(None, max_length=20)
    state: Optional[str] = Field(None, max_length=20)
    postcode: Optional[str] = Field(None, max_length=20)
    
    # Business fields
    visa_category_id: Optional[int] = None
    agent_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    stage: Optional[str] = Field(None, pattern="^(LE|FU|CT|CL)$")
    referred_by: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    active: bool = False
    
    class Config:
        str_strip_whitespace = True


class ClientUpdateInput(BaseModel):
    """Input model for client updates with validation."""
    
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = Field(None, max_length=15)
    gender: Optional[str] = Field(None, pattern="^(MALE|FEMALE|OTHER)$")
    dob: Optional[date] = None
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    
    # Address fields
    street: Optional[str] = Field(None, max_length=20)
    suburb: Optional[str] = Field(None, max_length=20)
    state: Optional[str] = Field(None, max_length=20)
    postcode: Optional[str] = Field(None, max_length=20)
    
    # Business fields
    visa_category_id: Optional[int] = None
    agent_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    stage: Optional[str] = Field(None, pattern="^(LEAD|FOLLOW_UP|CLIENT|CLOSE)$")
    referred_by: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    active: Optional[bool] = None
    
    class Config:
        str_strip_whitespace = True


@transaction.atomic
def client_create(*, data: ClientCreateInput, user) -> Client:
    """
    Create a new client with proper scope validation.
    
    Business rules:
    - User must be authenticated
    - Branch Admin can only assign to users in their branch
    - Created_by is automatically set to the requesting user
    - Defaults active=False, requires explicit activation
    
    Args:
        data: ClientCreateInput with validated client data
        user: Authenticated user creating the client
    
    Returns:
        Created Client instance
    
    Raises:
        PermissionError: If user lacks permission for the operation
        ValueError: If validation fails
    """
    # Validate assigned_to user scope
    if data.assigned_to_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            assigned_user = User.objects.get(id=data.assigned_to_id)
        except User.DoesNotExist:
            raise ValueError(f"Assigned user with id={data.assigned_to_id} does not exist")
        
        # Group-based scope validation
        if user.is_in_group(GROUP_BRANCH_ADMIN):
            # Check if assigned user shares any branches with the creator
            user_branch_ids = set(user.branches.values_list('id', flat=True))
            assigned_branch_ids = set(assigned_user.branches.values_list('id', flat=True))
            if not user_branch_ids.intersection(assigned_branch_ids):
                raise PermissionError(
                    "Branch Admin cannot assign clients to users outside their branches"
                )
        
        elif user.is_in_group(GROUP_REGION_MANAGER):
            # Check if assigned user shares any regions with the creator
            user_region_ids = set(user.regions.values_list('id', flat=True))
            assigned_region_ids = set(assigned_user.regions.values_list('id', flat=True))
            if not user_region_ids.intersection(assigned_region_ids):
                raise PermissionError(
                    "Region Manager cannot assign clients to users outside their regions"
                )
        
        elif user.is_in_group(GROUP_SUPER_ADMIN):
            # Check tenant boundary
            if assigned_user.tenant_id != user.tenant_id:
                raise PermissionError(
                    "Cannot assign clients to users outside your tenant"
                )
    
    # Create client instance
    client = Client(
        first_name=data.first_name,
        middle_name=data.middle_name or '',
        last_name=data.last_name or '',
        email=data.email or '',
        phone_number=data.phone_number or '',
        gender=data.gender,
        dob=data.dob,
        country=data.country,
        street=data.street or '',
        suburb=data.suburb or '',
        state=data.state or '',
        postcode=data.postcode or '',
        visa_category_id=data.visa_category_id,
        agent_id=data.agent_id,
        assigned_to_id=data.assigned_to_id,
        stage=data.stage or ClientStage.LEAD.value,
        referred_by=data.referred_by or '',
        description=data.description or '',
        active=data.active,
        created_by=user,
        updated_by=user
    )
    
    # Validate and save
    client.full_clean()
    client.save()
    
    return client


@transaction.atomic
def client_update(*, client: Client, data: ClientUpdateInput, user) -> Client:
    """
    Update an existing client with scope validation.
    
    Business rules:
    - User must have access to the client (via selectors)
    - Only non-None fields in data are updated
    - Updated_by is automatically set to the requesting user
    
    Args:
        client: Existing Client instance to update
        data: ClientUpdateInput with fields to update
        user: Authenticated user performing the update
    
    Returns:
        Updated Client instance
    
    Raises:
        PermissionError: If user lacks permission for the operation
    """
    # Update only provided fields
    update_fields = ['updated_by']
    
    if data.first_name is not None:
        client.first_name = data.first_name
        update_fields.append('first_name')
    
    if data.middle_name is not None:
        client.middle_name = data.middle_name
        update_fields.append('middle_name')
    
    if data.last_name is not None:
        client.last_name = data.last_name
        update_fields.append('last_name')
    
    if data.email is not None:
        client.email = data.email
        update_fields.append('email')
    
    if data.phone_number is not None:
        client.phone_number = data.phone_number
        update_fields.append('phone_number')
    
    if data.gender is not None:
        client.gender = data.gender
        update_fields.append('gender')
    
    if data.dob is not None:
        client.dob = data.dob
        update_fields.append('dob')
    
    if data.country is not None:
        client.country = data.country
        update_fields.append('country')
    
    if data.street is not None:
        client.street = data.street
        update_fields.append('street')
    
    if data.suburb is not None:
        client.suburb = data.suburb
        update_fields.append('suburb')
    
    if data.state is not None:
        client.state = data.state
        update_fields.append('state')
    
    if data.postcode is not None:
        client.postcode = data.postcode
        update_fields.append('postcode')
    
    if data.visa_category_id is not None:
        client.visa_category_id = data.visa_category_id
        update_fields.append('visa_category_id')
    
    if data.agent_id is not None:
        client.agent_id = data.agent_id
        update_fields.append('agent_id')
    
    if data.assigned_to_id is not None:
        # Validate scope for assigned_to change
        if data.assigned_to_id != client.assigned_to_id:
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
                        "Branch Admin cannot assign clients to users outside their branches"
                    )
            elif user.is_in_group(GROUP_REGION_MANAGER):
                # Check if assigned user shares any regions with the updater
                user_region_ids = set(user.regions.values_list('id', flat=True))
                assigned_region_ids = set(assigned_user.regions.values_list('id', flat=True))
                if not user_region_ids.intersection(assigned_region_ids):
                    raise PermissionError(
                        "Region Manager cannot assign clients to users outside their regions"
                    )
            elif user.is_in_group(GROUP_SUPER_ADMIN):
                # Check tenant boundary
                if assigned_user.tenant_id != user.tenant_id:
                    raise PermissionError(
                        "Cannot assign clients to users outside your tenant"
                    )
        
        client.assigned_to_id = data.assigned_to_id
        update_fields.append('assigned_to_id')
    
    if data.stage is not None:
        client.stage = data.stage
        update_fields.append('stage')
    
    if data.referred_by is not None:
        client.referred_by = data.referred_by
        update_fields.append('referred_by')
    
    if data.description is not None:
        client.description = data.description
        update_fields.append('description')
    
    if data.active is not None:
        client.active = data.active
        update_fields.append('active')
    
    # Set updated_by
    client.updated_by = user
    
    # Validate and save
    client.full_clean()
    client.save(update_fields=update_fields)
    
    return client


@transaction.atomic
def client_delete(*, client: Client, user) -> None:
    """
    Soft delete a client (sets deleted_at timestamp).

    Args:
        client: Client instance to delete
        user: Authenticated user performing the deletion

    Note:
        Uses soft deletion - client is marked as deleted but not removed from DB
    """
    client.delete()  # Soft delete sets deleted_at field


@transaction.atomic
def client_restore(*, client: Client, user) -> Client:
    """
    Restore a soft-deleted client.

    Args:
        client: Soft-deleted Client instance to restore
        user: Authenticated user performing the restoration

    Returns:
        Restored Client instance

    Raises:
        ValueError: If client is not soft-deleted
    """
    if not client.is_deleted:
        raise ValueError("Client is not soft-deleted")

    client.restore()
    client.updated_by = user
    client.save(update_fields=['deleted_at', 'updated_by'])

    return client
