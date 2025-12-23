from django.apps import AppConfig


class ImmigrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'immigration'

    def ready(self):
        # Initialize events framework
        import logging
        logger = logging.getLogger(__name__)

        # Import EventsConfig and call ready() manually
        from immigration.events.apps import EventsConfig

        # Manually instantiate and initialize
        # Since immigration.events is not a separate app, we need to call ready() manually
        try:
            # Import to trigger module-level code (handler registration)
            from immigration.events.processor import register_handler
            from immigration.events.handlers import client_activity_handler
            from immigration.events.handlers import notification_handler
            from immigration.events.handlers import task_handler

            # Register handlers
            register_handler('client_activity', client_activity_handler.handle)
            register_handler('notification', notification_handler.handle)
            register_handler('task', task_handler.handle)

            # Import dispatcher to register signals (this happens on import due to @receiver decorators)
            from immigration.events import dispatcher  # noqa: F401

            # Process pending events on startup - ALL TENANTS
            from immigration.events.processor import process_pending_events_multi_tenant
            from immigration.events.models import EventProcessingControl
            from django_tenants.utils import schema_context

            # Check if tables exist before processing events (skip during migrations)
            try:
                with schema_context('public'):
                    if not EventProcessingControl.is_processing_paused():
                        process_pending_events_multi_tenant()
            except Exception as e:
                # Table doesn't exist yet (e.g., during migrations)
                logger.debug(f"Skipping event processing on startup: {e}")
        except Exception as e:
            logger.error(f"Error initializing events framework: {e}", exc_info=True)
        
        # Old signals are now replaced by event framework
        # import immigration.signals  # Disabled - using event framework instead
        pass
