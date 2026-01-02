"""
User Presence Service

Tracks online users for SSE optimization.
Users are marked as online when they connect to SSE stream,
and marked as offline when they disconnect or after TTL expires.
"""

from typing import Optional
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

# TTL for online status (5 minutes)
ONLINE_TTL = 300  # seconds


def mark_user_online(user_id: int) -> None:
    """
    Mark a user as online.
    
    Args:
        user_id: User ID to mark as online
    """
    cache_key = f"user_online_{user_id}"
    cache.set(cache_key, timezone.now().isoformat(), ONLINE_TTL)


def mark_user_offline(user_id: int) -> None:
    """
    Mark a user as offline.
    
    Args:
        user_id: User ID to mark as offline
    """
    cache_key = f"user_online_{user_id}"
    cache.delete(cache_key)


def is_user_online(user_id: int) -> bool:
    """
    Check if a user is currently online.
    
    Args:
        user_id: User ID to check
        
    Returns:
        True if user is online, False otherwise
    """
    cache_key = f"user_online_{user_id}"
    return cache.get(cache_key) is not None


def get_online_users(user_ids: list[int]) -> list[int]:
    """
    Get list of online user IDs from a list of user IDs.
    
    Args:
        user_ids: List of user IDs to check
        
    Returns:
        List of user IDs that are online
    """
    online_users = []
    for user_id in user_ids:
        if is_user_online(user_id):
            online_users.append(user_id)
    return online_users


def refresh_user_online_status(user_id: int) -> None:
    """
    Refresh the online status timestamp for a user.
    This should be called on SSE heartbeat to keep the user marked as online.
    
    Args:
        user_id: User ID to refresh
    """
    mark_user_online(user_id)

