"""
Task serializers for API layer.

These serializers handle JSON serialization/deserialization for task endpoints.
They are thin wrappers - business logic lives in services.

This module follows the centralized schema pattern where all task serializers
are defined in one file and imported by views.
"""

from rest_framework import serializers
from immigration.models.task import Task
from immigration.constants import TaskPriority, TaskStatus


class TaskOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for task output (GET requests).
    
    Returns complete task data including computed fields.
    """

    assigned_to_name = serializers.CharField(
        source='assigned_to.username',
        read_only=True
    )
    
    # Computed field for full name
    assigned_to_full_name = serializers.SerializerMethodField()
    
    # Assigned by fields
    assigned_by_name = serializers.SerializerMethodField()
    assigned_by_full_name = serializers.SerializerMethodField()
    
    # Linked entity fields
    linked_entity_type = serializers.SerializerMethodField()
    linked_entity_id = serializers.IntegerField(source='object_id', read_only=True)
    
    # Status and priority display
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'detail',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'due_date',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_full_name',
            'assigned_by',
            'assigned_by_name',
            'assigned_by_full_name',
            'tags',
            'comments',
            'content_type',
            'object_id',
            'linked_entity_type',
            'linked_entity_id',
            'client_id',
            'visa_application_id',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'completed_at',
            'created_at',
            'updated_at',
        ]
    
    def get_assigned_to_full_name(self, obj):
        """Get assigned user's full name if exists."""
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None
    
    def get_assigned_by_name(self, obj):
        """Get assigned_by user's username if exists."""
        if obj.assigned_by:
            return obj.assigned_by.username
        return None
    
    def get_assigned_by_full_name(self, obj):
        """Get assigned_by user's full name if exists."""
        if obj.assigned_by:
            return f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}".strip()
        return None
    
    def get_linked_entity_type(self, obj):
        """Get the type of linked entity (e.g., 'client', 'visaapplication')."""
        if obj.content_type:
            return obj.content_type.model
        return None


class TaskCreateSerializer(serializers.Serializer):
    """
    Serializer for creating tasks (POST requests).
    
    Validates input and passes to task_create service.
    All fields are explicitly defined for clarity and validation.
    """
    
    title = serializers.CharField(
        max_length=200,
        help_text="Task title/summary"
    )
    
    detail = serializers.CharField(
        help_text="Detailed task description"
    )
    
    priority = serializers.ChoiceField(
        choices=TaskPriority.values(),
        default=TaskPriority.MEDIUM.value,
        help_text="Task priority level"
    )
    
    due_date = serializers.DateTimeField(
        help_text="When the task should be completed"
    )
    
    assigned_to = serializers.IntegerField(
        help_text="User ID this task is assigned to"
    )
    
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Tags for categorization"
    )
    
    # Generic entity linking
    content_type = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ContentType ID of the linked entity"
    )
    object_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
    
    # Legacy fields (for backward compatibility)
    client_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Related client ID (deprecated - use content_type/object_id)"
    )
    
    visa_application_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Related visa application ID (deprecated - use content_type/object_id)"
    )


class TaskUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating tasks (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    title = serializers.CharField(
        max_length=200,
        required=False,
        help_text="Task title/summary"
    )
    
    detail = serializers.CharField(
        required=False,
        help_text="Detailed task description"
    )
    
    priority = serializers.ChoiceField(
        choices=TaskPriority.values(),
        required=False,
        help_text="Task priority level"
    )
    
    status = serializers.ChoiceField(
        choices=TaskStatus.values(),
        required=False,
        help_text="Current task status"
    )
    
    due_date = serializers.DateTimeField(
        required=False,
        help_text="When the task should be completed"
    )
    
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Tags for categorization"
    )
    
    # Generic entity linking
    content_type = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ContentType ID of the linked entity"
    )
    object_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )