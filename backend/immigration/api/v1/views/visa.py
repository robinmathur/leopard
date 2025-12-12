"""
Visa application API views using service/selector pattern.

This module provides RESTful API endpoints for visa application management with
role-based access control.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.api.v1.permissions import CanManageApplications
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.visa import (
    VisaApplicationOutputSerializer,
    VisaApplicationCreateSerializer,
    VisaApplicationUpdateSerializer
)
from immigration.selectors.applications import visa_application_list, visa_application_get
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

    authentication_classes = [JWTAuthentication]
    permission_classes = [CanManageApplications]
    pagination_class = StandardResultsSetPagination
    
    def list(self, request):
        """List all visa applications with role-based filtering."""
        filters = {
            'status': request.query_params.get('status'),
            'client_id': request.query_params.get('client_id'),
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
