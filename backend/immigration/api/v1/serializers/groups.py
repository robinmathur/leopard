"""
Group serializers for Django Groups management.
"""

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.contrib.auth.models import Group, Permission


class PermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for Permission (read-only).
    Permissions are managed by Django, not created/updated via API.
    """
    
    content_type_display = serializers.SerializerMethodField()
    content_type = serializers.SerializerMethodField()
    
    class Meta:
        model = Permission
        fields = [
            'id',
            'name',
            'codename',
            'content_type',
            'content_type_display',
        ]
        read_only_fields = ['id', 'name', 'codename']
    
    @extend_schema_field(serializers.CharField())
    def get_content_type(self, obj):
        """Get content type as string format (app_label.model)."""
        return f"{obj.content_type.app_label}.{obj.content_type.model}"
    
    @extend_schema_field(serializers.CharField())
    def get_content_type_display(self, obj):
        """Get human-readable content type name."""
        return f"{obj.content_type.app_label}.{obj.content_type.model}"


class GroupOutputSerializer(serializers.ModelSerializer):
    """
    Serializer for Group output (GET requests).
    Includes permissions list.
    """
    
    permissions_list = serializers.SerializerMethodField()
    permissions_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Group
        fields = [
            'id',
            'name',
            'permissions_list',
            'permissions_count',
            'users_count',
        ]
        read_only_fields = ['id']
    
    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_permissions_list(self, obj):
        """Get all permissions for this group."""
        permissions = obj.permissions.all().select_related('content_type')
        return [
            {
                'id': perm.id,
                'name': perm.name,
                'codename': perm.codename,
                'content_type': f"{perm.content_type.app_label}.{perm.content_type.model}",
            }
            for perm in permissions
        ]
    
    @extend_schema_field(serializers.IntegerField())
    def get_permissions_count(self, obj):
        """Get count of permissions."""
        return obj.permissions.count()
    
    @extend_schema_field(serializers.IntegerField())
    def get_users_count(self, obj):
        """Get count of users in this group."""
        return obj.user_set.count()


class GroupCreateSerializer(serializers.Serializer):
    """
    Serializer for Group creation (POST requests).
    """
    
    name = serializers.CharField(min_length=1, max_length=150)
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        default=list,
    )


class GroupUpdateSerializer(serializers.Serializer):
    """
    Serializer for Group updates (PUT/PATCH requests).
    """
    
    name = serializers.CharField(min_length=1, max_length=150, required=False)
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )


class UserPermissionAssignmentSerializer(serializers.Serializer):
    """
    Serializer for assigning permissions directly to a user.
    """
    
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False,
    )

