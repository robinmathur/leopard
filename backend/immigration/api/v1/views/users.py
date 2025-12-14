"""
User API views using service/selector pattern with hierarchical validation.

This module provides RESTful API endpoints for user management with
strict role hierarchy enforcement.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from django.contrib.auth import get_user_model

from immigration.api.v1.permissions import CanCreateUsers
from immigration.pagination import StandardResultsSetPagination
from immigration.constants import ALL_GROUPS
from immigration.api.v1.serializers.users import (
    UserOutputSerializer,
    UserCreateSerializer,
    UserUpdateSerializer
)
from immigration.selectors.users import user_list, user_get
from immigration.services.users import (
    user_create,
    user_update,
    UserCreateInput,
    UserUpdateInput
)

User = get_user_model()


@extend_schema_view(
    list=extend_schema(
        summary="List all users",
        description="""
        Returns a paginated list of users filtered by requesting user's role and scope.
        
        Role-based filtering:
        - Super Super Admin: All users across all tenants
        - Super Admin/Country Manager: All users in their tenant
        - Region Manager: Users in branches within their region
        - Branch Admin: Only users in their branch
        - Consultant: No access (403 Forbidden)
        
        Query parameters allow filtering by role, email, branch, region, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across first name, last name, email, and username (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='group',
                type=str,
                description='Filter by user group',
                required=False,
                enum=ALL_GROUPS,
            ),
            OpenApiParameter(
                name='email',
                type=str,
                description='Filter by email (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='branch_id',
                type=int,
                description='Filter by branch ID',
                required=False,
            ),
            OpenApiParameter(
                name='is_active',
                type=bool,
                description='Filter by active status',
                required=False,
            ),
        ],
        responses={
            200: UserOutputSerializer(many=True),
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Consultants cannot list users'},
        },
        tags=['users'],
    ),
    create=extend_schema(
        summary="Create a new user",
        description="""
        Creates a new user with strict hierarchical validation.
        
        Role Hierarchy Rules:
        - Super Super Admin → Can create any role
        - Super Admin → Can create Country Manager and below
        - Country Manager → Can create Region Manager and below
        - Region Manager → Can create Branch Admin and below
        - Branch Admin → Can only create Consultant
        - Consultant → Cannot create users (403 Forbidden)
        
        Scope Rules:
        - Branch Admin: Can only create users in their branch (auto-assigned)
        - Region Manager: Can only create users in their region
        - Country Manager/Super Admin: Can only create users in their tenant
        
        The creator's scope is automatically inherited by the new user.
        """,
        request=UserCreateSerializer,
        responses={
            201: UserOutputSerializer,
            400: {'description': 'Bad Request - Validation errors or duplicate username/email'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Cannot create user at this role level or scope violation'},
        },
        tags=['users'],
    ),
    retrieve=extend_schema(
        summary="Get user details",
        description="Retrieve details of a specific user by ID. Requesting user must have access based on their role and scope.",
        responses={
            200: UserOutputSerializer,
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this user'},
            404: {'description': 'Not Found'},
        },
        tags=['users'],
    ),
    partial_update=extend_schema(
        summary="Update user",
        description="""
        Update specific fields of a user. Only provided fields are updated.
        
        Role Change Rules:
        - Must follow same hierarchy rules as creation
        - Cannot change own role
        - Role changes require authorization for the target role
        
        Scope changes are validated against updater's permissions.
        """,
        request=UserUpdateSerializer,
        responses={
            200: UserOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Cannot update this user or assign this role'},
            404: {'description': 'Not Found'},
        },
        tags=['users'],
    ),
)
class UserViewSet(ViewSet):
    """
    ViewSet for user management using service/selector pattern.

    Enforces strict role hierarchy for all operations.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [CanCreateUsers]
    pagination_class = StandardResultsSetPagination
    
    def get_permissions(self):
        """
        Override to allow all authenticated users to access profile endpoint.
        """
        if self.action == 'profile':
            # Allow any authenticated user to view their own profile and permissions
            return [IsAuthenticated()]
        # For all other actions, use the default CanCreateUsers permission
        return super().get_permissions()
    
    def list(self, request):
        """
        List all users with role-based filtering.

        GET /api/v1/users/
        """
        # Get filtered users using selector
        search = request.query_params.get('search')
        users = user_list(user=request.user, search=search)
        
        # Apply query param filters
        role = request.query_params.get('role')
        if role:
            users = users.filter(role=role)
        
        email = request.query_params.get('email')
        if email:
            users = users.filter(email__icontains=email)
        
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            users = users.filter(branch_id=branch_id)
        
        region_id = request.query_params.get('region_id')
        if region_id:
            users = users.filter(region_id=region_id)
        
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            users = users.filter(is_active=is_active.lower() == 'true')

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(users, request)
        serializer = UserOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new user with hierarchical validation.
        
        POST /api/v1/users/
        """
        # Validate input
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = UserCreateInput(**serializer.validated_data)
            
            # Create user using service
            user = user_create(data=input_data, created_by=request.user)
            
            # Return created user
            output_serializer = UserOutputSerializer(user)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a specific user by ID.
        
        GET /api/v1/users/{id}/
        """
        # Get user using selector (with scope validation)
        target_user = user_get(user_id=int(pk), requesting_user=request.user)
        
        if target_user is None:
            return Response(
                {'detail': 'User not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize and return
        serializer = UserOutputSerializer(target_user)
        return Response(serializer.data)
    
    def partial_update(self, request, pk=None):
        """
        Partial update of a user.
        
        PATCH /api/v1/users/{id}/
        """
        try:
            # Validate input
            serializer = UserUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model for service
            input_data = UserUpdateInput(**serializer.validated_data)
            
            # Update user using service (includes scope validation)
            updated_user = user_update(
                user_id=int(pk),
                data=input_data,
                updated_by=request.user
            )
            
            # Return updated user
            output_serializer = UserOutputSerializer(updated_user)
            return Response(output_serializer.data)
        
        except ValueError as e:
            # ValueError from service includes "not found" cases
            if "does not exist" in str(e):
                return Response(
                    {'detail': str(e)},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get current user profile and permissions",
        description="""
        Returns the authenticated user's basic information along with all their permissions.
        
        This endpoint combines user profile data and permissions in a single response,
        eliminating the need for frontend to make separate API calls.
        
        User information includes:
        - Basic profile: id, username, email, first_name, last_name
        - Role/Group information: primary_group, groups_list
        - Tenant and scope: tenant, tenant_name, branches_data, regions_data
        - Status: is_active
        
        Permissions include:
        - Direct permissions assigned to the user
        - Permissions inherited from role-based groups
        
        Each permission includes:
        - Permission codename
        - Permission name (human-readable)
        - Content type (app_label.model)
        """,
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'id': {'type': 'integer'},
                    'username': {'type': 'string'},
                    'email': {'type': 'string'},
                    'first_name': {'type': 'string'},
                    'last_name': {'type': 'string'},
                    'primary_group': {'type': 'string', 'nullable': True},
                    'groups_list': {
                        'type': 'array',
                        'items': {'type': 'string'}
                    },
                    'tenant': {'type': 'integer', 'nullable': True},
                    'tenant_name': {'type': 'string', 'nullable': True},
                    'branches_data': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'name': {'type': 'string'}
                            }
                        }
                    },
                    'regions_data': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer'},
                                'name': {'type': 'string'}
                            }
                        }
                    },
                    'is_active': {'type': 'boolean'},
                    'permissions': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'codename': {'type': 'string'},
                                'name': {'type': 'string'},
                                'content_type': {'type': 'string'},
                            }
                        }
                    },
                }
            },
            401: {'description': 'Unauthorized'},
        },
        tags=['users'],
    )
    @action(detail=False, methods=['get'], url_path='profile')
    def profile(self, request):
        """
        Get current user profile and permissions.
        
        GET /api/v1/users/profile/
        
        Returns user basic information along with all permissions in a single response.
        """
        user = request.user
        
        # Get user basic information using UserOutputSerializer
        user_serializer = UserOutputSerializer(user)
        user_data = user_serializer.data
        
        # Get all permissions (direct + group permissions)
        from django.contrib.auth.models import Permission
        
        # Get user's direct permissions
        user_perms = user.user_permissions.all()
        
        # Get permissions from groups
        group_perms = Permission.objects.filter(group__user=user)
        
        # Combine and get distinct permissions
        all_permissions = (user_perms | group_perms).distinct().select_related('content_type')
        
        # Format permissions
        permissions_data = [
            {
                'codename': perm.codename,
                'name': perm.name,
                'content_type': f'{perm.content_type.app_label}.{perm.content_type.model}',
            }
            for perm in all_permissions
        ]
        
        # Add permissions to user data
        user_data['permissions'] = permissions_data
        
        return Response(user_data)
