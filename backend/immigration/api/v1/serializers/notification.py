"""
Notification serializers for API layer.

These serializers handle JSON serialization/deserialization for notification endpoints.
They are thin wrappers - business logic lives in services.

This module follows the centralized schema pattern where all notification serializers
are defined in one file and imported by views.
"""

from rest_framework import serializers
from immigration.models.notification import Notification
from immigration.constants import NotificationType


class NotificationOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for notification output (GET requests).
    
    Returns complete notification data including computed fields.
    """
    
    # Computed fields for better UX
    assigned_to_name = serializers.SerializerMethodField()
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'assigned_to',
            'assigned_to_name',
            'title',
            'message',
            'due_date',
            'meta_info',
            'read',
            'read_at',
            'is_completed',
            'is_overdue',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]
    
    def get_assigned_to_name(self, obj):
        """Get assigned user's full name if exists."""
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None
    
    def get_is_overdue(self, obj):
        """Check if notification is overdue."""
        return obj.is_overdue


class NotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating notifications (POST requests).
    
    Validates input and passes to notification service.
    Note: Title and message generation logic should be in service layer.
    """
    
    type = serializers.ChoiceField(
        choices=NotificationType.values(),
        help_text="Type of notification"
    )
    
    assigned_to = serializers.IntegerField(
        help_text="User ID this notification is for"
    )
    
    title = serializers.CharField(
        max_length=200,
        required=False,
        help_text="Notification title (auto-generated if not provided)"
    )
    
    message = serializers.CharField(
        required=False,
        help_text="Notification message content (auto-generated if not provided)"
    )
    
    due_date = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text="Relevant date (task due date, visa expiry, etc.)"
    )
    
    meta_info = serializers.DictField(
        required=False,
        default=dict,
        help_text="Additional metadata (task_id, client_id, etc.)"
    )


class NotificationUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating notifications (PUT/PATCH requests).
    
    All fields optional - typically used to mark notifications as read or completed.
    """
    
    read = serializers.BooleanField(
        required=False,
        help_text="Whether user has read this notification"
    )
    
    is_completed = serializers.BooleanField(
        required=False,
        help_text="Whether the related action has been completed"
    )