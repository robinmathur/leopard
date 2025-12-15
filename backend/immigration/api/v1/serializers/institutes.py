"""
Institute serializers for API layer.

These serializers handle JSON serialization/deserialization for institute endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from immigration.institute import Institute


class InstituteOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for institute output (GET requests).
    
    Returns complete institute data including related objects.
    """
    
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Institute
        fields = [
            'id',
            'name',
            'short_name',
            'phone',
            'website',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_by',
            'updated_by_name',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
            'deleted_at',
        ]
    
    def get_created_by_name(self, obj):
        """Get creator name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_updated_by_name(self, obj):
        """Get updater name if exists."""
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}"
        return None


class InstituteCreateSerializer(serializers.Serializer):
    """
    Serializer for institute creation (POST requests).
    
    Validates input and passes to institute_create service.
    """
    
    name = serializers.CharField(max_length=100, required=True)
    short_name = serializers.CharField(max_length=20, required=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    website = serializers.CharField(max_length=100, required=False, allow_blank=True)


class InstituteUpdateSerializer(serializers.Serializer):
    """
    Serializer for institute updates (PATCH/PUT requests).
    
    All fields are optional for partial updates.
    """
    
    name = serializers.CharField(max_length=100, required=False)
    short_name = serializers.CharField(max_length=20, required=False)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    website = serializers.CharField(max_length=100, required=False, allow_blank=True)
