"""
Region ViewSet for CRUD operations.

This ViewSet provides full CRUD functionality for regions with role-based access control.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet
from drf_spectacular.utils import extend_schema_view, extend_schema, OpenApiParameter

from immigration.models.region import Region
from immigration.api.v1.serializers.regions import (
    RegionOutputSerializer,
    RegionCreateSerializer,
    RegionUpdateSerializer,
)
from immigration.api.v1.permissions import CanManageRegions
from immigration.authentication import TenantJWTAuthentication
from immigration.pagination import StandardResultsSetPagination
from immigration.selectors.regions import region_list, region_get
from immigration.services.regions import (
    region_create,
    region_update,
    region_delete,
    RegionCreateInput,
    RegionUpdateInput,
)


@extend_schema_view(
    list=extend_schema(
        summary="List all regions",
        description="""
        Returns a paginated list of regions filtered by user's role and scope.
        
        Role-based filtering:
        - Consultant/Branch Admin: Only regions containing their assigned branches
        - Region Manager: Only their assigned regions
        - Super Admin: All regions in their tenant
        - Super Super Admin: System-wide access
        
        Query parameters allow additional filtering by name, search, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across name and description (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='name',
                type=str,
                description='Filter by name (partial match, case-insensitive)',
                required=False,
            ),
        ],
        responses={
            200: RegionOutputSerializer(many=True),
            401: {'description': 'Unauthorized - Invalid or missing authentication'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['regions'],
    ),
    create=extend_schema(
        summary="Create a new region",
        description="""
        Creates a new region with proper scope validation.
        
        Business rules:
        - Region name must be unique within current tenant schema
        """,
        request=RegionCreateSerializer,
        responses={
            201: RegionOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['regions'],
    ),
    retrieve=extend_schema(
        summary="Get region details",
        description="Retrieve details of a specific region by ID. User must have access to this region based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Region ID',
                required=True,
            ),
        ],
        responses={
            200: RegionOutputSerializer,
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this region'},
            404: {'description': 'Not Found - Region does not exist'},
        },
        tags=['regions'],
    ),
    update=extend_schema(
        summary="Update region (full update)",
        description="Update all fields of a region. User must have access to this region based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Region ID',
                required=True,
            ),
        ],
        request=RegionUpdateSerializer,
        responses={
            200: RegionOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['regions'],
    ),
    partial_update=extend_schema(
        summary="Partial update region",
        description="Update specific fields of a region. Only provided fields are updated.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Region ID',
                required=True,
            ),
        ],
        request=RegionUpdateSerializer,
        responses={
            200: RegionOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['regions'],
    ),
    destroy=extend_schema(
        summary="Delete region",
        description="Delete a region. Cannot delete if region has assigned branches.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Region ID',
                required=True,
            ),
        ],
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            400: {'description': 'Bad Request - Region has assigned branches'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this region'},
            404: {'description': 'Not Found'},
        },
        tags=['regions'],
    ),
)
class RegionViewSet(ViewSet):
    """
    ViewSet for region management using service/selector pattern.

    This ViewSet delegates business logic to services (write operations)
    and selectors (read operations), keeping views thin.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageRegions]
    pagination_class = StandardResultsSetPagination
    queryset = Region.objects.none()  # For drf-spectacular schema generation
    
    def list(self, request):
        """
        List all regions with role-based filtering.

        GET /api/v1/regions/
        """
        # Extract filters from query params
        filters = {
            'search': request.query_params.get('search'),
            'name': request.query_params.get('name'),
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Get filtered regions using selector
        regions = region_list(user=request.user, filters=filters)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(regions, request)
        serializer = RegionOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new region.
        
        POST /api/v1/regions/
        """
        # Validate input
        serializer = RegionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = RegionCreateInput(**serializer.validated_data)
            
            # Create region using service
            region = region_create(data=input_data, user=request.user)
            
            # Return created region
            output_serializer = RegionOutputSerializer(region)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """
        Get a specific region by ID.
        
        GET /api/v1/regions/{id}/
        """
        try:
            # Get region using selector
            region = region_get(user=request.user, region_id=pk)
            
            if not region:
                return Response(
                    {'detail': 'Region not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Serialize and return
            serializer = RegionOutputSerializer(region)
            return Response(serializer.data)
        
        except Region.DoesNotExist:
            return Response(
                {'detail': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, pk=None):
        """
        Full update of a region.
        
        PUT /api/v1/regions/{id}/
        """
        return self._update_region(request, pk, partial=False)
    
    def partial_update(self, request, pk=None):
        """
        Partial update of a region.
        
        PATCH /api/v1/regions/{id}/
        """
        return self._update_region(request, pk, partial=True)
    
    def _update_region(self, request, pk, partial=False):
        """
        Internal method to handle both full and partial updates.
        """
        try:
            # Get region using selector
            region = region_get(user=request.user, region_id=pk)
            
            if not region:
                return Response(
                    {'detail': 'Region not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate input
            serializer = RegionUpdateSerializer(data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model for service
            input_data = RegionUpdateInput(**serializer.validated_data)
            
            # Update region using service
            updated_region = region_update(
                region=region,
                data=input_data,
                user=request.user
            )
            
            # Return updated region
            output_serializer = RegionOutputSerializer(updated_region)
            return Response(output_serializer.data)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Region.DoesNotExist:
            return Response(
                {'detail': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, pk=None):
        """
        Delete a region.
        
        DELETE /api/v1/regions/{id}/
        """
        try:
            # Get region using selector
            region = region_get(user=request.user, region_id=pk)
            
            if not region:
                return Response(
                    {'detail': 'Region not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Delete region using service
            region_delete(region=region, user=request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Region.DoesNotExist:
            return Response(
                {'detail': 'Region not found'},
                status=status.HTTP_404_NOT_FOUND
            )

