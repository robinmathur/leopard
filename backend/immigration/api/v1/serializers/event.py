"""
CalendarEvent serializers for API layer.

These serializers handle JSON serialization/deserialization for calendar event endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models import CalendarEvent


class EventOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for calendar event output (GET requests).

    Returns complete event data including computed fields.
    """

    assigned_to_name = serializers.CharField(
        source='assigned_to.username',
        read_only=True,
        allow_null=True
    )

    assigned_to_full_name = serializers.SerializerMethodField()

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

    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    # Computed fields
    duration_minutes = serializers.SerializerMethodField()
    is_past = serializers.BooleanField(read_only=True)
    is_ongoing = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id',
            'title',
            'description',
            'start',
            'end',
            'duration',
            'duration_minutes',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_full_name',
            'hex_color',
            'location',
            'all_day',
            'branch',
            'branch_id',
            'branch_name',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_by',
            'updated_by_name',
            'updated_at',
            'is_past',
            'is_ongoing',
            'is_upcoming',
        ]
        read_only_fields = [
            'id',
            'duration',
            'created_at',
            'updated_at',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assigned_to_full_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip() or obj.assigned_to.username
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.username
        return None

    @extend_schema_field(serializers.IntegerField())
    def get_duration_minutes(self, obj):
        return obj.duration_minutes


class EventCreateSerializer(serializers.Serializer):
    """
    Serializer for creating calendar events (POST requests).
    """

    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    hex_color = serializers.RegexField(
        regex=r'^#?[0-9A-Fa-f]{6}$',
        required=False,
        default='#3788d8',
        help_text='Hex color code (e.g., #FF5733 or FF5733)'
    )
    location = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    all_day = serializers.BooleanField(required=False, default=False)
    branch_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        """Validate that end is after start."""
        if data.get('end') and data.get('start'):
            if data['end'] <= data['start']:
                raise serializers.ValidationError({
                    'end': 'Event end time must be after start time.'
                })
        return data


class EventUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating calendar events (PUT/PATCH requests).
    """

    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    start = serializers.DateTimeField(required=False)
    end = serializers.DateTimeField(required=False)
    assigned_to_id = serializers.IntegerField(required=False, allow_null=True)
    hex_color = serializers.RegexField(
        regex=r'^#?[0-9A-Fa-f]{6}$',
        required=False,
        help_text='Hex color code (e.g., #FF5733 or FF5733)'
    )
    location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    all_day = serializers.BooleanField(required=False)

    def validate(self, data):
        """Validate that end is after start if both are provided."""
        if 'end' in data and 'start' in data:
            if data['end'] <= data['start']:
                raise serializers.ValidationError({
                    'end': 'Event end time must be after start time.'
                })
        return data
