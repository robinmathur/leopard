"""
Institute API views using service/selector pattern.

This module provides RESTful API endpoints for institute management with
role-based access control and proper separation of concerns.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from immigration.authentication import TenantJWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.institutes import (
    InstituteOutputSerializer,
    InstituteCreateSerializer,
    InstituteUpdateSerializer,
)
from immigration.selectors.institutes import institute_list, institute_get, deleted_institutes_list
from immigration.services.institutes import (
    institute_create,
    institute_update,
    institute_delete,
    institute_restore,
    InstituteCreateInput,
    InstituteUpdateInput
)
from immigration.institute import Institute


@extend_schema_view(
    list=extend_schema(
        summary="List all institutes",
        description="""
        Returns a paginated list of institutes filtered by user's role and scope.
        
        Query parameters allow additional filtering by name, search, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across name and short_name (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='name',
                type=str,
                description='Filter by name (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='short_name',
                type=str,
                description='Filter by short name (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='include_deleted',
                type=bool,
                description='Include soft-deleted institutes in the result set',
                required=False,
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Get institute by ID",
        description="Returns a single institute by ID with scope validation.",
    ),
    create=extend_schema(
        summary="Create new institute",
        description="Creates a new institute with validated input.",
    ),
    update=extend_schema(
        summary="Update institute",
        description="Full update of an institute (all fields required).",
    ),
    partial_update=extend_schema(
        summary="Partial update institute",
        description="Partial update of an institute (only provided fields updated).",
    ),
    destroy=extend_schema(
        summary="Delete institute",
        description="Soft delete an institute (sets deleted_at timestamp).",
    ),
)
class InstituteViewSet(ViewSet):
    """
    ViewSet for institute management.
    
    Provides CRUD operations with role-based access control.
    """
    
    authentication_classes = [TenantJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """
        List all institutes with role-based filtering.

        GET /api/v1/institutes/
        """
        # Extract filters from query params
        filters = {
            'search': request.query_params.get('search'),
            'name': request.query_params.get('name'),
            'short_name': request.query_params.get('short_name'),
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Check if user wants to include soft-deleted institutes
        include_deleted = str(
            request.query_params.get('include_deleted', 'false')
        ).lower() in ('true', '1', 'yes', 'on')

        # Get filtered institutes using selector
        institutes = institute_list(user=request.user, filters=filters, include_deleted=include_deleted)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(institutes, request)
        serializer = InstituteOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new institute.
        
        POST /api/v1/institutes/
        """
        # Validate input
        serializer = InstituteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = InstituteCreateInput(**serializer.validated_data)
            
            # Create institute using service
            institute = institute_create(data=input_data, user=request.user)
            
            # Return created institute
            output_serializer = InstituteOutputSerializer(institute)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a specific institute by ID.
        
        GET /api/v1/institutes/{id}/
        """
        try:
            # Get institute using selector (with scope validation)
            institute = institute_get(user=request.user, institute_id=pk)
            
            # Serialize and return
            serializer = InstituteOutputSerializer(institute)
            return Response(serializer.data)
        
        except Institute.DoesNotExist:
            return Response(
                {'detail': 'Institute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def update(self, request, pk=None):
        """
        Full update of an institute.
        
        PUT /api/v1/institutes/{id}/
        """
        try:
            # Get institute using selector
            institute = institute_get(user=request.user, institute_id=pk)
            
            # Validate input
            serializer = InstituteUpdateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model
            input_data = InstituteUpdateInput(**serializer.validated_data)
            
            # Update institute using service
            updated_institute = institute_update(institute=institute, data=input_data, user=request.user)
            
            # Return updated institute
            output_serializer = InstituteOutputSerializer(updated_institute)
            return Response(output_serializer.data)
        
        except Institute.DoesNotExist:
            return Response(
                {'detail': 'Institute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
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
    
    def partial_update(self, request, pk=None):
        """
        Partial update of an institute.
        
        PATCH /api/v1/institutes/{id}/
        """
        try:
            # Get institute using selector
            institute = institute_get(user=request.user, institute_id=pk)
            
            # Validate input (all fields optional for PATCH)
            serializer = InstituteUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model
            input_data = InstituteUpdateInput(**serializer.validated_data)
            
            # Update institute using service
            updated_institute = institute_update(institute=institute, data=input_data, user=request.user)
            
            # Return updated institute
            output_serializer = InstituteOutputSerializer(updated_institute)
            return Response(output_serializer.data)
        
        except Institute.DoesNotExist:
            return Response(
                {'detail': 'Institute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
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
    
    def destroy(self, request, pk=None):
        """
        Soft delete an institute.
        
        DELETE /api/v1/institutes/{id}/
        """
        try:
            # Get institute using selector
            institute = institute_get(user=request.user, institute_id=pk)
            
            # Delete using service (soft delete)
            institute_delete(institute=institute, user=request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except Institute.DoesNotExist:
            return Response(
                {'detail': 'Institute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=True, methods=['post'], url_path='restore')
    @extend_schema(
        summary="Restore soft-deleted institute",
        description="Restores a soft-deleted institute by clearing deleted_at timestamp.",
    )
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted institute.
        
        POST /api/v1/institutes/{id}/restore/
        """
        try:
            # Get institute (including deleted)
            institute = institute_get(user=request.user, institute_id=pk)
            
            # Restore using service
            restored_institute = institute_restore(institute=institute, user=request.user)
            
            # Return restored institute
            output_serializer = InstituteOutputSerializer(restored_institute)
            return Response(output_serializer.data)
        
        except Institute.DoesNotExist:
            return Response(
                {'detail': 'Institute not found'},
                status=status.HTTP_404_NOT_FOUND
            )
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
