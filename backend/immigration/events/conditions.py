"""
Condition evaluator for handler conditions.
"""

from typing import Any, Dict
from immigration.events.models import Event


class ConditionType:
    """Condition types for handler evaluation."""
    FIELD_WAS_NULL = 'field_was_null'
    FIELD_CHANGED = 'field_changed'
    HAS_LINKED_CLIENT = 'has_linked_client'
    FIELD_EQUALS = 'field_equals'
    FIELD_IN = 'field_in'
    CUSTOM = 'custom'


def evaluate_condition(event: Event, condition: Dict[str, Any]) -> bool:
    """
    Evaluate a condition against an event.
    
    Supported conditions:
    - {'type': 'field_was_null', 'field': 'assigned_to'} - Field was null in previous state
    - {'type': 'field_changed', 'field': 'status'} - Field changed
    - {'type': 'has_linked_client'} - Entity has linked client
    - {'type': 'field_equals', 'field': 'status', 'value': 'COMPLETED'} - Field equals value
    - {'type': 'field_in', 'field': 'status', 'values': ['PENDING', 'IN_PROGRESS']} - Field in list
    """
    if not condition:
        return True
    
    condition_type = condition.get('type')
    
    if condition_type == ConditionType.FIELD_WAS_NULL:
        field = condition.get('field')
        if not field:
            return False
        previous_value = event.previous_state.get(field)
        return previous_value is None or previous_value == ''
    
    elif condition_type == ConditionType.FIELD_CHANGED:
        field = condition.get('field')
        if not field:
            return False
        return field in event.changed_fields
    
    elif condition_type == ConditionType.HAS_LINKED_CLIENT:
        # Check if entity is a Client
        if event.entity_type == 'Client':
            return True
        
        # Check if entity has client FK
        client_id = event.current_state.get('client')
        if client_id:
            return True
        
        # Check for generic FK to Client
        if event.current_state.get('content_type_id') and event.current_state.get('object_id'):
            from django.contrib.contenttypes.models import ContentType
            try:
                client_ct = ContentType.objects.get(app_label='immigration', model='client')
                if event.current_state.get('content_type_id') == client_ct.id:
                    return True
            except ContentType.DoesNotExist:
                pass
        
        return False
    
    elif condition_type == ConditionType.FIELD_EQUALS:
        field = condition.get('field')
        value = condition.get('value')
        if not field:
            return False
        return event.current_state.get(field) == value
    
    elif condition_type == ConditionType.FIELD_IN:
        field = condition.get('field')
        values = condition.get('values', [])
        if not field:
            return False
        return event.current_state.get(field) in values
    
    elif condition_type == ConditionType.CUSTOM:
        # Custom function - not implemented for security
        # In production, this could call a registered function
        return False
    
    # Unknown condition type - default to False for safety
    return False
