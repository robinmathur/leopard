"""
User serializers - SIMPLIFIED to use Django Groups only.

No role field - uses group_name instead.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.contrib.auth import get_user_model
from immigration.constants import ALL_GROUPS

User = get_user_model()


class UserOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for user output (GET requests).
    
    Returns complete user data including related objects.
    No role field - uses groups instead.
    """
    
    full_name = serializers.SerializerMethodField(read_only=True)
    groups_list = serializers.SerializerMethodField(read_only=True)
    primary_group = serializers.SerializerMethodField(read_only=True)
    
    # Multiple branches and regions
    branches_data = serializers.SerializerMethodField(read_only=True)
    regions_data = serializers.SerializerMethodField(read_only=True)
    
    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        """Get user's full name."""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.username
    
    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_groups_list(self, obj):
        """Get all groups user belongs to."""
        return [g.name for g in obj.groups.all()]
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_primary_group(self, obj):
        """Get the user's primary group."""
        primary = obj.get_primary_group()
        return primary.name if primary else None
    
    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_branches_data(self, obj):
        """Get all branches."""
        return [{'id': b.id, 'name': b.name} for b in obj.branches.all()]
    
    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_regions_data(self, obj):
        """Get all regions."""
        return [{'id': r.id, 'name': r.name} for r in obj.regions.all()]
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'groups_list',
            'primary_group',
            'branches_data',
            'regions_data',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
        ]
        read_only_fields = [
            'id',
            'date_joined',
            'last_login',
        ]


class UserCreateSerializer(serializers.Serializer):
    """
    Serializer for user creation (POST requests).
    
    Uses group_name instead of role.
    """
    
    username = serializers.CharField(min_length=3, max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(min_length=1, max_length=150)
    last_name = serializers.CharField(min_length=1, max_length=150)
    
    # Group and scope
    group_name = serializers.ChoiceField(choices=ALL_GROUPS)
    
    # Multiple branches
    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        allow_empty=True
    )
    
    # Multiple regions
    region_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        allow_empty=True
    )
    
    # Optional fields
    is_active = serializers.BooleanField(default=True)


class UserUpdateSerializer(serializers.Serializer):
    """
    Serializer for user updates (PUT/PATCH requests).
    
    All fields optional - only provided fields are updated.
    Uses group_name instead of role.
    """
    
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(min_length=1, max_length=150, required=False)
    last_name = serializers.CharField(min_length=1, max_length=150, required=False)
    password = serializers.CharField(min_length=8, write_only=True, required=False)
    
    # Group and scope
    group_name = serializers.ChoiceField(choices=ALL_GROUPS, required=False)
    
    # Multiple branches
    branch_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        allow_empty=True
    )
    
    # Multiple regions
    region_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_null=True,
        allow_empty=True
    )
    
    is_active = serializers.BooleanField(required=False)
