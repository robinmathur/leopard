"""
Event processor for async event handling.

Multi-tenant: Wraps event processing in correct schema context based on
event.tenant_schema field. Checks pause state in public schema.
"""

import logging
import threading
from typing import List, Dict, Any
from django.utils import timezone
from django_tenants.utils import schema_context

from immigration.events.models import Event, EventStatus, EventProcessingControl
from immigration.events.config import EVENT_HANDLERS, ADMIN_ALERT_CONFIG, PROCESSING_CONFIG
from immigration.events.conditions import evaluate_condition
from immigration.events.handlers.base import HandlerResult, HandlerStatus

logger = logging.getLogger(__name__)


# Handler registry
HANDLER_REGISTRY = {}


def register_handler(handler_name: str, handler_func):
    """Register a handler function."""
    HANDLER_REGISTRY[handler_name] = handler_func


def get_handler(handler_name: str):
    """Get handler function by name."""
    return HANDLER_REGISTRY.get(handler_name)


def process_event_async(event_id: int):
    """
    Process an event asynchronously in a separate thread.
    
    This function is called from dispatcher after event is created.
    """
    def process():
        try:
            event = Event.objects.get(id=event_id)
            process_event(event)
        except Event.DoesNotExist:
            logger.error(f"Event {event_id} not found")
        except Exception as e:
            logger.error(f"Error processing event {event_id}: {e}", exc_info=True)
    
    thread = threading.Thread(target=process, daemon=True)
    thread.start()


def process_event(event: Event):
    """
    Process a single event by executing configured handlers.

    Multi-tenant: Switches to event's tenant schema for processing.
    """
    # Check pause state in public schema
    with schema_context('public'):
        if EventProcessingControl.is_processing_paused():
            logger.info(f"Event processing is paused. Event {event.id} will be processed later.")
            return

    # CRITICAL: Switch to tenant schema for processing
    tenant_schema = event.tenant_schema

    with schema_context(tenant_schema):
        # Update status to PROCESSING
        event.status = EventStatus.PROCESSING
        event.save(update_fields=['status'])

        try:
            # Get handlers for this event type
            handlers_config = EVENT_HANDLERS.get(event.event_type, [])

            if not handlers_config:
                # No handlers configured - mark as completed
                event.status = EventStatus.COMPLETED
                event.processed_at = timezone.now()
                event.save(update_fields=['status', 'processed_at'])
                return

            # Execute handlers (ALL queries now tenant-scoped automatically)
            results = execute_handlers(event, handlers_config)

            # Store results
            event.handler_results = {r.handler_name: r.to_dict() for r in results}

            # Check if any handler failed
            has_failures = any(r.status == HandlerStatus.FAILED for r in results)

            if has_failures:
                # Check if we can retry
                if event.can_retry():
                    event.status = EventStatus.PENDING
                    event.retry_count += 1
                    event.error_message = f"Handler failures. Retry {event.retry_count}/{event.max_retries}"
                    event.save(update_fields=['status', 'retry_count', 'error_message', 'handler_results'])

                    # Retry after a short delay
                    import time
                    time.sleep(1)
                    process_event_async(event.id)
                else:
                    # Retries exhausted
                    event.status = EventStatus.FAILED
                    event.error_message = "All retries exhausted"
                    event.processed_at = timezone.now()
                    event.save(update_fields=['status', 'error_message', 'processed_at', 'handler_results'])

                    # Alert admin if configured
                    if ADMIN_ALERT_CONFIG.get('enabled') and ADMIN_ALERT_CONFIG.get('alert_on_retry_exhausted'):
                        alert_admin_on_failure(event)
            else:
                # All handlers succeeded
                event.status = EventStatus.COMPLETED
                event.processed_at = timezone.now()
                event.save(update_fields=['status', 'processed_at', 'handler_results'])

        except Exception as e:
            logger.error(f"Error processing event {event.id}: {e}", exc_info=True)

            # Check if we can retry
            if event.can_retry():
                event.status = EventStatus.PENDING
                event.retry_count += 1
                event.error_message = str(e)
                event.save(update_fields=['status', 'retry_count', 'error_message'])

                # Retry
                import time
                time.sleep(1)
                process_event_async(event.id)
            else:
                # Retries exhausted
                event.status = EventStatus.FAILED
                event.error_message = str(e)
                event.processed_at = timezone.now()
                event.save(update_fields=['status', 'error_message', 'processed_at'])

                # Alert admin if configured
                if ADMIN_ALERT_CONFIG.get('enabled') and ADMIN_ALERT_CONFIG.get('alert_on_retry_exhausted'):
                    alert_admin_on_failure(event)


def execute_handlers(event: Event, handlers_config: List[Dict[str, Any]]) -> List[HandlerResult]:
    """Execute all configured handlers for an event."""
    results = []
    
    for handler_config in handlers_config:
        # Check if handler is enabled
        if not handler_config.get('enabled', True):
            continue
        
        # Check condition if present
        condition = handler_config.get('condition')
        if condition:
            if not evaluate_condition(event, condition):
                results.append(HandlerResult(
                    handler_name=handler_config.get('handler', 'unknown'),
                    status=HandlerStatus.SKIPPED,
                    message='Condition not met'
                ))
                continue
        
        # Execute handler
        result = execute_handler(event, handler_config)
        results.append(result)
    
    return results


def execute_handler(event: Event, handler_config: Dict[str, Any]) -> HandlerResult:
    """Execute a single handler."""
    handler_name = handler_config.get('handler')
    
    if not handler_name:
        return HandlerResult(
            handler_name='unknown',
            status=HandlerStatus.FAILED,
            message='No handler name specified',
            error='Handler name missing'
        )
    
    # Get handler function
    handler_func = get_handler(handler_name)
    
    if not handler_func:
        return HandlerResult(
            handler_name=handler_name,
            status=HandlerStatus.FAILED,
            message=f'Handler "{handler_name}" not found',
            error=f'Handler not registered: {handler_name}'
        )
    
    try:
        # Execute handler
        result = handler_func(event, handler_config)
        return result
    except Exception as e:
        logger.error(f"Error executing handler {handler_name} for event {event.id}: {e}", exc_info=True)
        return HandlerResult(
            handler_name=handler_name,
            status=HandlerStatus.FAILED,
            message=f'Handler execution failed: {str(e)}',
            error=str(e)
        )


def alert_admin_on_failure(event: Event):
    """Alert admin when event processing fails after retries."""
    if not ADMIN_ALERT_CONFIG.get('enabled'):
        return
    
    methods = ADMIN_ALERT_CONFIG.get('methods', [])
    
    if 'notification' in methods:
        # Create notification for admin users
        admin_user_ids = ADMIN_ALERT_CONFIG.get('admin_user_ids', [])
        if admin_user_ids:
            from django.contrib.auth import get_user_model
            from immigration.services.notifications import notification_create
            from immigration.constants import NotificationType
            
            User = get_user_model()
            admins = User.objects.filter(id__in=admin_user_ids)
            
            for admin in admins:
                notification_create(
                    notification_type=NotificationType.SYSTEM_ALERT.value,
                    assigned_to=admin,
                    title='Event Processing Failed',
                    message=f'Event {event.event_type} (ID: {event.id}) failed after {event.max_retries} retries.',
                    meta_info={
                        'event_id': event.id,
                        'event_type': event.event_type,
                        'error_message': event.error_message,
                    },
                )


def process_pending_events(batch_size: int = None):
    """
    Process pending events (for startup recovery).

    NOTE: For multi-tenant setups, use process_pending_events_multi_tenant() instead.
    This function only works within a single schema context.
    """
    if batch_size is None:
        batch_size = PROCESSING_CONFIG.get('batch_size_on_startup', 100)

    # Check if processing is paused (check public schema for multi-tenant)
    with schema_context('public'):
        if EventProcessingControl.is_processing_paused():
            logger.info("Event processing is paused. Skipping pending events.")
            return

    pending_events = Event.objects.filter(status=EventStatus.PENDING)[:batch_size]

    logger.info(f"Processing {pending_events.count()} pending events...")

    for event in pending_events:
        process_event_async(event.id)


def process_pending_events_multi_tenant():
    """
    Process pending events across all tenants on startup.

    Multi-tenant: Iterates through all active tenants and processes their pending events.
    """
    from tenants.models import Tenant

    # Get all active tenants from public schema
    with schema_context('public'):
        tenants = Tenant.objects.filter(is_active=True)
        is_paused = EventProcessingControl.is_processing_paused()

    if is_paused:
        logger.info("Event processing is paused globally. Skipping all pending events.")
        return

    batch_size = PROCESSING_CONFIG.get('batch_size_on_startup', 100)

    for tenant in tenants:
        schema_name = tenant.schema_name

        try:
            with schema_context(schema_name):
                pending_events = Event.objects.filter(
                    status=EventStatus.PENDING
                )[:batch_size]

                count = pending_events.count()
                logger.info(
                    f"Processing {count} pending events "
                    f"for tenant {tenant.name} ({schema_name})"
                )

                for event in pending_events:
                    process_event_async(event.id)
        except Exception as e:
            logger.error(
                f"Error processing events for tenant {tenant.name}: {e}",
                exc_info=True
            )
