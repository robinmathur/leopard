"""
Task serializers for API layer.

These serializers handle JSON serialization/deserialization for task endpoints.
They are thin wrappers - business logic lives in services.

This module follows the centralized schema pattern where all task serializers
are defined in one file and imported by views.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models.task import Task
from immigration.constants import TaskPriority, TaskStatus


class TaskOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for task output (GET requests).
    
    Returns complete task data including computed fields.
    """

    assigned_to_name = serializers.CharField(
        source='assigned_to.username',
        read_only=True,
        allow_null=True
    )
    
    # Computed field for full name
    assigned_to_full_name = serializers.SerializerMethodField()
    
    # Branch assignment fields
    branch_id = serializers.IntegerField(
        source='branch.id',
        read_only=True,
        allow_null=True
    )
    branch_name = serializers.CharField(
        source='branch.name',
        read_only=True,
        allow_null=True
    )
    assigned_to_branch = serializers.SerializerMethodField()
    
    # Assigned by fields
    assigned_by_name = serializers.SerializerMethodField()
    assigned_by_full_name = serializers.SerializerMethodField()

    # Created by fields (for delete permissions)
    created_by_name = serializers.SerializerMethodField()
    created_by_full_name = serializers.SerializerMethodField()

    # Updated by fields (for completed/cancelled tasks)
    updated_by_name = serializers.SerializerMethodField()
    updated_by_full_name = serializers.SerializerMethodField()
    
    # Linked entity fields
    linked_entity_type = serializers.SerializerMethodField()
    linked_entity_id = serializers.IntegerField(source='object_id', read_only=True)
    linked_entity_name = serializers.SerializerMethodField()

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
            'branch_id',
            'branch_name',
            'assigned_to_branch',
            'assigned_by',
            'assigned_by_name',
            'assigned_by_full_name',
            'created_by',
            'created_by_name',
            'created_by_full_name',
            'updated_by',
            'updated_by_name',
            'updated_by_full_name',
            'tags',
            'comments',
            'content_type',
            'object_id',
            'linked_entity_type',
            'linked_entity_id',
            'linked_entity_name',
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
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_to_full_name(self, obj):
        """Get assigned user's full name if exists."""
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_by_name(self, obj):
        """Get assigned_by user's username if exists."""
        if obj.assigned_by:
            return obj.assigned_by.username
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_by_full_name(self, obj):
        """Get assigned_by user's full name if exists."""
        if obj.assigned_by:
            return f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}".strip()
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_name(self, obj):
        """Get created_by user's username if exists."""
        if obj.created_by:
            return obj.created_by.username
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_full_name(self, obj):
        """Get created_by user's full name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by_name(self, obj):
        """Get updated_by user's username if exists."""
        if obj.updated_by:
            return obj.updated_by.username
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by_full_name(self, obj):
        """Get updated_by user's full name if exists."""
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip()
        return None
    
    @extend_schema_field(serializers.BooleanField())
    def get_assigned_to_branch(self, obj):
        """Check if task is assigned to a branch."""
        return obj.branch is not None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_entity_type(self, obj):
        """Get the type of linked entity (e.g., 'client', 'visaapplication')."""
        if obj.content_type:
            return obj.content_type.model
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_linked_entity_name(self, obj):
        """Get the name of the linked entity."""
        if not obj.linked_entity:
            return None

        entity_type = obj.content_type.model if obj.content_type else None

        if entity_type == 'client':
            # For clients, return full name
            return f"{obj.linked_entity.first_name} {obj.linked_entity.last_name}".strip()
        elif entity_type == 'visaapplication':
            # For visa applications, return application number or client name
            if hasattr(obj.linked_entity, 'application_number'):
                return f"Application #{obj.linked_entity.application_number}"
            return "Visa Application"

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
        required=False,
        allow_null=True,
        help_text="User ID this task is assigned to (optional, mutually exclusive with branch_id)"
    )
    
    branch_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Branch ID this task is assigned to (optional, mutually exclusive with assigned_to)"
    )
    
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Tags for categorization"
    )

    # Generic entity linking (multi-tenant safe - uses model names)
    linked_entity_type = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Model name of the linked entity (e.g., 'client', 'visaapplication')"
    )
    linked_entity_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )

    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
    
    def validate(self, data):
        """Validate that assigned_to and branch_id are not both provided."""
        assigned_to = data.get('assigned_to')
        branch_id = data.get('branch_id')
        
        if assigned_to is not None and branch_id is not None:
            raise serializers.ValidationError("Task cannot be assigned to both a user and a branch.")
        
        return data


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

    # Generic entity linking (multi-tenant safe - uses model names)
    linked_entity_type = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Model name of the linked entity (e.g., 'client', 'visaapplication')"
    )
    linked_entity_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )

    assigned_to = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID this task is assigned to (optional, null to unassign, mutually exclusive with branch_id)"
    )
    
    branch_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Branch ID this task is assigned to (optional, null to unassign, mutually exclusive with assigned_to)"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
    
    def validate(self, data):
        """Validate that assigned_to and branch_id are not both provided."""
        assigned_to = data.get('assigned_to')
        branch_id = data.get('branch_id')
        
        if assigned_to is not None and branch_id is not None:
            raise serializers.ValidationError("Task cannot be assigned to both a user and a branch.")
        
        return data