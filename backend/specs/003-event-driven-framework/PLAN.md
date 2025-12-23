# Event-Driven Framework - Final Implementation Plan

**Date**: 2025-12-16  
**Status**: Planning  
**Priority**: High

---

## Overview

Create a centralized, async event-driven framework that handles side effects when entities are created, updated, or deleted. The framework queues events in the database in the same request thread, then processes them asynchronously without blocking the request.

---

## Side Effects Flow

**All side effects are OPTIONAL and configured on requirement basis.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY CHANGE                                      │
│                    (Create, Update, Delete)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT CREATED                                      │
│                    (Always stored in DB, processed async)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Look up handlers in config   │
                    └───────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│ CLIENT ACTIVITY   │   │      TASK         │   │   NOTIFICATION    │
│   (OPTIONAL)      │   │   (OPTIONAL)      │   │    (OPTIONAL)     │
│                   │   │                   │   │                   │
│ Only if handler   │   │ Only if handler   │   │ Only if handler   │
│ configured        │   │ configured        │   │ configured        │
└───────────────────┘   └───────────────────┘   └───────────────────┘
            │                       │                       │
            ▼                       ▼                       │
    [If notify.enabled]     [If notify.enabled]            │
            │                       │                       │
            └───────────────────────┴───────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NOTIFICATION                                        │
│              (Central hub for real-time delivery)                           │
│                                                                              │
│   Types: TASK_ASSIGNED, LEAD_ASSIGNED, CLIENT_ASSIGNED,                     │
│          REMINDER_DUE, STAGE_CHANGED, etc.                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Automatic when notification created)
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SSE                                             │
│              (Real-time delivery to online users)                           │
└─────────────────────────────────────────────────────────────────────────────┘


REMINDER FLOW (Separate - Scheduled, not part of event system):
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REMINDER (Before due date)                                │
│                    (Processed by scheduled task)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            NOTIFICATION ──► SSE
```

---

## Key Principles

1. **All side effects are OPTIONAL** - nothing is automatic, everything is configured on requirement basis
2. **Notification is the gateway to SSE** - SSE is NOT a separate handler
3. **notification_create() automatically triggers SSE** (already implemented)
4. **Reminder uses scheduled task** - not part of event system (already exists)

### Side Effects Are Optional

| Side Effect | When Created |
|-------------|--------------|
| Client Activity | Only if `client_activity` handler configured for that event |
| Task | Only if `task` handler configured for that event |
| Notification | Only if `notification` handler configured OR `notify` block in activity handler |
| SSE | Automatically when notification is created (not configurable separately) |

---

## Core Design Principles

1. **Database Queue**: Events stored in DB in the same request thread
2. **Async Processing**: Process events asynchronously after queuing (non-blocking)
3. **Startup Recovery**: Process unprocessed events on server start
4. **Group Notifications**: Support sending to multiple users via Notification
5. **Configurable**: All handlers and rules are configurable
6. **Retry Logic**: 2 retries for failed events
7. **Pause/Resume**: Ability to pause event processing before server restart
8. **Event Cleanup**: Delete completed events after 1 week

---

## Architecture Components

### 1. Event Model (`immigration/events/models.py`)

```python
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class EventStatus:
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    
    CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]


class EventAction:
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'
    
    CHOICES = [
        (CREATE, 'Create'),
        (UPDATE, 'Update'),
        (DELETE, 'Delete'),
    ]


class Event(models.Model):
    """
    Event queue model for tracking entity changes and processing side effects.
    """
    
    # Event identification
    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text="e.g., 'Client.assigned_to.UPDATE', 'Task.CREATE'"
    )
    entity_type = models.CharField(
        max_length=50,
        db_index=True,
        help_text="e.g., 'Client', 'Task'"
    )
    entity_id = models.PositiveIntegerField()
    action = models.CharField(
        max_length=20,
        choices=EventAction.CHOICES,
    )
    
    # State tracking
    previous_state = models.JSONField(default=dict, blank=True)
    current_state = models.JSONField(default=dict, blank=True)
    changed_fields = models.JSONField(default=list, blank=True)
    
    # Processing state
    status = models.CharField(
        max_length=20,
        choices=EventStatus.CHOICES,
        default=EventStatus.PENDING,
        db_index=True
    )
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=2)
    error_message = models.TextField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Handler results
    handler_results = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_events',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'immigration_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['event_type', 'status']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]
    
    def __str__(self):
        return f"{self.event_type} [{self.status}] - {self.entity_type}:{self.entity_id}"
    
    def can_retry(self) -> bool:
        return self.retry_count < self.max_retries


class EventProcessingControl(models.Model):
    """
    Singleton model to control event processing state (pause/resume).
    """
    is_paused = models.BooleanField(default=False)
    paused_at = models.DateTimeField(null=True, blank=True)
    paused_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='paused_events'
    )
    pause_reason = models.CharField(max_length=255, null=True, blank=True)
    resumed_at = models.DateTimeField(null=True, blank=True)
    resumed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resumed_events'
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'immigration_event_processing_control'
    
    def save(self, *args, **kwargs):
        self.pk = 1  # Ensure singleton
        super().save(*args, **kwargs)
    
    @classmethod
    def get_instance(cls):
        instance, _ = cls.objects.get_or_create(pk=1)
        return instance
    
    @classmethod
    def is_processing_paused(cls) -> bool:
        return cls.get_instance().is_paused
```

---

### 2. Handler Types

Based on the flow, we have **3 handler types** (NOT 4 - SSE is part of Notification):

| Handler | Purpose | When Used | Triggers Notification? |
|---------|---------|-----------|----------------------|
| `ClientActivityHandler` | Create timeline entries | Only when configured | Optional (via `notify` block) |
| `TaskHandler` | Create tasks | Only when configured | Optional (via `notify` block) |
| `NotificationHandler` | Create notifications → SSE | Only when configured | IS the notification |

**All handlers are optional.** An event may have:
- No handlers (event logged but no side effects)
- Only activity handler (timeline entry, no notification)
- Only notification handler (notification only, no timeline)
- Only task handler (task only)
- Any combination of handlers

---

### 3. Configuration (`immigration/events/config.py`)

```python
"""
Event-driven framework configuration.

Handler execution order:
1. ClientActivityHandler - Creates timeline entry, optionally triggers notification
2. TaskHandler - Creates task, always triggers notification
3. NotificationHandler - Creates notification (directly), triggers SSE automatically
"""

from typing import Dict, List, Any


# =============================================================================
# EVENT HANDLERS CONFIGURATION
#
# ALL HANDLERS ARE OPTIONAL. Configure only what you need for each event.
# An event with empty list [] means: track the event, but no side effects.
# =============================================================================

EVENT_HANDLERS: Dict[str, List[Dict[str, Any]]] = {
    
    # =========================================================================
    # CLIENT EVENTS
    # =========================================================================
    
    # Example: Event tracked but NO side effects
    'Client.CREATE': [],  # No activity, no task, no notification
    
    # Example: Only timeline activity, no notification
    # 'Client.CREATE': [
    #     {
    #         'handler': 'client_activity',
    #         'enabled': True,
    #         'config': {
    #             'activity_type': 'CLIENT_CREATED',
    #             'description_template': 'Client {client_name} was created',
    #         },
    #     },
    # ],
    
    # Example: Activity + Notification (no task)
    'Client.assigned_to.UPDATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'ASSIGNED',
                'description_template': 'Client assigned to {assigned_to_name}',
            },
            'notify': {
                'enabled': True,
                'type': 'CLIENT_ASSIGNED',  # NotificationType → SSE
                'title_template': 'Client Assigned: {client_name}',
                'message_template': 'Client "{client_name}" has been assigned to you.',
                'recipients': [
                    {'field': 'assigned_to'},  # New assigned user
                ],
            },
        },
        # NOTE: Task handler NOT included - no task created for assignment
        # Add task handler below only if task creation is required:
        # {
        #     'handler': 'task',
        #     'enabled': True,
        #     'condition': {'type': 'field_was_null', 'field': 'assigned_to'},
        #     'config': {
        #         'title_template': 'Welcome new client: {client_name}',
        #         'due_date_days': 1,
        #         'priority': 'MEDIUM',
        #         'assigned_to_field': 'assigned_to',
        #     },
        # },
    ],
    
    'Client.stage.UPDATE': [
        # Timeline activity + group notification
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'STAGE_CHANGED',
                'description_template': 'Stage changed from {old_stage} to {new_stage}',
            },
            'notify': {
                'enabled': True,
                'type': 'CLIENT_STAGE_CHANGED',
                'title_template': 'Client Stage Changed: {client_name}',
                'message_template': 'Client "{client_name}" stage changed to {new_stage}.',
                'recipients': [
                    {'field': 'assigned_to'},
                    {'role': 'BRANCH_ADMIN', 'scope': 'branch'},
                ],
            },
        },
    ],
    
    'Client.DELETE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'CLIENT_DELETED',
                'description_template': 'Client {client_name} was archived',
            },
        },
    ],
    
    # =========================================================================
    # TASK EVENTS
    # =========================================================================
    
    # Task creation - activity only if linked to client
    'Task.CREATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'condition': {'type': 'has_linked_client'},
            'config': {
                'activity_type': 'TASK_CREATED',
                'description_template': 'Task "{task_title}" created',
            },
            # notify block optional - add if notification needed
        },
    ],
    
    # Example: Notification only (no timeline activity, no task)
    'Task.assigned_to.UPDATE': [
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
                'type': 'TASK_ASSIGNED',
                'title_template': 'Task Reassigned: {task_title}',
                'message_template': 'Task "{task_title}" has been assigned to you.',
                'recipients': [
                    {'field': 'assigned_to'},
                ],
            },
        },
    ],
    
    # Example: Event tracked but no side effects
    'Task.status.UPDATE': [],  # No activity, no notification
    
    # =========================================================================
    # NOTE EVENTS - All optional, configure as needed
    # =========================================================================
    
    # Example: Activity only (no notification)
    'Note.CREATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'NOTE_ADDED',
                'description_template': '{author_name} added a note',
            },
        },
    ],
    
    'Note.UPDATE': [],  # No side effects for note edit
    'Note.DELETE': [],  # No side effects for note delete
    
    # =========================================================================
    # VISA APPLICATION EVENTS - All optional
    # =========================================================================
    
    'VisaApplication.CREATE': [],  # Configure if needed
    'VisaApplication.status.UPDATE': [],  # Configure if needed
    
    # =========================================================================
    # COLLEGE APPLICATION EVENTS - All optional
    # =========================================================================
    
    'Application.CREATE': [],  # Configure if needed
}


# =============================================================================
# EXAMPLE: Full configuration with all options
# =============================================================================
#
# 'VisaApplication.status.UPDATE': [
#     {
#         'handler': 'client_activity',
#         'enabled': True,
#         'config': {
#             'activity_type': 'VISA_STATUS_CHANGED',
#             'description_template': 'Visa status changed to {new_status}',
#         },
#         'notify': {
#             'enabled': True,
#             'type': 'VISA_STATUS_CHANGED',
#             'title_template': 'Visa Status Update',
#             'message_template': 'Status changed to {new_status}.',
#             'recipients': [{'field': 'assigned_to'}],
#         },
#     },
# ],
#


# =============================================================================
# TRACKED ENTITIES
# =============================================================================

TRACKED_ENTITIES = [
    {
        'model': 'immigration.Client',
        'track_fields': ['assigned_to', 'stage', 'active'],
    },
    {
        'model': 'immigration.Task',
        'track_fields': ['assigned_to', 'status'],
    },
    {
        'model': 'immigration.Note',
        'track_fields': [],
    },
    {
        'model': 'immigration.VisaApplication',
        'track_fields': ['status', 'assigned_to'],
    },
    {
        'model': 'immigration.Application',
        'track_fields': ['status'],
    },
    {
        'model': 'immigration.ProfilePicture',
        'track_fields': [],
    },
]


# =============================================================================
# NOTIFICATION TYPES (for reference - defined in constants.py)
# =============================================================================
# These are the SSE event types that users receive:
#
# TASK_ASSIGNED - When a task is assigned/reassigned
# LEAD_ASSIGNED - When a lead is assigned
# CLIENT_ASSIGNED - When a client is assigned
# CLIENT_STAGE_CHANGED - When client stage changes
# VISA_STATUS_CHANGED - When visa application status changes
# REMINDER_DUE - When a reminder is due (from scheduled task)
# SYSTEM_ALERT - System notifications
#
# =============================================================================


# =============================================================================
# ADMIN ALERT CONFIGURATION
# =============================================================================

ADMIN_ALERT_CONFIG = {
    'enabled': False,
    'alert_on_retry_exhausted': True,
    'methods': ['notification'],  # 'notification', 'email', or both
    'admin_user_ids': [],
    'admin_emails': [],
}


# =============================================================================
# EVENT CLEANUP CONFIGURATION
# =============================================================================

EVENT_CLEANUP_CONFIG = {
    'enabled': True,
    'retention_days': 7,
    'batch_size': 1000,
}


# =============================================================================
# PROCESSING CONFIGURATION
# =============================================================================

PROCESSING_CONFIG = {
    'async_enabled': True,
    'max_retries': 2,
    'batch_size_on_startup': 100,
}
```

---

### 4. Handler Structure

#### 4.1 Base Handler (`immigration/events/handlers/base.py`)

```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum


class HandlerStatus(Enum):
    SUCCESS = 'SUCCESS'
    FAILED = 'FAILED'
    SKIPPED = 'SKIPPED'


@dataclass
class HandlerResult:
    handler_name: str
    status: HandlerStatus
    message: str = ''
    data: Optional[dict] = None
    error: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'handler_name': self.handler_name,
            'status': self.status.value,
            'message': self.message,
            'error': self.error,
        }


def get_template_context(event, config: dict) -> Dict[str, Any]:
    """Build template context from event data."""
    context = {
        **event.current_state,
        **{f'old_{k}': v for k, v in event.previous_state.items()},
        **{f'new_{k}': v for k, v in event.current_state.items()},
        'entity_type': event.entity_type,
        'entity_id': event.entity_id,
    }
    
    # Add computed fields
    if event.entity_type == 'Client':
        first = event.current_state.get('first_name', '')
        last = event.current_state.get('last_name', '')
        context['client_name'] = f"{first} {last}".strip()
        context['client_id'] = event.entity_id
    
    if event.entity_type == 'Task':
        context['task_title'] = event.current_state.get('title', '')
        context['task_id'] = event.entity_id
    
    if event.performed_by:
        context['performed_by_name'] = (
            event.performed_by.get_full_name() or 
            event.performed_by.username
        )
    
    return context


def render_template(template: str, context: dict) -> str:
    """Render template string with context."""
    try:
        return template.format(**context)
    except KeyError:
        return template
```

#### 4.2 Client Activity Handler (`immigration/events/handlers/client_activity_handler.py`)

```python
"""
Client Activity Handler

Creates timeline entries for client-related events.
Optionally triggers notifications based on config.
"""

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
    
    activity = ClientActivity.objects.create(
        client=client,
        activity_type=activity_type,
        performed_by=event.performed_by,
        description=description,
        metadata={
            'event_id': event.id,
            'changed_fields': event.changed_fields,
            **event.current_state,
        }
    )
    
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
    
    # For other entities, check for client FK
    client_id = event.current_state.get('client')
    if client_id:
        try:
            return Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return None
    
    return None


def create_notification_from_config(event: Event, notify_config: dict, context: dict):
    """
    Create notification based on config.
    This automatically triggers SSE via notification_create().
    """
    from immigration.services.notifications import notification_create
    from immigration.events.handlers.notification_handler import resolve_recipients
    
    notification_type = notify_config.get('type', 'SYSTEM_ALERT')
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
```

#### 4.3 Notification Handler (`immigration/events/handlers/notification_handler.py`)

```python
"""
Notification Handler

Creates notifications directly (without ClientActivity).
Used when only notification is needed, not timeline entry.

Note: notification_create() automatically triggers SSE.
"""

from typing import List
from django.contrib.auth import get_user_model

from immigration.events.models import Event
from immigration.events.handlers.base import (
    HandlerResult, HandlerStatus, get_template_context, render_template
)
from immigration.services.notifications import notification_create

User = get_user_model()


def handle(event: Event, handler_config: dict) -> HandlerResult:
    """
    Create notification(s) directly.
    Automatically triggers SSE via notification_create().
    """
    config = handler_config.get('config', {})
    context = get_template_context(event, config)
    
    notification_type = config.get('type', 'SYSTEM_ALERT')
    title = render_template(config.get('title_template', 'Notification'), context)
    message = render_template(config.get('message_template', ''), context)
    
    recipients = resolve_recipients(event, config.get('recipients', []))
    
    if not recipients:
        return HandlerResult(
            handler_name='notification',
            status=HandlerStatus.SKIPPED,
            message='No recipients found'
        )
    
    created_count = 0
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
        created_count += 1
    
    return HandlerResult(
        handler_name='notification',
        status=HandlerStatus.SUCCESS,
        message=f'Created {created_count} notification(s)',
        data={'count': created_count}
    )


def resolve_recipients(event: Event, recipients_config: List[dict]) -> List[User]:
    """
    Resolve recipient users from config.
    
    Supports:
    - {'field': 'assigned_to'} - Get user from entity field
    - {'field': 'client.assigned_to'} - Get user from related entity
    - {'role': 'BRANCH_ADMIN', 'scope': 'branch'} - Get users by role
    - {'user_ids': [1, 2, 3]} - Specific user IDs
    """
    users = []
    seen_ids = set()
    
    for recipient in recipients_config:
        resolved = []
        
        if 'field' in recipient:
            resolved = resolve_field_recipient(event, recipient['field'])
        elif 'role' in recipient:
            resolved = resolve_role_recipients(event, recipient)
        elif 'user_ids' in recipient:
            resolved = list(User.objects.filter(id__in=recipient['user_ids']))
        
        for user in resolved:
            if user and user.id not in seen_ids:
                users.append(user)
                seen_ids.add(user.id)
    
    return users


def resolve_field_recipient(event: Event, field_path: str) -> List[User]:
    """Resolve user from entity field."""
    parts = field_path.split('.')
    
    if len(parts) == 1:
        # Direct field on entity
        user_id = event.current_state.get(field_path)
        if user_id:
            try:
                return [User.objects.get(id=user_id)]
            except User.DoesNotExist:
                pass
    elif len(parts) == 2:
        # Related entity field (e.g., 'client.assigned_to')
        related_type, related_field = parts
        # Get related entity ID from current state
        related_id = event.current_state.get(related_type)
        if related_id:
            # Fetch related entity and get field
            # This is simplified - in practice, need to handle each related type
            from django.apps import apps
            try:
                Model = apps.get_model('immigration', related_type.capitalize())
                related = Model.objects.get(id=related_id)
                user = getattr(related, related_field, None)
                if user:
                    return [user]
            except Exception:
                pass
    
    return []


def resolve_role_recipients(event: Event, config: dict) -> List[User]:
    """Resolve users by role within scope."""
    role = config.get('role')
    scope = config.get('scope', 'tenant')
    
    # Get the entity to determine scope
    from django.contrib.auth.models import Group
    
    try:
        group = Group.objects.get(name=role)
    except Group.DoesNotExist:
        return []
    
    users = User.objects.filter(groups=group)
    
    # Apply scope filtering
    if scope == 'branch':
        # Filter to same branch as entity
        branch_id = event.current_state.get('branch')
        if branch_id:
            users = users.filter(branch_id=branch_id)
    elif scope == 'region':
        # Filter to same region
        # Implementation depends on your model structure
        pass
    
    return list(users)
```

#### 4.4 Task Handler (`immigration/events/handlers/task_handler.py`)

```python
"""
Task Handler

Creates tasks based on event configuration.
Task creation does NOT automatically trigger notification - 
notification must be explicitly configured via 'notify' block.
"""

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model

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
    
    Notification is OPTIONAL - only sent if 'notify' block is configured.
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
    
    # Create task directly (no automatic notification)
    task = Task.objects.create(
        title=title,
        detail=detail,
        assigned_to=assigned_to,
        due_date=due_date,
        priority=priority,
        created_by=event.performed_by,
        assigned_by=event.performed_by,
        # Link to client if available
        content_type=get_content_type(event),
        object_id=get_client_id(event),
    )
    
    # Notification is handled separately if 'notify' block is configured
    notify_config = handler_config.get('notify', {})
    if notify_config.get('enabled'):
        context['task_id'] = task.id
        context['task_title'] = task.title
        create_notification_from_config(event, notify_config, context)
    
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


def get_client_id(event: Event) -> int:
    """Get client ID for linking task."""
    if event.entity_type == 'Client':
        return event.entity_id
    return event.current_state.get('client')
```

---

### 5. Processing Flow

```
1. Model Change (e.g., Client.assigned_to updated)
   │
   ▼
2. Pre-save Signal: Capture previous_state
   │
   ▼
3. Model Saved
   │
   ▼
4. Post-save Signal (via transaction.on_commit):
   │
   ├─► Create Event record (status=PENDING)
   │
   └─► Trigger async processing (if not paused)
       │
       ▼
5. Async Processing (in thread):
   │
   ├─► Update status to PROCESSING
   │
   ├─► Look up handlers for event_type in EVENT_HANDLERS config
   │
   ├─► If no handlers configured: mark COMPLETED (event logged only)
   │
   ├─► Execute ONLY configured handlers:
   │   │
   │   ├─► client_activity (IF configured): Create timeline entry
   │   │   └─► If notify.enabled: notification_create() → SSE
   │   │
   │   ├─► task (IF configured): Create task
   │   │   └─► If notify.enabled: notification_create() → SSE
   │   │
   │   └─► notification (IF configured): Direct notification
   │       └─► notification_create() → SSE
   │
   └─► Update status to COMPLETED or FAILED
```

**Note**: All handlers are optional. Event may have 0, 1, 2, or all 3 handlers.

---

### 6. File Structure

```
immigration/events/
├── __init__.py
├── apps.py                      # AppConfig with startup hook
├── models.py                    # Event, EventProcessingControl
├── config.py                    # Unified configuration
├── conditions.py                # Condition evaluator
├── state_tracker.py             # Model state serialization
├── dispatcher.py                # Signal handlers & event creation
├── processor.py                 # Event processing logic
├── control.py                   # Pause/resume functions
├── cleanup.py                   # Event cleanup
├── handlers/
│   ├── __init__.py
│   ├── base.py                  # HandlerResult, utilities
│   ├── client_activity_handler.py
│   ├── notification_handler.py
│   └── task_handler.py
├── management/
│   └── commands/
│       ├── events_pause.py
│       ├── events_resume.py
│       ├── events_status.py
│       └── events_cleanup.py
└── migrations/
    └── 0001_initial.py
```

---

### 7. SSE Flow (Already Implemented)

The `notification_create()` service already handles SSE:

```python
# immigration/services/notifications.py (existing)

def notification_create(...) -> Notification:
    # ... create notification ...
    
    # Send via SSE channel layer (already implemented)
    notification_data = {
        'id': notification.id,
        'notification_type': notification.notification_type,
        'title': notification.title,
        'message': notification.message,
        # ...
    }
    send_notification_to_user(assigned_to.id, notification_data)
    
    return notification
```

**No separate SSE handler needed** - SSE is automatic when notification is created.

---

### 8. Reminder Flow (Separate from Event System)

Reminders are processed by a **scheduled task**, not the event system:

```
Scheduled Task (runs every minute/hour)
│
├─► Query reminders where due_date <= now AND notification_created = False
│
├─► For each due reminder:
│   │
│   └─► notification_create(type=REMINDER_DUE, ...) → SSE
│
└─► Mark reminder.notification_created = True
```

This is already implemented in `process_reminders` management command.

---

### 9. Implementation Phases

#### Phase 1: Core Framework
- [ ] Create Event, EventProcessingControl models + migration
- [ ] Create state_tracker.py
- [ ] Create conditions.py
- [ ] Create dispatcher.py
- [ ] Create processor.py
- [ ] Create handlers/base.py

#### Phase 2: Handlers
- [ ] Create client_activity_handler.py
- [ ] Create notification_handler.py (with recipient resolution)
- [ ] Create task_handler.py

#### Phase 3: Configuration
- [ ] Create config.py
- [ ] Create apps.py with signal registration
- [ ] Test handler execution

#### Phase 4: Management Tools
- [ ] Create pause/resume commands
- [ ] Create cleanup command
- [ ] Create control.py API

#### Phase 5: Replace Existing Signals
- [ ] Remove signals from signals/listener.py
- [ ] Test all flows end-to-end

#### Phase 6: Testing
- [ ] Unit tests for handlers
- [ ] Integration tests
- [ ] Performance testing

---

### 10. Summary

| Component | Purpose | Optional? |
|-----------|---------|-----------|
| **Event** | Queue entity changes for async processing | No (always created) |
| **ClientActivityHandler** | Create timeline entries | Yes - only if configured |
| **TaskHandler** | Create tasks | Yes - only if configured |
| **NotificationHandler** | Direct notifications (no timeline) | Yes - only if configured |
| **notification_create()** | Creates notification → triggers SSE (existing) | N/A (service) |
| **Reminder scheduled task** | Process due reminders → notification → SSE (existing) | N/A (separate system) |

**Key Principles**:
1. **All side effects are optional** - configure only what you need per event
2. **Empty handler list = event logged, no side effects**
3. **SSE is NOT a separate handler** - automatically triggered by `notification_create()`
4. **All paths to real-time delivery go through Notification**
