"""
Task model for task management and assignment.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
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
        on_delete=models.SET_NULL,
        related_name='assigned_tasks',
        null=True,
        blank=True,
        help_text="User this task is assigned to (optional, mutually exclusive with branch)"
    )

    branch = models.ForeignKey(
        'Branch',
        on_delete=models.SET_NULL,
        related_name='branch_tasks',
        null=True,
        blank=True,
        help_text="Branch this task is assigned to (optional, mutually exclusive with assigned_to)"
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
            models.Index(fields=['branch', 'status']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['priority']),
            models.Index(fields=['due_date']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['assigned_by']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(assigned_to__isnull=False, branch__isnull=True) |
                    models.Q(assigned_to__isnull=True, branch__isnull=False) |
                    models.Q(assigned_to__isnull=True, branch__isnull=True)
                ),
                name='task_assignment_constraint'
            ),
        ]

    def __str__(self):
        assigned_name = self.assigned_to.username if self.assigned_to else "Unassigned"
        return f"{self.title} ({self.get_status_display()}) - {assigned_name}"

    def mark_completed(self, user=None):
        """Mark task as completed."""
        from django.utils import timezone
        self.status = TaskStatus.COMPLETED.value
        self.completed_at = timezone.now()
        if user:
            self.updated_by = user
        self.save(update_fields=['status', 'completed_at', 'updated_by', 'updated_at'])

    def mark_cancelled(self, user=None):
        """Mark task as cancelled."""
        self.status = TaskStatus.CANCELLED.value
        if user:
            self.updated_by = user
        self.save(update_fields=['status', 'updated_by', 'updated_at'])

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

    def add_comment(self, user, comment_text, mentions=None):
        """
        Add a comment to the task.
        
        Args:
            user: User adding the comment
            comment_text: Comment text (may contain @mentions)
            mentions: List of mention dicts with user_id, username, start_pos, end_pos
        """
        from django.utils import timezone
        comment = {
            'user_id': user.id,
            'username': user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'text': comment_text,
            'mentions': mentions or [],
            'created_at': timezone.now().isoformat(),
        }
        self.comments.append(comment)
        self.save(update_fields=['comments'])
    
    def clean(self):
        """Validate that task is assigned to either user or branch, not both."""
        super().clean()
        if self.assigned_to and self.branch:
            raise ValidationError("Task cannot be assigned to both a user and a branch.")