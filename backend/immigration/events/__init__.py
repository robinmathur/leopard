"""
Event-driven framework for handling side effects of entity changes.

This framework provides:
- Event queuing in database
- Async processing of events
- Configurable handlers for client activity, tasks, and notifications
- Automatic SSE delivery via notifications
"""

# Import models to ensure they're discoverable by Django
from immigration.events.models import Event, EventProcessingControl

__all__ = ['Event', 'EventProcessingControl']
