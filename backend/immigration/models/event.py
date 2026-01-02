"""
CalendarEvent model for calendar and scheduling functionality.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from immigration.models.base import LifeCycleModel

User = get_user_model()


class CalendarEvent(LifeCycleModel):
    """
    Represents calendar events for scheduling and time management.

    Events can be:
    - Meetings
    - Appointments
    - Deadlines
    - Reminders
    - General calendar entries
    """

    title = models.CharField(
        max_length=200,
        help_text="Event title/summary"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed event description"
    )

    start = models.DateTimeField(
        help_text="Event start date and time"
    )

    end = models.DateTimeField(
        help_text="Event end date and time"
    )

    duration = models.DurationField(
        null=True,
        blank=True,
        editable=False,
        help_text="Auto-calculated duration (end - start)"
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='assigned_events',
        null=True,
        blank=True,
        help_text="User this event is assigned to"
    )

    hex_color = models.CharField(
        max_length=7,
        default='#3788d8',
        help_text="Hex color code for calendar display (e.g., #FF5733)"
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        help_text="Event location (physical or virtual)"
    )

    all_day = models.BooleanField(
        default=False,
        help_text="Whether this is an all-day event"
    )

    branch = models.ForeignKey(
        'Branch',
        on_delete=models.SET_NULL,
        related_name='events',
        null=True,
        blank=True,
        help_text="Branch this event is associated with (for multi-tenant scoping)"
    )

    class Meta:
        db_table = 'immigration_calendar_event'
        ordering = ['-start', '-created_at']
        indexes = [
            models.Index(fields=['assigned_to', 'start']),
            models.Index(fields=['assigned_to', 'end']),
            models.Index(fields=['branch', 'start']),
            models.Index(fields=['start', 'end']),
            models.Index(fields=['created_by']),
        ]
        permissions = [
            ('view_team_events', 'Can view team calendar events'),
            ('assign_calendarevent_to_others', 'Can assign calendar events to other users'),
        ]

    def __str__(self):
        assigned_name = self.assigned_to.username if self.assigned_to else "Unassigned"
        return f"{self.title} ({self.start.strftime('%Y-%m-%d %H:%M')}) - {assigned_name}"

    def clean(self):
        """Validate that end is after start."""
        super().clean()
        if self.start and self.end and self.end <= self.start:
            raise ValidationError("Event end time must be after start time.")

    def save(self, *args, **kwargs):
        """Auto-calculate duration before saving."""
        if self.start and self.end:
            self.duration = self.end - self.start

        # Validate before saving
        self.full_clean()

        super().save(*args, **kwargs)

    @property
    def duration_minutes(self):
        """Get duration in minutes."""
        if self.duration:
            return int(self.duration.total_seconds() / 60)
        return 0

    @property
    def is_past(self):
        """Check if event has already ended."""
        from django.utils import timezone
        return self.end < timezone.now()

    @property
    def is_ongoing(self):
        """Check if event is currently happening."""
        from django.utils import timezone
        now = timezone.now()
        return self.start <= now <= self.end

    @property
    def is_upcoming(self):
        """Check if event is in the future."""
        from django.utils import timezone
        return self.start > timezone.now()
