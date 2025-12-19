"""
Event cleanup utilities.
"""

import logging
from datetime import timedelta
from django.utils import timezone

from immigration.events.models import Event, EventStatus
from immigration.events.config import EVENT_CLEANUP_CONFIG

logger = logging.getLogger(__name__)


def cleanup_old_events():
    """
    Clean up old completed events.
    
    Deletes events that are:
    - Status: COMPLETED
    - Older than retention_days (default 7 days)
    """
    if not EVENT_CLEANUP_CONFIG.get('enabled'):
        logger.info("Event cleanup is disabled")
        return
    
    retention_days = EVENT_CLEANUP_CONFIG.get('retention_days', 7)
    batch_size = EVENT_CLEANUP_CONFIG.get('batch_size', 1000)
    
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    
    # Get old completed events
    old_events = Event.objects.filter(
        status=EventStatus.COMPLETED,
        processed_at__lt=cutoff_date
    )[:batch_size]
    
    count = old_events.count()
    
    if count > 0:
        # Delete in batches
        deleted = 0
        for event in old_events:
            event.delete()
            deleted += 1
        
        logger.info(f"Cleaned up {deleted} old events (older than {retention_days} days)")
    else:
        logger.info("No old events to clean up")
    
    return count
