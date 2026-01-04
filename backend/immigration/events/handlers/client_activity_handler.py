"""
Client Activity Handler

Creates timeline entries for client-related events.
Optionally triggers notifications based on config.
"""

from typing import Optional
from immigration.events.models import Event
from immigration.events.handlers.base import (
    HandlerResult, HandlerStatus, get_template_context, render_template
)
from immigration.models import ClientActivity, Client


def handle(event: Event, handler_config: dict) -> HandlerResult:
    """
    Create a ClientActivity (timeline entry).
    
    Also triggers notification if 'notify' config is present and enabled.
    """
    config = handler_config.get('config', {})
    
    # Get linked client
    client = get_linked_client(event)
    if not client:
        return HandlerResult(
            handler_name='client_activity',
            status=HandlerStatus.SKIPPED,
            message='No linked client found'
        )
    
    # Build context
    context = get_template_context(event, config)
    
    # Create activity
    activity_type = config.get('activity_type', 'GENERIC')
    description = render_template(
        config.get('description_template', '{entity_type} changed'),
        context
    )
    
    # Build metadata with user IDs for clickable links in frontend
    metadata = {
        'event_id': event.id,
        'changed_fields': event.changed_fields,
        **event.current_state,
    }
    
    # Add user IDs for clickable links (frontend can render as /users/{user_id})
    if event.current_state.get('assigned_to'):
        metadata['assigned_to_id'] = event.current_state.get('assigned_to')
    if event.performed_by:
        metadata['performed_by_id'] = event.performed_by.id
    
    # Add entity information for context
    if event.entity_type == 'VisaApplication':
        metadata['visa_application_id'] = event.entity_id
        # Get visa type name if available
        try:
            from immigration.models import VisaApplication
            visa_app = VisaApplication.objects.get(id=event.entity_id)
            if visa_app.visa_type:
                metadata['visa_type_name'] = str(visa_app.visa_type)
        except Exception:
            pass
    
    # Use event.created_at to preserve the original event time
    # This ensures the activity timestamp reflects when the action occurred,
    # not when the event was processed asynchronously
    activity = ClientActivity.objects.create(
        client=client,
        activity_type=activity_type,
        performed_by=event.performed_by,
        description=description,
        metadata=metadata,
    )
    # Override created_at with event's created_at to preserve original time
    # Use update() to bypass the save() override that prevents updates
    ClientActivity.objects.filter(id=activity.id).update(created_at=event.created_at)
    # Refresh from DB to get updated created_at
    activity.refresh_from_db()
    
    # Check if notification is configured
    notify_config = handler_config.get('notify', {})
    if notify_config.get('enabled'):
        create_notification_from_config(event, notify_config, context)
    
    return HandlerResult(
        handler_name='client_activity',
        status=HandlerStatus.SUCCESS,
        message=f'Created activity: {activity_type}',
        data={'activity_id': activity.id}
    )


def get_linked_client(event: Event) -> Optional[Client]:
    """Get the client linked to this event."""
    if event.entity_type == 'Client':
        try:
            return Client.objects.get(id=event.entity_id)
        except Client.DoesNotExist:
            return None
    
    # For VisaApplication, get client directly from the model
    if event.entity_type == 'VisaApplication':
        try:
            from immigration.models import VisaApplication
            visa_app = VisaApplication.objects.get(id=event.entity_id)
            return visa_app.client
        except (VisaApplication.DoesNotExist, AttributeError):
            pass
    
    # For Application (CollegeApplication), get client directly from the model
    if event.entity_type == 'CollegeApplication':
        try:
            from immigration.models import CollegeApplication
            application = CollegeApplication.objects.get(id=event.entity_id)
            return application.client
        except (CollegeApplication.DoesNotExist, AttributeError):
            pass
    
    # For other entities, check for client FK in current_state
    client_id = event.current_state.get('client')
    if client_id:
        try:
            return Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return None
    
    # Check for generic FK to Client
    if event.current_state.get('content_type_id') and event.current_state.get('object_id'):
        from django.contrib.contenttypes.models import ContentType
        try:
            client_ct = ContentType.objects.get(app_label='immigration', model='client')
            if event.current_state.get('content_type_id') == client_ct.id:
                client_id = event.current_state.get('object_id')
                try:
                    return Client.objects.get(id=client_id)
                except Client.DoesNotExist:
                    return None
        except ContentType.DoesNotExist:
            pass
    
    return None
def create_notification_from_config(event: Event, notify_config: dict, context: dict):
    """
    Create notification based on config.
    This automatically triggers SSE via notification_create().
    """
    from immigration.services.notifications import notification_create
    from immigration.events.handlers.notification_handler import resolve_recipients
    
    from immigration.constants import NotificationType
    notification_type = notify_config.get('type', NotificationType.SYSTEM_ALERT.value)
    title = render_template(notify_config.get('title_template', 'Notification'), context)
    message = render_template(notify_config.get('message_template', ''), context)
    
    recipients = resolve_recipients(event, notify_config.get('recipients', []))
    
    for user in recipients:
        notification_create(
            notification_type=notification_type,
            assigned_to=user,
            title=title,
            message=message,
            meta_info={
                'event_id': event.id,
                'entity_type': event.entity_type,
                'entity_id': event.entity_id,
            },
            created_by=event.performed_by,
        )


