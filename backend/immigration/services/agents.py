"""
Agent services for write operations with business logic.

This module implements the service pattern for agent operations,
providing validation, scope checking, and transactional integrity.
"""

from django.db import transaction
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from immigration.models.agent import Agent


class AgentCreateInput(BaseModel):
    """Input model for agent creation with validation."""

    agent_name: str = Field(..., min_length=1, max_length=100)
    agent_type: str = Field(..., pattern="^(SUPER_AGENT|SUB_AGENT)$")
    company_name: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=15)
    email: Optional[EmailStr] = None
    website: Optional[str] = Field(None, max_length=100)
    invoice_to: Optional[str] = Field(None, max_length=100)
    street: Optional[str] = Field(None, max_length=100)
    suburb: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    description: Optional[str] = Field(None, max_length=500)

    class Config:
        str_strip_whitespace = True


class AgentUpdateInput(BaseModel):
    """Input model for agent updates with validation."""

    agent_name: Optional[str] = Field(None, min_length=1, max_length=100)
    agent_type: Optional[str] = Field(None, pattern="^(SUPER_AGENT|SUB_AGENT)$")
    company_name: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=15)
    email: Optional[EmailStr] = None
    website: Optional[str] = Field(None, max_length=100)
    invoice_to: Optional[str] = Field(None, max_length=100)
    street: Optional[str] = Field(None, max_length=100)
    suburb: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postcode: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    description: Optional[str] = Field(None, max_length=500)

    class Config:
        str_strip_whitespace = True


@transaction.atomic
def agent_create(*, data: AgentCreateInput, user) -> Agent:
    """
    Create a new agent.

    Business rules:
    - Any authenticated user can create agents
    - Agent name must be unique

    Args:
        data: AgentCreateInput with agent details
        user: Authenticated user creating the agent

    Returns:
        Created Agent instance

    Raises:
        ValueError: If validation fails
    """
    # Check for duplicate agent name
    if Agent.objects.filter(agent_name=data.agent_name).exists():
        raise ValueError(f"Agent with name '{data.agent_name}' already exists")

    # Create agent
    agent = Agent.objects.create(
        agent_name=data.agent_name,
        agent_type=data.agent_type,
        company_name=data.company_name or '',
        designation=data.designation or '',
        phone_number=data.phone_number or '',
        email=data.email or None,  # Use None instead of empty string for email
        website=data.website or '',
        invoice_to=data.invoice_to or '',
        street=data.street or '',
        suburb=data.suburb or '',
        state=data.state or '',
        postcode=data.postcode or '',
        country=data.country or '',
        description=data.description or '',
        created_by=user,
        updated_by=user
    )

    return agent


@transaction.atomic
def agent_update(*, agent: Agent, data: AgentUpdateInput, user) -> Agent:
    """
    Update an existing agent.

    Business rules:
    - Agent name uniqueness is maintained

    Args:
        agent: Existing Agent instance to update
        data: AgentUpdateInput with fields to update
        user: Authenticated user performing the update

    Returns:
        Updated Agent instance

    Raises:
        ValueError: If validation fails
    """
    # Update only provided fields
    update_fields = ['updated_by']

    if data.agent_name is not None:
        # Check for name conflicts if name is changing
        if data.agent_name != agent.agent_name:
            if Agent.objects.filter(agent_name=data.agent_name).exists():
                raise ValueError(f"Agent with name '{data.agent_name}' already exists")
        agent.agent_name = data.agent_name
        update_fields.append('agent_name')

    if data.agent_type is not None:
        agent.agent_type = data.agent_type
        update_fields.append('agent_type')

    if data.company_name is not None:
        agent.company_name = data.company_name
        update_fields.append('company_name')

    if data.designation is not None:
        agent.designation = data.designation
        update_fields.append('designation')

    if data.phone_number is not None:
        agent.phone_number = data.phone_number
        update_fields.append('phone_number')

    if data.email is not None:
        agent.email = data.email or None  # Use None instead of empty string for email
        update_fields.append('email')

    if data.website is not None:
        agent.website = data.website
        update_fields.append('website')

    if data.invoice_to is not None:
        agent.invoice_to = data.invoice_to
        update_fields.append('invoice_to')

    if data.street is not None:
        agent.street = data.street
        update_fields.append('street')

    if data.suburb is not None:
        agent.suburb = data.suburb
        update_fields.append('suburb')

    if data.state is not None:
        agent.state = data.state
        update_fields.append('state')

    if data.postcode is not None:
        agent.postcode = data.postcode
        update_fields.append('postcode')

    if data.country is not None:
        agent.country = data.country
        update_fields.append('country')

    if data.description is not None:
        agent.description = data.description
        update_fields.append('description')

    # Set updated_by
    agent.updated_by = user

    # Validate and save
    agent.full_clean()
    agent.save(update_fields=update_fields)

    return agent


@transaction.atomic
def agent_delete(*, agent: Agent, user) -> None:
    """
    Soft delete an agent (sets deleted_at timestamp).

    Args:
        agent: Agent instance to delete
        user: Authenticated user performing the deletion
    """
    agent.delete()  # Soft delete sets deleted_at field


@transaction.atomic
def agent_restore(*, agent: Agent, user) -> Agent:
    """
    Restore a soft-deleted agent.

    Args:
        agent: Soft-deleted Agent instance to restore
        user: Authenticated user performing the restoration

    Returns:
        Restored Agent instance

    Raises:
        ValueError: If agent is not soft-deleted
    """
    if not agent.is_deleted:
        raise ValueError("Agent is not soft-deleted")

    agent.restore()
    agent.updated_by = user
    agent.save(update_fields=['deleted_at', 'updated_by'])

    return agent