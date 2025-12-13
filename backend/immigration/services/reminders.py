"""
Reminder services for business logic.

These services handle reminder processing and notification creation.
"""

from datetime import datetime, date, time
from typing import List, Optional
from django.contrib.auth import get_user_model
from django.utils import timezone

from immigration.reminder.reminder import Reminder
from immigration.models.notification import Notification
from immigration.constants import NotificationType

User = get_user_model()


def get_due_reminders(check_date: Optional[date] = None, check_time: Optional[time] = None) -> List[Reminder]:
    """
    Get reminders that are due and haven't had notifications created yet.
    
    Args:
        check_date: Date to check against (defaults to today)
        check_time: Time to check against (defaults to now)
        
    Returns:
        List of Reminder objects that are due
    """
    if check_date is None:
        check_date = timezone.now().date()
    
    if check_time is None:
        check_time = timezone.now().time()
    
    # Get reminders that:
    # 1. Are not completed
    # 2. Don't have notifications created yet
    # 3. Have a reminder_date that's today or in the past
    queryset = Reminder.objects.filter(
        is_completed=False,
        notification_created=False,
        reminder_date__lte=check_date
    )
    
    # Filter by time if the reminder has a time set
    due_reminders = []
    for reminder in queryset:
        if reminder.reminder_time:
            # If time is set, only include if it's due
            if reminder.reminder_date < check_date or (
                reminder.reminder_date == check_date and reminder.reminder_time <= check_time
            ):
                due_reminders.append(reminder)
        else:
            # If no time is set, include all reminders for today or past
            if reminder.reminder_date <= check_date:
                due_reminders.append(reminder)
    
    return due_reminders


def create_reminder_notification(reminder: Reminder) -> Optional[Notification]:
    """
    Create a notification for a due reminder.
    
    Args:
        reminder: Reminder object to create notification for
        
    Returns:
        Created Notification object or None if creation fails
    """
    if reminder.notification_created:
        # Notification already created
        return None
    
    try:
        # Get the user to assign notification to (from reminder's linked entity or created_by)
        assigned_to = reminder.created_by
        if not assigned_to and reminder.content_type and reminder.object_id:
            # Try to get user from linked entity (e.g., client's assigned consultant)
            from django.contrib.contenttypes.models import ContentType
            from immigration.models.client import Client
            try:
                client_content_type = ContentType.objects.get(app_label='immigration', model='client')
                if reminder.content_type == client_content_type:
                    client = Client.objects.get(id=reminder.object_id)
                    assigned_to = client.assigned_to if hasattr(client, 'assigned_to') else None
            except (ContentType.DoesNotExist, Client.DoesNotExist):
                pass
        
        if not assigned_to:
            # Can't create notification without a user
            return None
        
        # Create notification
        notification = Notification.objects.create(
            assigned_to=assigned_to,
            notification_type=NotificationType.REMINDER_DUE.value,
            title=f"Reminder: {reminder.title}",
            message=f"Reminder: {reminder.title}",
            due_date=reminder.reminder_date if reminder.reminder_date else None,
            meta_info={
                'reminder_id': reminder.id,
                'reminder_title': reminder.title,
                'reminder_date': reminder.reminder_date.isoformat() if reminder.reminder_date else None,
                'reminder_time': reminder.reminder_time.isoformat() if reminder.reminder_time else None,
                'content_type': reminder.content_type.id if reminder.content_type else None,
                'object_id': reminder.object_id,
            }
        )
        
        # Mark reminder as having notification created
        reminder.notification_created = True
        reminder.save(update_fields=['notification_created'])
        
        return notification
    except Exception as e:
        print(f"Error creating notification for reminder {reminder.id}: {e}")
        return None


def process_due_reminders() -> dict:
    """
    Process all due reminders and create notifications.
    
    This function should be called periodically (e.g., via cron or celery).
    
    Returns:
        Dictionary with processing statistics
    """
    due_reminders = get_due_reminders()
    
    processed = 0
    failed = 0
    
    for reminder in due_reminders:
        notification = create_reminder_notification(reminder)
        if notification:
            processed += 1
        else:
            failed += 1
    
    return {
        'total_due': len(due_reminders),
        'processed': processed,
        'failed': failed,
        'timestamp': timezone.now().isoformat(),
    }
