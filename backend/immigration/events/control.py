"""
Control functions for pausing/resuming event processing.
"""

import logging
from django.utils import timezone
from django.contrib.auth import get_user_model

from immigration.events.models import EventProcessingControl

logger = logging.getLogger(__name__)
User = get_user_model()


def pause_processing(user=None, reason: str = None):
    """
    Pause event processing.
    
    Args:
        user: User who paused processing
        reason: Reason for pausing
    """
    control = EventProcessingControl.get_instance()
    control.is_paused = True
    control.paused_at = timezone.now()
    control.paused_by = user
    control.pause_reason = reason
    control.save()
    
    logger.info(f"Event processing paused by {user} at {control.paused_at}. Reason: {reason}")


def resume_processing(user=None):
    """
    Resume event processing.
    
    Args:
        user: User who resumed processing
    """
    control = EventProcessingControl.get_instance()
    control.is_paused = False
    control.resumed_at = timezone.now()
    control.resumed_by = user
    control.save()
    
    logger.info(f"Event processing resumed by {user} at {control.resumed_at}")
    
    # Process pending events
    from immigration.events.processor import process_pending_events
    process_pending_events()


def get_processing_status() -> dict:
    """
    Get current processing status.
    
    Returns:
        Dictionary with status information
    """
    control = EventProcessingControl.get_instance()
    
    from immigration.events.models import Event, EventStatus
    
    pending_count = Event.objects.filter(status=EventStatus.PENDING).count()
    processing_count = Event.objects.filter(status=EventStatus.PROCESSING).count()
    failed_count = Event.objects.filter(status=EventStatus.FAILED).count()
    
    return {
        'is_paused': control.is_paused,
        'paused_at': control.paused_at.isoformat() if control.paused_at else None,
        'paused_by': control.paused_by.username if control.paused_by else None,
        'pause_reason': control.pause_reason,
        'resumed_at': control.resumed_at.isoformat() if control.resumed_at else None,
        'resumed_by': control.resumed_by.username if control.resumed_by else None,
        'pending_events': pending_count,
        'processing_events': processing_count,
        'failed_events': failed_count,
    }
