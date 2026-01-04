"""
CalendarEvent services for business logic.

These services handle calendar event operations and business rules.
Business logic lives here - not in views or serializers.
"""

from typing import Optional
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction

from immigration.models import CalendarEvent

User = get_user_model()


@transaction.atomic
def event_create(
    title: str,
    start: timezone.datetime,
    end: timezone.datetime,
    assigned_to: Optional[User] = None,
    hex_color: str = '#3788d8',
    description: str = '',
    location: str = '',
    all_day: bool = False,
    branch_id: Optional[int] = None,
    created_by: Optional[User] = None,
) -> CalendarEvent:
    """
    Create a new calendar event.

    Args:
        title: Event title
        start: Event start date/time
        end: Event end date/time
        assigned_to: User the event is assigned to (optional)
        hex_color: Color for calendar display (hex format)
        description: Detailed event description
        location: Event location (physical or virtual)
        all_day: Whether this is an all-day event
        branch_id: Branch ID for multi-tenant scoping
        created_by: User creating the event

    Returns:
        Created CalendarEvent instance

    Raises:
        ValidationError: If validation fails (e.g., end before start)
    """
    # Validate hex color format
    if hex_color and not hex_color.startswith('#'):
        hex_color = f'#{hex_color}'

    # Validate dates
    if end <= start:
        raise ValidationError("Event end time must be after start time.")

    # Handle branch assignment
    branch_obj = None
    if branch_id:
        from immigration.models import Branch
        try:
            branch_obj = Branch.objects.get(id=branch_id)
        except Branch.DoesNotExist:
            raise ValidationError(f"Branch with ID {branch_id} does not exist.")

    # Create event
    event = CalendarEvent.objects.create(
        title=title,
        start=start,
        end=end,
        assigned_to=assigned_to,
        hex_color=hex_color,
        description=description,
        location=location,
        all_day=all_day,
        branch=branch_obj,
        created_by=created_by,
        updated_by=created_by,
    )

    return event


@transaction.atomic
def event_update(
    event: CalendarEvent,
    title: Optional[str] = None,
    start: Optional[timezone.datetime] = None,
    end: Optional[timezone.datetime] = None,
    assigned_to: Optional[User] = None,
    hex_color: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
    all_day: Optional[bool] = None,
    updated_by: Optional[User] = None,
) -> CalendarEvent:
    """
    Update an existing calendar event.

    Args:
        event: CalendarEvent instance to update
        title: New title (optional)
        start: New start date/time (optional)
        end: New end date/time (optional)
        assigned_to: New assigned user (optional)
        hex_color: New color (optional)
        description: New description (optional)
        location: New location (optional)
        all_day: New all-day flag (optional)
        updated_by: User making the update

    Returns:
        Updated CalendarEvent instance

    Raises:
        ValidationError: If validation fails
    """
    update_fields = ['updated_by', 'updated_at']

    if title is not None:
        event.title = title
        update_fields.append('title')

    if start is not None:
        event.start = start
        update_fields.append('start')

    if end is not None:
        event.end = end
        update_fields.append('end')

    if assigned_to is not None:
        event.assigned_to = assigned_to
        update_fields.append('assigned_to')

    if hex_color is not None:
        if hex_color and not hex_color.startswith('#'):
            hex_color = f'#{hex_color}'
        event.hex_color = hex_color
        update_fields.append('hex_color')

    if description is not None:
        event.description = description
        update_fields.append('description')

    if location is not None:
        event.location = location
        update_fields.append('location')

    if all_day is not None:
        event.all_day = all_day
        update_fields.append('all_day')

    event.updated_by = updated_by

    # Validate before saving
    event.full_clean()

    event.save(update_fields=update_fields)

    return event


@transaction.atomic
def event_delete(event: CalendarEvent, user: Optional[User] = None) -> None:
    """
    Hard delete a calendar event.

    Args:
        event: CalendarEvent instance to delete
        user: User performing the deletion
    """
    event.delete()  # Hard delete - permanently removes from database


def event_get(event_id: int) -> Optional[CalendarEvent]:
    """
    Get a calendar event by ID.

    Args:
        event_id: Event ID

    Returns:
        CalendarEvent instance or None
    """
    try:
        return CalendarEvent.objects.get(id=event_id)
    except CalendarEvent.DoesNotExist:
        return None


