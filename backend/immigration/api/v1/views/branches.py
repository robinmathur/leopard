"""
Branch ViewSet for CRUD operations.

This ViewSet provides full CRUD functionality for branches with role-based access control.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from drf_spectacular.utils import extend_schema_view, extend_schema, OpenApiParameter

from immigration.models.branch import Branch
from immigration.api.v1.serializers.branches import (
    BranchOutputSerializer,
    BranchCreateSerializer,
    BranchUpdateSerializer,
)
from immigration.api.v1.permissions import CanManageBranches
from immigration.authentication import TenantJWTAuthentication
from immigration.pagination import StandardResultsSetPagination
from immigration.selectors.branches import branch_list, branch_get
from immigration.services.branches import (
    branch_create,
    branch_update,
    branch_delete,
    branch_restore,
    BranchCreateInput,
    BranchUpdateInput,
)


@extend_schema_view(
    list=extend_schema(
        summary="List all branches",
        description="""
        Returns a paginated list of branches filtered by user's role and scope.
        
        Role-based filtering:
        - Consultant/Branch Admin: Only branches they are assigned to
        - Region Manager: All branches within their assigned regions
        - Super Admin: All branches in their tenant
        - Super Super Admin: System-wide access
        
        Query parameters allow additional filtering by name, region, search, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across name, phone, website, suburb, and state (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='name',
                type=str,
                description='Filter by name (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='region_id',
                type=int,
                description='Filter by region ID',
                required=False,
            ),
            OpenApiParameter(
                name='phone',
                type=str,
                description='Filter by phone (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='country',
                type=str,
                description='Filter by country code (2-letter ISO code)',
                required=False,
            ),
            OpenApiParameter(
                name='state',
                type=str,
                description='Filter by state (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='include_deleted',
                type=bool,
                description='Include soft-deleted branches in the result set',
                required=False,
            ),
        ],
        responses={
            200: BranchOutputSerializer(many=True),
            401: {'description': 'Unauthorized - Invalid or missing authentication'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['branches'],
    ),
    create=extend_schema(
        summary="Create a new branch",
        description="""
        Creates a new branch with proper scope validation.
        
        Business rules:
        - Created_by is automatically set to the requesting user
        - Branch name must be unique within current tenant schema
        - Region must belong to current tenant (enforced by schema)
        """,
        request=BranchCreateSerializer,
        responses={
            201: BranchOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['branches'],
    ),
    retrieve=extend_schema(
        summary="Get branch details",
        description="Retrieve details of a specific branch by ID. User must have access to this branch based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Branch ID',
                required=True,
            ),
        ],
        responses={
            200: BranchOutputSerializer,
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this branch'},
            404: {'description': 'Not Found - Branch does not exist'},
        },
        tags=['branches'],
    ),
    update=extend_schema(
        summary="Update branch (full update)",
        description="Update all fields of a branch. User must have access to this branch based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Branch ID',
                required=True,
            ),
        ],
        request=BranchUpdateSerializer,
        responses={
            200: BranchOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['branches'],
    ),
    partial_update=extend_schema(
        summary="Partial update branch",
        description="Update specific fields of a branch. Only provided fields are updated.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Branch ID',
                required=True,
            ),
        ],
        request=BranchUpdateSerializer,
        responses={
            200: BranchOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['branches'],
    ),
    destroy=extend_schema(
        summary="Delete branch (soft delete)",
        description="Soft delete a branch. Sets deleted_at timestamp without removing from database.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Branch ID',
                required=True,
            ),
        ],
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this branch'},
            404: {'description': 'Not Found'},
        },
        tags=['branches'],
    ),
    restore=extend_schema(
        summary="Restore soft-deleted branch",
        description="Restore a previously soft-deleted branch. Only administrators can restore branches.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Branch ID',
                required=True,
            ),
        ],
        responses={
            200: BranchOutputSerializer,
            400: {'description': 'Bad Request - Branch is not soft-deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found - Branch does not exist or not soft-deleted'},
        },
        tags=['branches'],
    ),
)
class BranchViewSet(ViewSet):
    """
    ViewSet for branch management using service/selector pattern.

    This ViewSet delegates business logic to services (write operations)
    and selectors (read operations), keeping views thin.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageBranches]
    pagination_class = StandardResultsSetPagination
    queryset = Branch.objects.none()  # For drf-spectacular schema generation
    
    def list(self, request):
        """
        List all branches with role-based filtering.

        GET /api/v1/branches/
        """
        # Extract filters from query params
        filters = {
            'search': request.query_params.get('search'),
            'name': request.query_params.get('name'),
            'region_id': request.query_params.get('region_id'),
            'phone': request.query_params.get('phone'),
            'country': request.query_params.get('country'),
            'state': request.query_params.get('state'),
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Check if user wants to include soft-deleted branches
        include_deleted = str(
            request.query_params.get('include_deleted', 'false')
        ).lower() in ('true', '1', 'yes', 'on')

        # Get filtered branches using selector
        branches = branch_list(user=request.user, filters=filters, include_deleted=include_deleted)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(branches, request)
        serializer = BranchOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new branch.
        
        POST /api/v1/branches/
        """
        # Validate input
        serializer = BranchCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = BranchCreateInput(**serializer.validated_data)
            
            # Create branch using service
            branch = branch_create(data=input_data, user=request.user)
            
            # Return created branch
            output_serializer = BranchOutputSerializer(branch)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a specific branch by ID.
        
        GET /api/v1/branches/{id}/
        """
        try:
            # Get branch using selector
            branch = branch_get(user=request.user, branch_id=pk)
            
            if not branch:
                return Response(
                    {'detail': 'Branch not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Serialize and return
            serializer = BranchOutputSerializer(branch)
            return Response(serializer.data)
        
        except Branch.DoesNotExist:
            return Response(
                {'detail': 'Branch not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """
        Full update of a branch.
        
        PUT /api/v1/branches/{id}/
        """
        return self._update_branch(request, pk, partial=False)
    
    def partial_update(self, request, pk=None):
        """
        Partial update of a branch.
        
        PATCH /api/v1/branches/{id}/
        """
        return self._update_branch(request, pk, partial=True)
    
    def _update_branch(self, request, pk, partial=False):
        """
        Internal method to handle both full and partial updates.
        """
        try:
            # Get branch using selector
            branch = branch_get(user=request.user, branch_id=pk)
            
            if not branch:
                return Response(
                    {'detail': 'Branch not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate input
            serializer = BranchUpdateSerializer(data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model for service
            input_data = BranchUpdateInput(**serializer.validated_data)
            
            # Update branch using service
            updated_branch = branch_update(
                branch=branch,
                data=input_data,
                user=request.user
            )
            
            # Return updated branch
            output_serializer = BranchOutputSerializer(updated_branch)
            return Response(output_serializer.data)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Branch.DoesNotExist:
            return Response(
                {'detail': 'Branch not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """
        Soft delete a branch.
        
        DELETE /api/v1/branches/{id}/
        """
        try:
            # Get branch using selector
            branch = branch_get(user=request.user, branch_id=pk)
            
            if not branch:
                return Response(
                    {'detail': 'Branch not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Delete branch using service
            branch_delete(branch=branch, user=request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except Branch.DoesNotExist:
            return Response(
                {'detail': 'Branch not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted branch.
        
        POST /api/v1/branches/{id}/restore/
        """
        try:
            # Get branch using selector (including deleted)
            branch = branch_get(user=request.user, branch_id=pk, include_deleted=True)
            
            if not branch:
                return Response(
                    {'detail': 'Branch not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Restore branch using service
            restored_branch = branch_restore(branch=branch, user=request.user)
            
            # Return restored branch
            output_serializer = BranchOutputSerializer(restored_branch)
            return Response(output_serializer.data)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Branch.DoesNotExist:
            return Response(
                {'detail': 'Branch not found'},
                status=status.HTTP_404_NOT_FOUND
            )

