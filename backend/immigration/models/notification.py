"""
Notification model for real-time notifications and alerts.
"""

from django.db import models
from django.contrib.auth import get_user_model
from immigration.models.base import LifeCycleModel
from immigration.constants import NotificationType

User = get_user_model()


class Notification(LifeCycleModel):
    """
    Represents notifications sent to users for various events.

    Notifications can be for:
    - Task assignments
    - Visa application updates
    - Client status changes
    - System alerts
    """

    NOTIFICATION_TYPES = NotificationType.choices()

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default=NotificationType.SYSTEM_ALERT.value,
        help_text="Type of notification"
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,  # Temporarily nullable for migration
        blank=True,
        help_text="User this notification is for"
    )

    title = models.CharField(
        max_length=200,
        default="Notification",
        help_text="Notification title"
    )

    message = models.TextField(
        default="",
        help_text="Notification message content"
    )

    due_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Relevant date (task due date, visa expiry, etc.)"
    )

    meta_info = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata (task_id, client_id, etc.)"
    )

    read = models.BooleanField(
        default=False,
        help_text="Whether user has read this notification"
    )

    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When user read this notification"
    )

    is_completed = models.BooleanField(
        default=False,
        help_text="Whether the related action has been completed"
    )

    class Meta:
        db_table = 'immigration_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assigned_to', 'read']),
            models.Index(fields=['assigned_to', 'created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['due_date']),
            models.Index(fields=['read']),
        ]

    def __str__(self):
        return f"{self.notification_type} for {self.assigned_to.username}: {self.title}"

    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        self.read = True
        self.read_at = timezone.now()
        self.save(update_fields=['read', 'read_at'])

    @property
    def is_overdue(self):
        """Check if notification is overdue."""
        if not self.due_date:
            return False
        from django.utils import timezone
        return self.due_date < timezone.now()