"""
ClientActivity serializers for API layer.

These serializers handle JSON serialization/deserialization for timeline/activity endpoints.
ClientActivity is read-only (no create/update serializers needed).
"""

from rest_framework import serializers
from immigration.models import ClientActivity


class ClientActivityOutput(serializers.ModelSerializer):
    """
    Serializer for client activity output (GET requests).
    
    Returns timeline activity data including performer information.
    ClientActivity is immutable - no create/update operations.
    """
    
    # Computed fields for better UX
    performed_by_name = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(
        source='get_activity_type_display',
        read_only=True
    )
    
    class Meta:
        model = ClientActivity
        fields = [
            'id',
            'client',
            'activity_type',
            'activity_type_display',
            'performed_by',
            'performed_by_name',
            'description',
            'metadata',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'client',
            'activity_type',
            'activity_type_display',
            'performed_by',
            'performed_by_name',
            'description',
            'metadata',
            'created_at',
        ]  # All fields are read-only
    
    def get_performed_by_name(self, obj):
        """Get performer's full name if exists."""
        if obj.performed_by:
            return f"{obj.performed_by.first_name} {obj.performed_by.last_name}".strip() or obj.performed_by.username
        return None
