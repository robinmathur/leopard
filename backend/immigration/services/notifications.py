"""
Notification services for business logic.

These services handle notification operations and business rules.
Business logic lives here - not in views or serializers.
"""

from typing import Optional, List, Tuple
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from immigration.models.notification import Notification
from immigration.constants import NotificationType

User = get_user_model()


def get_default_notification_title_and_message(notification_type: str) -> Tuple[str, str]:
    """
    Generate default title and message based on notification type.
    
    This function encapsulates the business logic for notification messages,
    moved from the serializer to maintain separation of concerns.
    
    Args:
        notification_type: Type of notification
        
    Returns:
        Tuple of (title, message)
    """
    type_messages = {
        NotificationType.LEAD_ASSIGNED.value: (
            'New Lead Assigned',
            'A new lead has been assigned to you.'
        ),
        NotificationType.TASK_ASSIGNED.value: (
            'Task Assigned',
            'A new task has been assigned to you.'
        ),
        NotificationType.APPLICATION_ASSIGNED.value: (
            'Application Assigned',
            'A new application has been assigned to you.'
        ),
        NotificationType.VISA_APPLICATION_ASSIGNED.value: (
            'Visa Application Assigned',
            'A new visa application has been assigned to you.'
        ),
        NotificationType.REMINDER.value: (
            'Reminder',
            'You have a reminder.'
        ),
        NotificationType.TASK_DUE_SOON.value: (
            'Task Due Soon',
            'A task is approaching its due date.'
        ),
        NotificationType.TASK_OVERDUE.value: (
            'Task Overdue',
            'A task is overdue.'
        ),
        NotificationType.CLIENT_ASSIGNED.value: (
            'Client Assigned',
            'A client has been assigned to you.'
        ),
        NotificationType.REMINDER_DUE.value: (
            'Reminder Due',
            'You have a reminder that is due.'
        ),
        NotificationType.SYSTEM_ALERT.value: (
            'System Alert',
            'There is a system alert.'
        ),
    }
    
    return type_messages.get(
        notification_type,
        ('Notification', 'You have a new notification.')
    )


def send_sse_event(user_id: int, event_type: str, data: dict) -> bool:
    """
    Send an SSE event to a user via channel layer.
    Only sends if user is online (has active SSE connection).

    Args:
        user_id: User ID to send event to
        event_type: Type of SSE event (notification_message, notification_read, etc.)
        data: Event data dictionary

    Returns:
        True if sent successfully, False otherwise
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Check if user is online before sending SSE
    from immigration.services.user_presence import is_user_online
    
    is_online = is_user_online(user_id)
    
    if not is_online:
        logger.debug(f"SSE: Skipping - user {user_id} is offline")
        return False
    
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.error(f"SSE: No channel layer configured")
        return False

    try:
        group_name = f"user_{user_id}"
        message = {
            'type': event_type,
            'data': data
        }
        logger.debug(f"SSE: Sending {event_type} to group {group_name}")
        async_to_sync(channel_layer.group_send)(group_name, message)
        logger.info(f"SSE: Successfully sent {event_type} to user {user_id}")
        return True
    except Exception as e:
        logger.error(f"SSE: Error sending to user {user_id}: {e}")
        return False


def send_notification_to_user(user_id: int, notification_data: dict) -> bool:
    """
    Send a new notification to a user via SSE channel layer.
    Only sends if user is online (has active SSE connection).

    Args:
        user_id: User ID to send notification to
        notification_data: Notification data dictionary

    Returns:
        True if sent successfully, False otherwise
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"SSE Send: user={user_id}, notification_id={notification_data.get('id')}")
    
    return send_sse_event(user_id, 'notification_message', {'notification': notification_data})


def send_notification_read_event(user_id: int, notification_ids: list) -> bool:
    """
    Send notification read event to sync across browser sessions.

    Args:
        user_id: User ID to send event to
        notification_ids: List of notification IDs that were marked as read

    Returns:
        True if sent successfully, False otherwise
    """
    # Ensure IDs are integers for consistent JSON serialization
    int_ids = [int(id) for id in notification_ids]
    return send_sse_event(user_id, 'notification_read', {'notification_ids': int_ids})


def send_unread_count_update(user_id: int, unread_count: int) -> bool:
    """
    Send unread count update to sync across browser sessions.

    Args:
        user_id: User ID to send event to
        unread_count: New unread count

    Returns:
        True if sent successfully, False otherwise
    """
    return send_sse_event(user_id, 'unread_count_update', {'unread_count': unread_count})


def notification_create(
    notification_type: str,
    assigned_to: User,
    title: Optional[str] = None,
    message: Optional[str] = None,
    due_date: Optional[timezone.datetime] = None,
    meta_info: Optional[dict] = None,
    created_by: Optional[User] = None,
) -> Notification:
    """
    Create a new notification and send it via SSE.
    
    If title or message are not provided, defaults will be generated
    based on the notification_type.

    Args:
        notification_type: Type of notification
        assigned_to: User to assign the notification to
        title: Notification title (auto-generated if not provided)
        message: Notification message (auto-generated if not provided)
        due_date: Optional due date
        meta_info: Optional metadata
        created_by: User creating the notification

    Returns:
        Created Notification instance
    """
    # Generate default title and message if not provided
    if not title or not message:
        default_title, default_message = get_default_notification_title_and_message(notification_type)
        title = title or default_title
        message = message or default_message
    
    notification = Notification.objects.create(
        notification_type=notification_type,
        assigned_to=assigned_to,
        title=title,
        message=message,
        due_date=due_date,
        meta_info=meta_info or {},
        created_by=created_by,
    )
    
    # Send notification via SSE channel layer
    notification_data = {
        'id': notification.id,
        'notification_type': notification.notification_type,
        'title': notification.title,
        'message': notification.message,
        'due_date': notification.due_date.isoformat() if notification.due_date else None,
        'meta_info': notification.meta_info,
        'read': notification.read,
        'created_at': notification.created_at.isoformat(),
    }
    send_notification_to_user(assigned_to.id, notification_data)
    
    return notification


def notification_get(notification_id: int) -> Optional[Notification]:
    """
    Get a notification by ID.

    Args:
        notification_id: Notification ID

    Returns:
        Notification instance or None
    """
    try:
        return Notification.objects.get(id=notification_id)
    except Notification.DoesNotExist:
        return None


def notification_list(
    user: User,
    include_read: bool = True,
    notification_type: Optional[str] = None,
) -> List[Notification]:
    """
    List notifications for a user.

    Args:
        user: User to get notifications for
        include_read: Whether to include read notifications
        notification_type: Filter by notification type

    Returns:
        List of Notification instances
    """
    queryset = Notification.objects.filter(assigned_to=user)

    if not include_read:
        queryset = queryset.filter(read=False)

    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)

    return list(queryset.order_by('-created_at'))


def notification_update(
    notification_id: int,
    user: User,
    read: Optional[bool] = None,
    is_completed: Optional[bool] = None,
) -> Optional[Notification]:
    """
    Update a notification.

    Args:
        notification_id: Notification ID
        user: User updating the notification
        read: Whether to mark as read
        is_completed: Whether to mark as completed

    Returns:
        Updated Notification instance or None
    """
    notification = notification_get(notification_id)
    if not notification or notification.assigned_to != user:
        return None
    
    if read is not None:
        if read and not notification.read:
            notification.mark_as_read()
        elif not read and notification.read:
            notification.read = False
            notification.read_at = None
            notification.save()
    
    if is_completed is not None:
        notification.is_completed = is_completed
        notification.save()
    
    return notification


def notification_mark_read(notification_id: int, user: User) -> Optional[Notification]:
    """
    Mark a notification as read.

    Args:
        notification_id: Notification ID
        user: User marking as read

    Returns:
        Updated Notification instance or None
    """
    notification = notification_get(notification_id)
    if notification and notification.assigned_to == user:
        was_unread = not notification.read
        notification.mark_as_read()
        
        # Send SSE event for cross-browser sync if notification was previously unread
        if was_unread:
            send_notification_read_event(user.id, [notification_id])
            # Send updated unread count
            unread_count = notification_get_unread_count(user)
            send_unread_count_update(user.id, unread_count)
        
        return notification
    return None


def notification_bulk_mark_read(user: User, notification_ids: List[int]) -> int:
    """
    Mark multiple notifications as read.

    Args:
        user: User marking notifications as read
        notification_ids: List of notification IDs

    Returns:
        Number of notifications marked as read
    """
    # Get IDs of notifications that are currently unread (for SSE sync)
    unread_ids = list(Notification.objects.filter(
        id__in=notification_ids,
        assigned_to=user,
        read=False
    ).values_list('id', flat=True))
    
    notifications = Notification.objects.filter(
        id__in=notification_ids,
        assigned_to=user,
        read=False
    )
    count = notifications.update(read=True, read_at=timezone.now())
    
    # Send SSE events for cross-browser sync if any notifications were marked as read
    if unread_ids:
        send_notification_read_event(user.id, unread_ids)
        # Send updated unread count
        unread_count = notification_get_unread_count(user)
        send_unread_count_update(user.id, unread_count)
    
    return count


def notification_delete(notification_id: int, user: User) -> bool:
    """
    Delete a notification (soft delete).

    Args:
        notification_id: Notification ID
        user: User requesting deletion

    Returns:
        True if deleted, False otherwise
    """
    notification = notification_get(notification_id)
    if notification and notification.assigned_to == user:
        notification.delete()  # Soft delete via SoftDeletionModel
        return True
    return False


def notification_get_unread_count(user: User) -> int:
    """
    Get count of unread notifications for a user.

    Args:
        user: User to check

    Returns:
        Count of unread notifications
    """
    return Notification.objects.filter(
        assigned_to=user,
        read=False
    ).count()


def notification_get_overdue(user: User) -> List[Notification]:
    """
    Get overdue notifications for a user.

    Args:
        user: User to check

    Returns:
        List of overdue notifications
    """
    now = timezone.now()
    return list(Notification.objects.filter(
        assigned_to=user,
        due_date__lt=now,
        is_completed=False
    ).order_by('due_date'))