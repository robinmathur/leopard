"""
Event-driven framework configuration.

Handler execution order:
1. ClientActivityHandler - Creates timeline entry only
2. TaskHandler - Creates task only
3. NotificationHandler - Creates notification (directly), triggers SSE automatically

All handlers run in parallel. Notifications are handled separately via the notification handler.
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
    
    # Example: Activity + Notification (no task)
    'Client.assigned_to.UPDATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'ASSIGNED',
                'description_template': 'Client assigned to {assigned_to_name}',
            },
        },
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
                'type': 'CLIENT_ASSIGNED',
                'title_template': 'Client Assigned: {client_name}',
                'message_template': 'Client "{client_name}" has been assigned to you.',
                'recipients': [
                    {'field': 'assigned_to'},  # New assigned user
                ],
            },
        },
    ],
    
    'Client.stage.UPDATE': [
        # Timeline activity + group notification
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'STAGE_CHANGED',
                'description_template': 'Client converted to {new_stage} from {old_stage}',
            },
        },
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
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
                'description_template': 'Note added',
            },
        },
    ],
    
    'Note.UPDATE': [],  # No side effects for note edit
    'Note.DELETE': [],  # No side effects for note delete
    
    # =========================================================================
    # VISA APPLICATION EVENTS - All optional
    # =========================================================================

    'VisaApplication.CREATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'VISA_APPLICATION_CREATED',
                'description_template': 'Visa Application created for {visa_type_name}',
            },
        },
    ],
    'VisaApplication.status.UPDATE': [],  # Configure if needed
    'VisaApplication.assigned_to.UPDATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'ASSIGNED',
                'description_template': 'Visa Application assigned to {assigned_to_name}',
            },
        },
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
                'type': 'VISA_APPLICATION_ASSIGNED',
                'title_template': 'Visa Application Assigned: {client_name}',
                'message_template': 'A visa application for {client_name} ({visa_type_name}) has been assigned to you.',
                'recipients': [
                    {'field': 'assigned_to'},  # New assigned user
                ],
            },
        },
    ],
    
    # =========================================================================
    # COLLEGE APPLICATION EVENTS - All optional
    # =========================================================================

    'CollegeApplication.CREATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'COLLEGE_APPLICATION_CREATED',
                'description_template': 'College Application created for {institute_name} - {course_name}',
            },
        },
    ],
    'CollegeApplication.assigned_to.UPDATE': [
        {
            'handler': 'client_activity',
            'enabled': True,
            'config': {
                'activity_type': 'ASSIGNED',
                'description_template': 'College Application assigned to {assigned_to_name}',
            },
        },
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
                'type': 'APPLICATION_ASSIGNED',
                'title_template': 'Application Assigned: {client_name}',
                'message_template': 'A {application_type_name} application for {client_name} has been assigned to you.',
                'recipients': [
                    {'field': 'assigned_to'},  # New assigned user
                ],
            },
        },
    ],
}


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
        'model': 'immigration.CollegeApplication',
        'track_fields': ['status', 'assigned_to'],
    },
]


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
