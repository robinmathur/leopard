"""
State tracking utilities for capturing model state before/after changes.
"""

import json
from typing import Dict, Any, Optional, List
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

# Try to import special field types for handling
try:
    from django_countries.fields import CountryField
    HAS_COUNTRY_FIELD = True
except ImportError:
    HAS_COUNTRY_FIELD = False
    CountryField = None

try:
    from djmoney.models.fields import MoneyField
    HAS_MONEY_FIELD = True
except ImportError:
    HAS_MONEY_FIELD = False
    MoneyField = None


def serialize_model_instance(instance: models.Model) -> Dict[str, Any]:
    """
    Serialize a model instance to a dictionary.
    
    Handles:
    - Foreign keys (stores ID)
    - Many-to-many (stores list of IDs)
    - JSON fields (keeps as-is)
    - Date/time fields (ISO format)
    - Regular fields
    """
    data = {}
    
    for field in instance._meta.get_fields():
        field_name = field.name
        
        # Skip auto fields and internal fields
        if field_name in ['id', 'created_at', 'updated_at', 'deleted_at']:
            continue
        
        # Skip reverse relations
        if field.one_to_many or field.many_to_many:
            continue
        
        try:
            value = getattr(instance, field_name, None)
            
            # Handle ForeignKey
            if isinstance(field, models.ForeignKey):
                data[field_name] = value.id if value else None
            # Handle ManyToManyField
            elif isinstance(field, models.ManyToManyField):
                data[field_name] = list(value.values_list('id', flat=True)) if value.exists() else []
            # Handle GenericForeignKey (via content_type/object_id)
            elif isinstance(field, GenericForeignKey):
                if hasattr(instance, 'content_type') and hasattr(instance, 'object_id'):
                    if instance.content_type and instance.object_id:
                        data['content_type_id'] = instance.content_type.id
                        data['object_id'] = instance.object_id
                continue
            # Handle JSONField
            elif isinstance(field, models.JSONField):
                data[field_name] = value if value is not None else {}
            # Handle DateTimeField/DateField
            elif isinstance(field, (models.DateTimeField, models.DateField)):
                data[field_name] = value.isoformat() if value else None
            # Handle BooleanField
            elif isinstance(field, models.BooleanField):
                data[field_name] = bool(value) if value is not None else None
            # Handle CountryField (from django_countries)
            elif HAS_COUNTRY_FIELD and isinstance(field, CountryField):
                # Convert Country object to string (country code)
                data[field_name] = str(value) if value else None
            # Handle MoneyField (from djmoney)
            elif HAS_MONEY_FIELD and isinstance(field, MoneyField):
                # Convert Money object to dict with amount and currency
                if value:
                    data[field_name] = {
                        'amount': str(value.amount),
                        'currency': str(value.currency),
                    }
                else:
                    data[field_name] = None
            # Handle regular fields (CharField, TextField, IntegerField, etc.)
            else:
                # Check if value is a Country object (fallback for CountryField detection)
                if value is not None and hasattr(value, 'code') and not isinstance(value, str):
                    # Likely a Country object - convert to string
                    data[field_name] = str(value)
                # Check if value is a Money object (fallback for MoneyField detection)
                elif value is not None and hasattr(value, 'amount') and hasattr(value, 'currency'):
                    # Likely a Money object - convert to dict
                    data[field_name] = {
                        'amount': str(value.amount),
                        'currency': str(value.currency),
                    }
                else:
                    # Store the value as-is (handles CharField, TextField, IntegerField, etc.)
                    # But ensure it's JSON serializable
                    try:
                        # Test if value is JSON serializable
                        json.dumps(value)
                        data[field_name] = value
                    except (TypeError, ValueError):
                        # If not serializable, convert to string
                        data[field_name] = str(value) if value is not None else None
        
        except Exception as e:
            # Log the exception for debugging, but skip fields that can't be serialized
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Error serializing field {field_name} for {instance.__class__.__name__}: {e}")
            continue
    
    return data


def get_changed_fields(previous_state: Dict[str, Any], current_state: Dict[str, Any]) -> List[str]:
    """
    Compare two state dictionaries and return list of changed field names.
    """
    changed = []
    
    # Check fields in current state
    for key, current_value in current_state.items():
        previous_value = previous_state.get(key)
        if current_value != previous_value:
            changed.append(key)
    
    # Check fields that were removed
    for key in previous_state:
        if key not in current_state:
            changed.append(key)
    
    return changed


def capture_pre_update_state(instance: models.Model) -> Optional[Dict[str, Any]]:
    """
    Capture the state of an existing model instance before update.
    
    Returns None for new instances (no previous state).
    """
    if not instance.pk:
        return None
    
    try:
        # Get the instance from database
        old_instance = instance.__class__.objects.get(pk=instance.pk)
        return serialize_model_instance(old_instance)
    except instance.__class__.DoesNotExist:
        return None
