"""
Timeline services for business logic.

These services handle client activity timeline operations.
ClientActivity is immutable - only creation and retrieval operations.
"""

from typing import Optional
from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from immigration.models import ClientActivity, Client

User = get_user_model()


def timeline_list(
    client_id: int,
    activity_type: Optional[str] = None,
    page_size: int = 25
) -> QuerySet:
    """
    List timeline activities for a client.
    
    Args:
        client_id: Client ID
        activity_type: Filter by activity type (optional)
        page_size: Number of items per page (default 25)
        
    Returns:
        QuerySet of ClientActivity records
    """
    queryset = ClientActivity.objects.select_related(
        'client', 'performed_by'
    ).filter(client_id=client_id)
    
    # Filter by activity type if provided
    if activity_type:
        queryset = queryset.filter(activity_type=activity_type)
    
    # Order by created_at descending (newest first)
    queryset = queryset.order_by('-created_at')
    
    return queryset


def timeline_create(
    client_id: int,
    activity_type: str,
    performed_by: User,
    description: str,
    metadata: Optional[dict] = None
) -> ClientActivity:
    """
    Create a new timeline activity for a client.
    
    This is typically called from signals or other services when
    significant actions occur (note added, stage changed, etc.).
    
    Args:
        client_id: Client ID
        activity_type: Type of activity (must be valid choice)
        performed_by: User who performed the activity
        description: Human-readable description
        metadata: Optional metadata dictionary
        
    Returns:
        Created ClientActivity instance
        
    Raises:
        Client.DoesNotExist: If client not found
        ValueError: If activity_type is invalid
    """
    # Validate activity type
    valid_types = [choice[0] for choice in ClientActivity.ACTIVITY_TYPE_CHOICES]
    if activity_type not in valid_types:
        raise ValueError(f'Invalid activity type: {activity_type}')
    
    # Get client (will raise DoesNotExist if not found)
    client = Client.objects.get(id=client_id)
    
    # Create activity
    activity = ClientActivity.objects.create(
        client=client,
        activity_type=activity_type,
        performed_by=performed_by,
        description=description,
        metadata=metadata or {}
    )
    
    return activity


def timeline_get_latest_activity(client_id: int) -> Optional[ClientActivity]:
    """
    Get the most recent activity for a client.
    
    Useful for displaying "last activity" information in client overview.
    
    Args:
        client_id: Client ID
        
    Returns:
        Most recent ClientActivity or None if no activities exist
    """
    return ClientActivity.objects.filter(
        client_id=client_id
    ).order_by('-created_at').first()
