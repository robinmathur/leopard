"""
Base handler utilities and result types.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any
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
            'data': self.data,
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
        context['client_name'] = f"{first} {last}".strip() or f"Client {event.entity_id}"
        context['client_id'] = event.entity_id
    
    if event.entity_type == 'Task':
        context['task_title'] = event.current_state.get('title', '')
        context['task_id'] = event.entity_id
    
    if event.entity_type == 'VisaApplication':
        context['visa_application_id'] = event.entity_id
        # Try to get visa type name
        try:
            from immigration.models import VisaApplication
            visa_app = VisaApplication.objects.get(id=event.entity_id)
            if visa_app.visa_type:
                context['visa_type_name'] = str(visa_app.visa_type)
            if visa_app.client:
                context['client_id'] = visa_app.client.id
                context['client_name'] = visa_app.client.full_name or f"Client {visa_app.client.id}"
        except Exception:
            pass
    
    if event.entity_type == 'CollegeApplication':
        context['application_id'] = event.entity_id
        # Try to get application details
        try:
            from immigration.models import CollegeApplication
            application = CollegeApplication.objects.get(id=event.entity_id)
            if application.client:
                context['client_id'] = application.client.id
                context['client_name'] = application.client.full_name or f"Client {application.client.id}"
            if application.application_type:
                context['application_type_name'] = str(application.application_type)
            if application.institute:
                context['institute_name'] = str(application.institute)
        except Exception:
            pass
    
    if event.performed_by:
        context['performed_by_name'] = (
            event.performed_by.get_full_name() or 
            event.performed_by.username
        )
    
    # Add assigned_to_name if assigned_to exists
    assigned_to_id = event.current_state.get('assigned_to')
    if assigned_to_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            assigned_user = User.objects.get(id=assigned_to_id)
            context['assigned_to_name'] = (
                assigned_user.get_full_name() or 
                assigned_user.username
            )
        except User.DoesNotExist:
            context['assigned_to_name'] = 'Unknown User'
    
    # Add old/new values for changed fields
    for field in event.changed_fields:
        old_key = f'old_{field}'
        new_key = f'new_{field}'
        if old_key not in context and field in event.previous_state:
            context[old_key] = event.previous_state[field]
        if new_key not in context and field in event.current_state:
            context[new_key] = event.current_state[field]
    
    return context


def render_template(template: str, context: dict) -> str:
    """Render template string with context."""
    try:
        return template.format(**context)
    except KeyError as e:
        # Return template with missing key noted
        return f"{template} [Missing: {e}]"
