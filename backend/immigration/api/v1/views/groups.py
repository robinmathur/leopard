"""
Group and Permission API views.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view
from django.contrib.auth.models import Group, Permission
from django.contrib.auth import get_user_model

from immigration.api.v1.permissions import RoleBasedPermission
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.groups import (
    GroupOutputSerializer,
    GroupCreateSerializer,
    GroupUpdateSerializer,
    PermissionSerializer,
    UserPermissionAssignmentSerializer,
)

User = get_user_model()


class CanManageGroups(RoleBasedPermission):
    """Permission for group management. Requires 'auth.change_group' permission."""
    required_permission = 'auth.change_group'


class CanManagePermissions(RoleBasedPermission):
    """Permission for permission management. Requires 'auth.change_permission' permission."""
    required_permission = 'auth.change_permission'


@extend_schema_view(
    list=extend_schema(
        summary="List all groups",
        description="Returns a paginated list of all Django Groups with their permissions and user counts.",
        tags=['groups'],
    ),
    create=extend_schema(
        summary="Create a new group",
        description="Creates a new Django Group with optional permissions.",
        request=GroupCreateSerializer,
        responses={
            201: GroupOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
        },
        tags=['groups'],
    ),
    retrieve=extend_schema(
        summary="Get group details",
        description="Retrieve details of a specific group by ID.",
        responses={
            200: GroupOutputSerializer,
            404: {'description': 'Not Found'},
        },
        tags=['groups'],
    ),
    update=extend_schema(
        summary="Update group (full update)",
        description="Update all fields of a group.",
        request=GroupUpdateSerializer,
        responses={
            200: GroupOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            404: {'description': 'Not Found'},
        },
        tags=['groups'],
    ),
    partial_update=extend_schema(
        summary="Partial update group",
        description="Update specific fields of a group.",
        request=GroupUpdateSerializer,
        responses={
            200: GroupOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            404: {'description': 'Not Found'},
        },
        tags=['groups'],
    ),
    destroy=extend_schema(
        summary="Delete group",
        description="Delete a Django Group.",
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            404: {'description': 'Not Found'},
        },
        tags=['groups'],
    ),
)
class GroupViewSet(ViewSet):
    """
    ViewSet for Django Group management.
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, CanManageGroups]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """
        List all groups.
        GET /api/v1/groups/
        """
        groups = Group.objects.prefetch_related('permissions', 'user_set').all()
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(groups, request)
        serializer = GroupOutputSerializer(page, many=True)
        
        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new group.
        POST /api/v1/groups/
        """
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create group
        group = Group.objects.create(name=serializer.validated_data['name'])
        
        # Assign permissions if provided
        permission_ids = serializer.validated_data.get('permission_ids', [])
        if permission_ids:
            permissions = Permission.objects.filter(id__in=permission_ids)
            group.permissions.set(permissions)
        
        output_serializer = GroupOutputSerializer(group)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, pk=None):
        """
        Get group details.
        GET /api/v1/groups/{id}/
        """
        try:
            group = Group.objects.prefetch_related('permissions', 'user_set').get(pk=pk)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GroupOutputSerializer(group)
        return Response(serializer.data)
    
    def update(self, request, pk=None):
        """
        Update group (full update).
        PUT /api/v1/groups/{id}/
        """
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = GroupUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update name if provided
        if 'name' in serializer.validated_data:
            group.name = serializer.validated_data['name']
            group.save()
        
        # Update permissions if provided
        if 'permission_ids' in serializer.validated_data:
            permission_ids = serializer.validated_data['permission_ids']
            permissions = Permission.objects.filter(id__in=permission_ids)
            group.permissions.set(permissions)
        
        output_serializer = GroupOutputSerializer(group)
        return Response(output_serializer.data)
    
    def partial_update(self, request, pk=None):
        """
        Partial update group.
        PATCH /api/v1/groups/{id}/
        """
        return self.update(request, pk)
    
    def destroy(self, request, pk=None):
        """
        Delete group.
        DELETE /api/v1/groups/{id}/
        """
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        group.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @extend_schema(
        summary="Assign permissions to group",
        description="Assign permissions to a group. Replaces existing permissions.",
        request=UserPermissionAssignmentSerializer,
        responses={
            200: GroupOutputSerializer,
            404: {'description': 'Not Found'},
        },
        tags=['groups'],
    )
    @action(detail=True, methods=['post'], url_path='assign-permissions')
    def assign_permissions(self, request, pk=None):
        """
        Assign permissions to a group.
        POST /api/v1/groups/{id}/assign-permissions/
        """
        try:
            group = Group.objects.get(pk=pk)
        except Group.DoesNotExist:
            return Response(
                {'detail': 'Group not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = UserPermissionAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        permission_ids = serializer.validated_data['permission_ids']
        permissions = Permission.objects.filter(id__in=permission_ids)
        group.permissions.set(permissions)
        
        output_serializer = GroupOutputSerializer(group)
        return Response(output_serializer.data)


@extend_schema_view(
    list=extend_schema(
        summary="List all permissions",
        description="Returns a paginated list of all Django Permissions. Permissions are read-only.",
        tags=['permissions'],
    ),
    retrieve=extend_schema(
        summary="Get permission details",
        description="Retrieve details of a specific permission by ID.",
        responses={
            200: PermissionSerializer,
            404: {'description': 'Not Found'},
        },
        tags=['permissions'],
    ),
)
class PermissionViewSet(ViewSet):
    """
    ViewSet for Django Permission management (read-only).
    Permissions are managed by Django, not created/updated via API.
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """
        List all permissions.
        GET /api/v1/permissions/
        """
        # Exclude admin-related permissions
        excluded_apps = ['admin', 'contenttypes', 'sessions', 'token_blacklist']
        permissions = Permission.objects.select_related('content_type').exclude(
            content_type__app_label__in=excluded_apps
        )
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(permissions, request)
        serializer = PermissionSerializer(page, many=True)
        
        return paginator.get_paginated_response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """
        Get permission details.
        GET /api/v1/permissions/{id}/
        """
        try:
            permission = Permission.objects.select_related('content_type').get(pk=pk)
        except Permission.DoesNotExist:
            return Response(
                {'detail': 'Permission not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = PermissionSerializer(permission)
        return Response(serializer.data)

