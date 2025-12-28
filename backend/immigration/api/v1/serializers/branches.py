"""
Branch serializers for API layer.

These serializers handle JSON serialization/deserialization for branch endpoints.
They are thin wrappers - business logic lives in services.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from immigration.models.branch import Branch


class BranchOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for branch output (GET requests).
    
    Returns complete branch data including related objects.
    """
    
    region_name = serializers.CharField(
        source='region.name', 
        read_only=True,
        allow_null=True
    )
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Branch
        fields = [
            'id',
            'name',
            'region',
            'region_name',
            'phone',
            'website',
            'street',
            'suburb',
            'state',
            'postcode',
            'country',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_by',
            'updated_at',
        ]
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_created_by_name(self, obj):
        """Get creator name if exists."""
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return None
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_updated_by_name(self, obj):
        """Get updater name if exists."""
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.username
        return None


class BranchCreateSerializer(serializers.Serializer):
    """
    Serializer for branch creation (POST requests).
    
    Validates input and passes to branch_create service.
    """
    
    name = serializers.CharField(max_length=100)
    region_id = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    website = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Address fields
    street = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)


class BranchUpdateSerializer(serializers.Serializer):
    """
    Serializer for branch updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    """
    
    name = serializers.CharField(max_length=100, required=False)
    region_id = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    website = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Address fields
    street = serializers.CharField(max_length=100, required=False, allow_blank=True)
    suburb = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)

