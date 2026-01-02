"""
Notification Handler

Creates notifications directly (without ClientActivity).
Used when only notification is needed, not timeline entry.

Note: notification_create() automatically triggers SSE.
"""

from typing import List
from django.contrib.auth import get_user_model
from django.db.models import Q

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
    
    from immigration.constants import NotificationType
    notification_type = config.get('type', NotificationType.SYSTEM_ALERT.value)
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
    - {'team': 'branch'} - Get all users in the branch (team-wide notification)
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
        elif 'team' in recipient:
            resolved = resolve_team_recipients(event, recipient)
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
        # User has branches (ManyToMany), so use branches__id
        branch_id = event.current_state.get('branch')
        if branch_id:
            users = users.filter(branches__id=branch_id)
    elif scope == 'region':
        # Filter to same region
        # Get branch from entity, then region from branch
        # User has regions (ManyToMany) and branches (ManyToMany), so check both
        branch_id = event.current_state.get('branch')
        if branch_id:
            from immigration.models import Branch
            try:
                branch = Branch.objects.get(id=branch_id)
                if branch.region:
                    # Filter by region through branches or direct regions
                    users = users.filter(
                        Q(branches__region=branch.region) | 
                        Q(regions__id=branch.region.id)
                    ).distinct()
            except Branch.DoesNotExist:
                pass
    
    return list(users)


def resolve_team_recipients(event: Event, config: dict) -> List[User]:
    """
    Resolve all team members within a scope (branch/region).
    
    Supports:
    - {'team': 'branch'} - All users in the same branch as the entity
    - {'team': 'region'} - All users in the same region as the entity
    """
    team_scope = config.get('team', 'branch')
    
    # Get branch ID from event
    branch_id = event.current_state.get('branch')
    if not branch_id:
        return []
    
    if team_scope == 'branch':
        # Get all users in the same branch
        users = User.objects.filter(branches__id=branch_id).distinct()
        return list(users)
    elif team_scope == 'region':
        # Get all users in the same region as the branch
        from immigration.models import Branch
        try:
            branch = Branch.objects.get(id=branch_id)
            if branch.region:
                # Get users through branches or direct regions
                users = User.objects.filter(
                    Q(branches__region=branch.region) | 
                    Q(regions__id=branch.region.id)
                ).distinct()
                return list(users)
        except Branch.DoesNotExist:
            pass
    
    return []
