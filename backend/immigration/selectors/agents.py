"""
Agent selectors for read operations.

This module implements the selector pattern for agent queries.
Agents are not tenant-scoped, so all authenticated users can view all agents.
"""

from django.db.models import QuerySet
from typing import Optional, Dict, Any

from immigration.models.agent import Agent


def agent_list(*, user, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> QuerySet[Agent]:
    """
    Get agents with optional filtering.

    Note: Agents are not tenant-scoped, so all authenticated users can view all agents.
    This may change in the future if multi-tenant agent management is required.

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (agent_name, agent_type, email, etc.)
        include_deleted: If True, include soft-deleted agents in results

    Returns:
        QuerySet of Agent objects
    """
    filters = filters or {}

    # Start with base queryset
    base_manager = Agent.all_objects if include_deleted else Agent.objects
    qs = base_manager.select_related(
        'created_by',
        'updated_by'
    ).all()
    
    # Apply filters
    
    if 'search' in filters and filters['search']:
        from django.db.models import Q
        search_term = filters['search']
        qs = qs.filter(
            Q(agent_name__icontains=search_term) |
            Q(email__icontains=search_term) |
            Q(phone_number__icontains=search_term)
        )
    
    if 'agent_name' in filters and filters['agent_name']:
        qs = qs.filter(agent_name__icontains=filters['agent_name'])
    
    if 'agent_type' in filters and filters['agent_type']:
        qs = qs.filter(agent_type=filters['agent_type'])
    
    if 'email' in filters and filters['email']:
        qs = qs.filter(email__icontains=filters['email'])
    
    if 'phone_number' in filters and filters['phone_number']:
        qs = qs.filter(phone_number__icontains=filters['phone_number'])
    
    if 'country' in filters and filters['country']:
        qs = qs.filter(country=filters['country'])
    
    return qs.order_by('agent_name')


def agent_get(*, agent_id: int, user, include_deleted: bool = False) -> Optional[Agent]:
    """
    Get a single agent by ID.

    Args:
        agent_id: ID of the agent to retrieve
        user: Authenticated user making the request
        include_deleted: If True, include soft-deleted agents

    Returns:
        Agent instance or None if not found
    """
    base_manager = Agent.all_objects if include_deleted else Agent.objects
    
    try:
        return base_manager.select_related(
            'created_by',
            'updated_by'
        ).get(id=agent_id)
    except Agent.DoesNotExist:
        return None


def deleted_agents_list(*, user) -> QuerySet[Agent]:
    """
    Get all soft-deleted agents.

    Args:
        user: Authenticated user making the request

    Returns:
        QuerySet of soft-deleted Agent objects
    """
    return Agent.all_objects.filter(deleted_at__isnull=False).select_related(
        'created_by',
        'updated_by'
    ).order_by('-deleted_at')
