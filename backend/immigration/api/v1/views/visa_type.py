"""
Visa type API views using service/selector pattern.

This module provides RESTful API endpoints for visa type management.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from immigration.authentication import TenantJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.visa_type import (
    VisaTypeOutputSerializer,
    VisaTypeCreateSerializer,
    VisaTypeUpdateSerializer,
    VisaCategoryOutputSerializer,
)
from immigration.selectors.visa_types import (
    visa_type_list,
    visa_type_get,
    visa_category_list,
)
from immigration.services.visa_types import (
    visa_type_create,
    visa_type_update,
    visa_type_delete,
    VisaTypeCreateInput,
    VisaTypeUpdateInput,
)
from immigration.models.visa import VisaType


@extend_schema_view(
    list=extend_schema(
        summary="List all visa types",
        description="Returns all visa types with optional filtering.",
        parameters=[
            OpenApiParameter(
                name='visa_category_id',
                type=int,
                description='Filter by visa category ID',
                required=False,
            ),
            OpenApiParameter(
                name='search',
                type=str,
                description='Search by name or code',
                required=False,
            ),
        ],
        responses={200: VisaTypeOutputSerializer(many=True)},
        tags=['visa-types'],
    ),
    create=extend_schema(
        summary="Create a new visa type",
        description="Creates a visa type with validation.",
        request=VisaTypeCreateSerializer,
        responses={201: VisaTypeOutputSerializer},
        tags=['visa-types'],
    ),
    retrieve=extend_schema(
        summary="Get visa type details",
        description="Retrieve a specific visa type by ID.",
        responses={200: VisaTypeOutputSerializer},
        tags=['visa-types'],
    ),
    partial_update=extend_schema(
        summary="Update visa type",
        description="Update specific fields of a visa type.",
        request=VisaTypeUpdateSerializer,
        responses={200: VisaTypeOutputSerializer},
        tags=['visa-types'],
    ),
    destroy=extend_schema(
        summary="Delete visa type",
        description="Delete a visa type if it has no associated applications.",
        responses={204: None},
        tags=['visa-types'],
    ),
)
class VisaTypeViewSet(ViewSet):
    """ViewSet for visa type management using service/selector pattern."""

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """List all visa types with optional filtering."""
        filters = {
            'visa_category_id': request.query_params.get('visa_category_id'),
            'search': request.query_params.get('search'),
        }
        filters = {k: v for k, v in filters.items() if v is not None}

        visa_types = visa_type_list(filters=filters)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(visa_types, request)
        serializer = VisaTypeOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """Create a new visa type."""
        serializer = VisaTypeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            input_data = VisaTypeCreateInput(**serializer.validated_data)
            visa_type = visa_type_create(data=input_data, user=request.user)
            
            output_serializer = VisaTypeOutputSerializer(visa_type)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN if isinstance(e, PermissionError) else status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """Get a specific visa type by ID."""
        try:
            visa_type = visa_type_get(visa_type_id=pk)
            serializer = VisaTypeOutputSerializer(visa_type)
            return Response(serializer.data)
        
        except VisaType.DoesNotExist:
            return Response({'detail': 'Visa type not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def partial_update(self, request, pk=None):
        """Partial update of a visa type."""
        try:
            visa_type = visa_type_get(visa_type_id=pk)
            
            serializer = VisaTypeUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            input_data = VisaTypeUpdateInput(**serializer.validated_data)
            updated_visa_type = visa_type_update(
                visa_type=visa_type,
                data=input_data,
                user=request.user
            )
            
            output_serializer = VisaTypeOutputSerializer(updated_visa_type)
            return Response(output_serializer.data)
        
        except VisaType.DoesNotExist:
            return Response({'detail': 'Visa type not found'}, status=status.HTTP_404_NOT_FOUND)
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN if isinstance(e, PermissionError) else status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, pk=None):
        """Delete a visa type."""
        try:
            visa_type = visa_type_get(visa_type_id=pk)
            visa_type_delete(visa_type=visa_type, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except VisaType.DoesNotExist:
            return Response({'detail': 'Visa type not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(
        summary="List all visa categories",
        description="Returns all visa categories.",
        responses={200: VisaCategoryOutputSerializer(many=True)},
        tags=['visa-categories'],
    ),
)
class VisaCategoryViewSet(ViewSet):
    """ViewSet for visa category listing (read-only)."""

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """List all visa categories."""
        categories = visa_category_list()
        serializer = VisaCategoryOutputSerializer(categories, many=True)
        return Response(serializer.data)
