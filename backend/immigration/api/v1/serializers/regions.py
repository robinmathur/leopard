"""
Region serializers for API layer.

These serializers handle JSON serialization/deserialization for region endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from immigration.models.region import Region


class RegionOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for region output (GET requests).
    
    Returns complete region data including branch count.
    """
    
    branch_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Region
        fields = [
            'id',
            'name',
            'description',
            'branch_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]
    
    def get_branch_count(self, obj):
        """Get count of branches in this region."""
        return obj.branches.count()


class RegionCreateSerializer(serializers.Serializer):
    """
    Serializer for region creation (POST requests).
    
    Validates input and passes to region_create service.
    """
    
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class RegionUpdateSerializer(serializers.Serializer):
    """
    Serializer for region updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    name = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True, max_length=1000)

