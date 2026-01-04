"""
Task Handler

Creates tasks based on event configuration.
Notifications are handled separately via the notification handler.
"""

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from immigration.events.models import Event
from immigration.events.handlers.base import (
    HandlerResult, HandlerStatus, get_template_context, render_template
)
from immigration.models import Task
from immigration.constants import TaskPriority

User = get_user_model()


def handle(event: Event, handler_config: dict) -> HandlerResult:
    """
    Create a task.
    
    Notifications are handled separately via the notification handler.
    """
    config = handler_config.get('config', {})
    context = get_template_context(event, config)
    
    # Get assigned user
    assigned_to = resolve_assigned_user(event, config)
    if not assigned_to:
        return HandlerResult(
            handler_name='task',
            status=HandlerStatus.SKIPPED,
            message='No assigned user for task'
        )
    
    # Build task details
    title = render_template(config.get('title_template', 'Auto-created task'), context)
    detail = render_template(config.get('detail_template', ''), context)
    
    # Calculate due date
    due_date_days = config.get('due_date_days', 1)
    due_date = timezone.now() + timedelta(days=due_date_days)
    
    # Priority
    priority = config.get('priority', TaskPriority.MEDIUM.value)
    
    # Get content type and object_id for linking
    content_type, object_id = get_content_type_and_id(event)
    
    # Create task directly (notifications handled separately via notification handler)
    task = Task.objects.create(
        title=title,
        detail=detail,
        assigned_to=assigned_to,
        due_date=due_date,
        priority=priority,
        created_by=event.performed_by,
        assigned_by=event.performed_by,
        content_type=content_type,
        object_id=object_id,
    )
    
    return HandlerResult(
        handler_name='task',
        status=HandlerStatus.SUCCESS,
        message=f'Created task: {title}',
        data={'task_id': task.id}
    )


def resolve_assigned_user(event: Event, config: dict) -> User:
    """Resolve user to assign task to."""
    assigned_to_field = config.get('assigned_to_field', 'assigned_to')
    
    if assigned_to_field == 'performed_by':
        return event.performed_by
    
    user_id = event.current_state.get(assigned_to_field)
    if user_id:
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass
    
    return None


def get_content_type_and_id(event: Event):
    """Get content type and object_id for linking task to entity."""
    # If entity is Client, link to Client
    if event.entity_type == 'Client':
        try:
            client_ct = ContentType.objects.get(app_label='immigration', model='client')
            return client_ct, event.entity_id
        except ContentType.DoesNotExist:
            pass
    
    # Check for generic FK in current state
    if event.current_state.get('content_type_id') and event.current_state.get('object_id'):
        try:
            content_type = ContentType.objects.get(id=event.current_state.get('content_type_id'))
            return content_type, event.current_state.get('object_id')
        except ContentType.DoesNotExist:
            pass
    
    # Check for client FK
    client_id = event.current_state.get('client')
    if client_id:
        try:
            client_ct = ContentType.objects.get(app_label='immigration', model='client')
            return client_ct, client_id
        except ContentType.DoesNotExist:
            pass
    
    return None, None
