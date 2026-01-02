"""
CalendarEvent selectors for read operations with permission-based filtering.

This module implements the selector pattern for calendar event queries,
providing permission-based data scoping.
"""

from django.db.models import QuerySet, Q
from typing import Optional, Dict, Any

from immigration.models import CalendarEvent


def event_list(*, user, filters: Optional[Dict[str, Any]] = None) -> QuerySet[CalendarEvent]:
    """
    Get calendar events filtered by user's permissions and role.

    Permission-based visibility rules:
    1. OWN EVENTS: Always visible (no permission required)
       → Filter: assigned_to = current_user

    2. TEAM EVENTS: Requires 'immigration.view_team_events' permission
       → CONSULTANT/BRANCH_ADMIN: Same branch members
       → REGION_MANAGER: All users in their regions
       → SUPER_ADMIN: All tenant users

    3. ROLE OVERRIDES (automatic, no permission check needed)
       → BRANCH_ADMIN: All events in their branches
       → REGION_MANAGER: All events in their regions
       → SUPER_ADMIN: All events tenant-wide

    Args:
        user: Authenticated user making the request
        filters: Optional dict of additional filters (start_date, end_date, assigned_to, etc.)

    Returns:
        QuerySet of CalendarEvent objects filtered by permissions and role
    """
    filters = filters or {}

    # Start with base queryset with optimized joins
    qs = CalendarEvent.objects.select_related(
        'assigned_to',
        'branch',
        'created_by',
        'updated_by'
    ).all()

    # Build permission-based filter
    # Always include own events
    own_events_filter = Q(assigned_to=user)

    # Check if user has permission to view team events
    has_team_permission = user.has_perm('immigration.view_team_events')

    if has_team_permission:
        # User can see team events based on their role
        if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
            # See events of users in the same branches
            user_branches = user.branches.all()
            if user_branches.exists():
                team_events_filter = Q(assigned_to__branches__in=user_branches)
                qs = qs.filter(own_events_filter | team_events_filter)
            else:
                # No branches assigned, can only see own events
                qs = qs.filter(own_events_filter)

        elif user.is_in_group('REGION_MANAGER'):
            # See events of users in the same regions
            user_regions = user.regions.all()
            if user_regions.exists():
                team_events_filter = Q(assigned_to__regions__in=user_regions)
                qs = qs.filter(own_events_filter | team_events_filter)
            else:
                # No regions assigned, can only see own events
                qs = qs.filter(own_events_filter)

        elif user.is_in_group('SUPER_ADMIN'):
            # See all events in tenant (schema-scoped automatically)
            # Don't filter - user can see all events
            pass

        else:
            # Has permission but no recognized role - only own events
            qs = qs.filter(own_events_filter)
    else:
        # No team permission - only see own events
        qs = qs.filter(own_events_filter)

    # Apply additional filters
    if 'start_date' in filters and filters['start_date']:
        # Events that end after the start_date
        qs = qs.filter(end__gte=filters['start_date'])

    if 'end_date' in filters and filters['end_date']:
        # Events that start before the end_date
        qs = qs.filter(start__lte=filters['end_date'])

    if 'assigned_to' in filters and filters['assigned_to']:
        qs = qs.filter(assigned_to_id=filters['assigned_to'])

    if 'branch' in filters and filters['branch']:
        qs = qs.filter(branch_id=filters['branch'])

    if 'search' in filters and filters['search']:
        search_term = filters['search']
        qs = qs.filter(
            Q(title__icontains=search_term) |
            Q(description__icontains=search_term) |
            Q(location__icontains=search_term)
        )

    return qs


def event_get(*, user, event_id: int) -> CalendarEvent:
    """
    Get a specific calendar event with permission validation.

    Raises:
        CalendarEvent.DoesNotExist: If event doesn't exist
        PermissionError: If user doesn't have permission to access the event

    Args:
        user: Authenticated user making the request
        event_id: ID of the event to retrieve

    Returns:
        CalendarEvent instance
    """
    # Use event_list to automatically apply permission filtering
    qs = event_list(user=user)

    try:
        return qs.get(id=event_id)
    except CalendarEvent.DoesNotExist:
        # Check if event exists but user doesn't have access
        if CalendarEvent.objects.filter(id=event_id).exists():
            raise PermissionError(
                f"User {user.username} does not have permission to access event {event_id}"
            )
        raise CalendarEvent.DoesNotExist(f"Event with id={event_id} does not exist")


def event_list_upcoming(*, user, days: int = 7, filters: Optional[Dict[str, Any]] = None) -> QuerySet[CalendarEvent]:
    """
    Get upcoming calendar events for the next N days.

    Args:
        user: Authenticated user making the request
        days: Number of days to look ahead (default: 7)
        filters: Optional additional filters

    Returns:
        QuerySet of upcoming CalendarEvent objects
    """
    from django.utils import timezone
    from datetime import timedelta

    filters = filters or {}
    now = timezone.now()
    future_date = now + timedelta(days=days)

    # Add date range to filters
    filters['start_date'] = now
    filters['end_date'] = future_date

    return event_list(user=user, filters=filters).order_by('start')
