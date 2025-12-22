"""
Visa application API views using service/selector pattern.

This module provides RESTful API endpoints for visa application management with
role-based access control.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from immigration.authentication import TenantJWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.api.v1.permissions import CanManageApplications
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.visa import (
    VisaApplicationOutputSerializer,
    VisaApplicationCreateSerializer,
    VisaApplicationUpdateSerializer
)
from immigration.selectors.applications import visa_application_list, visa_application_get
from immigration.selectors.visa_statistics import (
    visa_application_status_counts,
    visa_application_dashboard_statistics
)
from immigration.services.applications import (
    visa_application_create,
    visa_application_update,
    VisaApplicationCreateInput,
    VisaApplicationUpdateInput
)
from immigration.models import VisaApplication


@extend_schema_view(
    list=extend_schema(
        summary="List all visa applications",
        description="Returns visa applications filtered by user's role and scope.",
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                description='Filter by application status',
                required=False,
                enum=['TO_BE_APPLIED', 'VISA_APPLIED', 'CASE_OPENED', 'GRANTED', 'REJECTED', 'WITHDRAWN'],
            ),
            OpenApiParameter(
                name='client_id',
                type=int,
                description='Filter by client ID',
                required=False,
            ),
            OpenApiParameter(
                name='client_name',
                type=str,
                description='Search by client name (first or last name)',
                required=False,
            ),
            OpenApiParameter(
                name='visa_type_id',
                type=int,
                description='Filter by visa type ID',
                required=False,
            ),
            OpenApiParameter(
                name='assigned_to_id',
                type=int,
                description='Filter by assigned user ID',
                required=False,
            ),
            OpenApiParameter(
                name='created_by_id',
                type=int,
                description='Filter by created by user ID (applied by)',
                required=False,
            ),
            OpenApiParameter(
                name='date_applied_from',
                type=str,
                description='Filter by date applied from (YYYY-MM-DD)',
                required=False,
            ),
            OpenApiParameter(
                name='date_applied_to',
                type=str,
                description='Filter by date applied to (YYYY-MM-DD)',
                required=False,
            ),
        ],
        responses={200: VisaApplicationOutputSerializer(many=True)},
        tags=['visa-applications'],
    ),
    create=extend_schema(
        summary="Create a new visa application",
        description="Creates a visa application with scope validation.",
        request=VisaApplicationCreateSerializer,
        responses={201: VisaApplicationOutputSerializer},
        tags=['visa-applications'],
    ),
    retrieve=extend_schema(
        summary="Get visa application details",
        description="Retrieve a specific visa application by ID.",
        responses={200: VisaApplicationOutputSerializer},
        tags=['visa-applications'],
    ),
    partial_update=extend_schema(
        summary="Update visa application",
        description="Update specific fields of a visa application.",
        request=VisaApplicationUpdateSerializer,
        responses={200: VisaApplicationOutputSerializer},
        tags=['visa-applications'],
    ),
)
class VisaApplicationViewSet(ViewSet):
    """ViewSet for visa application management using service/selector pattern."""

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageApplications]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """List all visa applications with role-based filtering and search."""
        filters = {
            'status': request.query_params.get('status'),
            'client_id': request.query_params.get('client_id'),
            'client_name': request.query_params.get('client_name'),
            'visa_type_id': request.query_params.get('visa_type_id'),
            'assigned_to_id': request.query_params.get('assigned_to_id'),
            'created_by_id': request.query_params.get('created_by_id'),
            'date_applied_from': request.query_params.get('date_applied_from'),
            'date_applied_to': request.query_params.get('date_applied_to'),
        }
        filters = {k: v for k, v in filters.items() if v is not None}

        applications = visa_application_list(user=request.user, filters=filters)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(applications, request)
        serializer = VisaApplicationOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """Create a new visa application."""
        serializer = VisaApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            input_data = VisaApplicationCreateInput(**serializer.validated_data)
            application = visa_application_create(data=input_data, user=request.user)
            
            output_serializer = VisaApplicationOutputSerializer(application)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN if isinstance(e, PermissionError) else status.HTTP_400_BAD_REQUEST
            )
    
    def retrieve(self, request, pk=None):
        """Get a specific visa application by ID."""
        try:
            application = visa_application_get(user=request.user, application_id=pk)
            serializer = VisaApplicationOutputSerializer(application)
            return Response(serializer.data)
        
        except VisaApplication.DoesNotExist:
            return Response({'detail': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=status.HTTP_403_FORBIDDEN)
    
    def partial_update(self, request, pk=None):
        """Partial update of a visa application."""
        try:
            application = visa_application_get(user=request.user, application_id=pk)
            
            serializer = VisaApplicationUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            input_data = VisaApplicationUpdateInput(**serializer.validated_data)
            updated_app = visa_application_update(
                application=application,
                data=input_data,
                user=request.user
            )
            
            output_serializer = VisaApplicationOutputSerializer(updated_app)
            return Response(output_serializer.data)
        
        except VisaApplication.DoesNotExist:
            return Response({'detail': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN if isinstance(e, PermissionError) else status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get visa application status counts",
        description="Returns count of applications for each status (for tab badges).",
        responses={200: dict},
        tags=['visa-applications'],
    )
    @action(detail=False, methods=['get'], url_path='status-counts')
    def status_counts(self, request):
        """Get count of applications by status."""
        counts = visa_application_status_counts(user=request.user)
        return Response(counts)
    
    @extend_schema(
        summary="Get visa application dashboard statistics",
        description="Returns comprehensive statistics for visa dashboard with graphs and charts.",
        responses={200: dict},
        tags=['visa-applications'],
    )
    @action(detail=False, methods=['get'], url_path='dashboard-statistics')
    def dashboard_statistics(self, request):
        """Get dashboard statistics for visa applications."""
        statistics = visa_application_dashboard_statistics(user=request.user)
        return Response(statistics)
