"""
Event models for tracking entity changes and processing side effects.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class EventStatus:
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'
    
    CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]


class EventAction:
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'
    
    CHOICES = [
        (CREATE, 'Create'),
        (UPDATE, 'Update'),
        (DELETE, 'Delete'),
    ]


class Event(models.Model):
    """
    Event queue model for tracking entity changes and processing side effects.

    Multi-tenant: Events are stored in tenant schemas. The tenant_schema field
    allows async processors to switch to the correct schema context.
    """

    # Event identification
    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text="e.g., 'Client.assigned_to.UPDATE', 'Task.CREATE'"
    )
    entity_type = models.CharField(
        max_length=50,
        db_index=True,
        help_text="e.g., 'Client', 'Task'"
    )
    entity_id = models.PositiveIntegerField()

    # Multi-tenant support
    tenant_schema = models.CharField(
        max_length=100,
        db_index=True,
        null=True,  # Temporary: nullable for migration compatibility
        blank=True,
        default='public',  # Temporary default for existing records
        help_text="Schema name for tenant context (e.g., 'tenant_acme')"
    )

    action = models.CharField(
        max_length=20,
        choices=EventAction.CHOICES,
    )
    
    # State tracking
    previous_state = models.JSONField(default=dict, blank=True)
    current_state = models.JSONField(default=dict, blank=True)
    changed_fields = models.JSONField(default=list, blank=True)
    
    # Processing state
    status = models.CharField(
        max_length=20,
        choices=EventStatus.CHOICES,
        default=EventStatus.PENDING,
        db_index=True
    )
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=2)
    error_message = models.TextField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Handler results
    handler_results = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_events',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'immigration_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['event_type', 'status']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]
    
    def __str__(self):
        return f"{self.event_type} [{self.status}] - {self.entity_type}:{self.entity_id}"
    
    def can_retry(self) -> bool:
        return self.retry_count < self.max_retries
