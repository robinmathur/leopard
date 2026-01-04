"""
Django app configuration for events framework.
"""

import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class EventsConfig(AppConfig):
    """App configuration for events framework."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'immigration.events'
    verbose_name = 'Event-Driven Framework'
    
    def ready(self):
        """Register handlers and process pending events on startup."""
        # Import handlers to register them
        from immigration.events.handlers import client_activity_handler
        from immigration.events.handlers import notification_handler
        from immigration.events.handlers import task_handler
        from immigration.events.processor import register_handler
        
        # Register handlers
        register_handler('client_activity', client_activity_handler.handle)
        register_handler('notification', notification_handler.handle)
        register_handler('task', task_handler.handle)
        
        logger.info("Event handlers registered")
        
        # Import dispatcher to register signals
        from immigration.events import dispatcher
        
        logger.info("Event dispatcher signals registered")
        
        # Process pending events on startup (if not paused)
        try:
            from immigration.events.processor import process_pending_events
            from tenants.models import EventProcessingControl
            
            if not EventProcessingControl.is_processing_paused():
                process_pending_events()
                logger.info("Processed pending events on startup")
            else:
                logger.info("Event processing is paused. Skipping startup recovery.")
        except Exception as e:
            logger.error(f"Error processing pending events on startup: {e}", exc_info=True)
