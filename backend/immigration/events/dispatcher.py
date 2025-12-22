"""
Event dispatcher for creating events from model signals.

Multi-tenant: Captures tenant schema when creating events to enable
proper schema context switching during async processing.
"""

import logging
import threading
from django.db import transaction, connection
from django.dispatch import receiver
from django.db.models.signals import pre_save, post_save, pre_delete, post_delete

from immigration.events.models import Event, EventAction, EventProcessingControl
from immigration.events.state_tracker import capture_pre_update_state, serialize_model_instance, get_changed_fields
from immigration.events.processor import process_event_async
from immigration.middleware import get_current_user

logger = logging.getLogger(__name__)


# Store pre-save state in thread-local storage
_thread_local = threading.local()


def _get_pre_save_state(instance):
    """Get pre-save state from thread-local storage."""
    return getattr(_thread_local, f'_pre_save_state_{id(instance)}', None)


def _set_pre_save_state(instance, state):
    """Store pre-save state in thread-local storage."""
    setattr(_thread_local, f'_pre_save_state_{id(instance)}', state)


def _clear_pre_save_state(instance):
    """Clear pre-save state from thread-local storage."""
    if hasattr(_thread_local, f'_pre_save_state_{id(instance)}'):
        delattr(_thread_local, f'_pre_save_state_{id(instance)}')


def build_event_type(entity_type: str, action: str, field: str = None) -> str:
    """
    Build event type string.
    
    Examples:
    - 'Client.CREATE'
    - 'Client.assigned_to.UPDATE'
    - 'Task.DELETE'
    """
    if action == EventAction.UPDATE and field:
        return f"{entity_type}.{field}.UPDATE"
    return f"{entity_type}.{action}"


def has_handlers(event_type: str) -> bool:
    """Check if event type has configured handlers."""
    from immigration.events.config import EVENT_HANDLERS
    return event_type in EVENT_HANDLERS and len(EVENT_HANDLERS[event_type]) > 0


def is_tracked_entity(model_class) -> bool:
    """Check if model is in TRACKED_ENTITIES config."""
    from immigration.events.config import TRACKED_ENTITIES
    
    model_path = f"{model_class._meta.app_label}.{model_class.__name__}"
    
    for tracked in TRACKED_ENTITIES:
        if tracked['model'] == model_path:
            logger.debug(f"Model {model_path} is tracked")
            return True
    
    logger.debug(f"Model {model_path} is NOT tracked")
    return False


def get_tracked_fields(model_class) -> list:
    """Get list of tracked fields for a model."""
    from immigration.events.config import TRACKED_ENTITIES
    
    model_path = f"{model_class._meta.app_label}.{model_class.__name__}"
    
    for tracked in TRACKED_ENTITIES:
        if tracked['model'] == model_path:
            return tracked.get('track_fields', [])
    
    return []


@receiver(pre_save)
def capture_pre_save_state(sender, instance, **kwargs):
    """Capture model state before save."""
    # Only track configured entities
    if not is_tracked_entity(sender):
        return
    
    logger.debug(f"Capturing pre-save state for {sender.__name__} (pk={instance.pk})")
    
    # Capture previous state for updates
    if instance.pk:
        previous_state = capture_pre_update_state(instance)
        _set_pre_save_state(instance, previous_state)
        logger.debug(f"Captured previous state for {sender.__name__}: {list(previous_state.keys()) if previous_state else 'None'}")


@receiver(post_save)
def create_event_on_save(sender, instance, created, **kwargs):
    """Create event after model save."""
    # Only track configured entities
    if not is_tracked_entity(sender):
        logger.info(f"Skipping {sender.__name__} - not in TRACKED_ENTITIES")
        return
    
    # Print to console as well for immediate visibility
    print(f"[EVENTS] Processing post_save for {sender.__name__} (pk={instance.pk}, created={created})")
    logger.info(f"Processing post_save for {sender.__name__} (pk={instance.pk}, created={created})")
    
    # Get previous state
    previous_state = _get_pre_save_state(instance) or {}
    current_state = serialize_model_instance(instance)
    
    # Determine action
    action = EventAction.CREATE if created else EventAction.UPDATE
    
    # For UPDATE, check if tracked fields changed
    if not created:
        tracked_fields = get_tracked_fields(sender)
        changed = get_changed_fields(previous_state, current_state)
        logger.info(f"Previous state keys: {list(previous_state.keys())}")
        logger.info(f"Current state keys: {list(current_state.keys())}")
        logger.info(f"All changed fields: {changed}")
        logger.info(f"Tracked fields: {tracked_fields}")
        
        if tracked_fields:
            # Only create event if tracked fields changed
            relevant_changes = [f for f in changed if f in tracked_fields]
            logger.info(f"Relevant changes (in tracked fields): {relevant_changes}")
            if not relevant_changes:
                print(f"[EVENTS] ✗ No relevant changes for {sender.__name__}, skipping event creation")
                logger.info(f"No relevant changes for {sender.__name__}, skipping event creation")
                _clear_pre_save_state(instance)
                return
        else:
            # No tracked fields means track all changes
            if not changed:
                logger.debug(f"No changes detected for {sender.__name__}, skipping event creation")
                _clear_pre_save_state(instance)
                return
    else:
        changed = []
    
    # Build event type
    entity_type = sender.__name__
    
    # For UPDATE with specific field changes, create field-specific events
    if not created and changed:
        tracked_fields = get_tracked_fields(sender)
        logger.info(f"Changed fields: {changed}, Tracked fields: {tracked_fields}")
        for field in changed:
            if not tracked_fields or field in tracked_fields:
                event_type = build_event_type(entity_type, action, field)
                logger.info(f"Built event_type: {event_type}, has_handlers: {has_handlers(event_type)}")
                # Only create event if handlers are configured
                if has_handlers(event_type):
                    print(f"[EVENTS] ✓ Creating event: {event_type} for {entity_type}:{instance.pk}")
                    logger.info(f"Creating event: {event_type} for {entity_type}:{instance.pk}")
                    _create_event(
                        event_type=event_type,
                        entity_type=entity_type,
                        entity_id=instance.pk,
                        action=action,
                        previous_state=previous_state,
                        current_state=current_state,
                        changed_fields=[field],
                    )
                else:
                    print(f"[EVENTS] ✗ No handlers configured for {event_type}")
                    logger.info(f"No handlers configured for {event_type}")
    else:
        # Generic CREATE or DELETE event
        event_type = build_event_type(entity_type, action)
        if has_handlers(event_type):
            _create_event(
                event_type=event_type,
                entity_type=entity_type,
                entity_id=instance.pk,
                action=action,
                previous_state=previous_state,
                current_state=current_state,
                changed_fields=changed,
            )
    
    # Clear pre-save state
    _clear_pre_save_state(instance)


@receiver(post_delete)
def create_event_on_delete(sender, instance, **kwargs):
    """Create event after model delete."""
    # Only track configured entities
    if not is_tracked_entity(sender):
        return
    
    # Capture state before deletion
    previous_state = serialize_model_instance(instance)
    current_state = {}  # Empty after deletion
    
    entity_type = sender.__name__
    event_type = build_event_type(entity_type, EventAction.DELETE)
    
    if has_handlers(event_type):
        _create_event(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=instance.pk,
            action=EventAction.DELETE,
            previous_state=previous_state,
            current_state=current_state,
            changed_fields=list(previous_state.keys()),
        )


def _create_event(
    event_type: str,
    entity_type: str,
    entity_id: int,
    action: str,
    previous_state: dict,
    current_state: dict,
    changed_fields: list,
):
    """Create event record and trigger async processing."""
    from django_tenants.utils import schema_context

    # Get current user
    performed_by = get_current_user()

    # CRITICAL: Capture current tenant schema
    current_schema = connection.schema_name

    # Create event in database (using transaction.on_commit for safety)
    def create_event():
        event = Event.objects.create(
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            previous_state=previous_state,
            current_state=current_state,
            changed_fields=changed_fields,
            performed_by=performed_by,
            tenant_schema=current_schema,  # ADD: Capture schema for async processing
        )

        # Check if processing is paused (check public schema)
        with schema_context('public'):
            is_paused = EventProcessingControl.is_processing_paused()

        if not is_paused:
            process_event_async(event.id)
        else:
            logger.info(f"Event processing is paused. Event {event.id} queued for later processing.")

    # Use transaction.on_commit to ensure event is created after transaction commits
    transaction.on_commit(create_event)
