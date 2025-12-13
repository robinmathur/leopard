"""
Task model for task management and assignment.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from immigration.models.base import LifeCycleModel
from immigration.constants import TaskPriority, TaskStatus

User = get_user_model()


class Task(LifeCycleModel):
    """
    Represents tasks assigned to users for client management.

    Tasks can be:
    - Document collection
    - Application preparation
    - Client meetings
    - Follow-ups
    - Administrative work
    """

    TASK_PRIORITIES = TaskPriority.choices()

    TASK_STATUSES = TaskStatus.choices()

    title = models.CharField(
        max_length=200,
        help_text="Task title/summary"
    )

    detail = models.TextField(
        help_text="Detailed task description"
    )

    priority = models.CharField(
        max_length=10,
        choices=TASK_PRIORITIES,
        default=TaskPriority.MEDIUM.value,
        help_text="Task priority level"
    )

    status = models.CharField(
        max_length=15,
        choices=TASK_STATUSES,
        default=TaskStatus.PENDING.value,
        help_text="Current task status"
    )

    due_date = models.DateTimeField(
        help_text="When the task should be completed"
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        help_text="User this task is assigned to"
    )

    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='tasks_assigned',
        null=True,
        blank=True,
        help_text="User who assigned this task"
    )

    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for categorization (e.g., ['client_meeting', 'urgent'])"
    )

    comments = models.JSONField(
        default=list,
        blank=True,
        help_text="Comments and updates on the task"
    )

    # Generic foreign key for linking to any entity
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Type of entity this task is linked to"
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of the entity this task is linked to"
    )
    linked_entity = GenericForeignKey('content_type', 'object_id')

    # Legacy fields (deprecated - kept for backward compatibility during migration)
    client_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Related client ID (deprecated - use linked_entity instead)"
    )

    visa_application_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Related visa application ID (deprecated - use linked_entity instead)"
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the task was completed"
    )

    class Meta:
        db_table = 'immigration_task'
        ordering = ['-due_date', '-created_at']
        indexes = [
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['assigned_to', 'due_date']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['assigned_by']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()}) - {self.assigned_to.username}"

    def mark_completed(self):
        """Mark task as completed."""
        from django.utils import timezone
        self.status = TaskStatus.COMPLETED.value
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])

    def mark_cancelled(self):
        """Mark task as cancelled."""
        self.status = TaskStatus.CANCELLED.value
        self.save(update_fields=['status'])

    @property
    def is_overdue(self):
        """Check if task is overdue."""
        if self.status in [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]:
            return False
        from django.utils import timezone
        return self.due_date < timezone.now()

    @property
    def days_until_due(self):
        """Calculate days until due date."""
        from django.utils import timezone
        if self.due_date < timezone.now():
            return -((timezone.now() - self.due_date).days)
        return (self.due_date - timezone.now()).days

    def add_comment(self, user, comment_text):
        """Add a comment to the task."""
        from django.utils import timezone
        comment = {
            'user_id': user.id,
            'username': user.username,
            'text': comment_text,
            'created_at': timezone.now().isoformat(),
        }
        self.comments.append(comment)
        self.save(update_fields=['comments'])