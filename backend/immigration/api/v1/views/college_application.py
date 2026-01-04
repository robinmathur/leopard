"""
College application API views using service/selector pattern.

This module provides RESTful API endpoints for college application management with
role-based access control for:
- ApplicationType (configuration)
- Stage (workflow stages)
- CollegeApplication (student applications)
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.authentication import TenantJWTAuthentication
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.permissions import (
    CanManageApplicationTypes,
    CanManageCollegeApplications,
)

from immigration.api.v1.serializers.college_application import (
    ApplicationTypeOutputSerializer,
    ApplicationTypeCreateSerializer,
    ApplicationTypeUpdateSerializer,
    StageOutputSerializer,
    StageCreateSerializer,
    StageUpdateSerializer,
    StageReorderSerializer,
    CollegeApplicationOutputSerializer,
    CollegeApplicationCreateSerializer,
    CollegeApplicationUpdateSerializer,
)

from immigration.selectors.college_applications import (
    application_type_list,
    application_type_get,
    stage_list,
    stage_get,
    college_application_list,
    college_application_get,
)

from immigration.selectors.college_application_statistics import (
    college_application_stage_counts,
    college_application_dashboard_statistics,
)

from immigration.services.college_applications import (
    application_type_create,
    application_type_update,
    application_type_delete,
    stage_create,
    stage_update,
    stage_delete,
    stage_reorder,
    college_application_create,
    college_application_update,
    college_application_delete,
    ApplicationTypeCreateInput,
    ApplicationTypeUpdateInput,
    StageCreateInput,
    StageUpdateInput,
    StageReorderInput,
    CollegeApplicationCreateInput,
    CollegeApplicationUpdateInput,
)

from immigration.models import ApplicationType, Stage, CollegeApplication


# ==============================================================================
# APPLICATION TYPE VIEWSET
# ==============================================================================

class ApplicationTypeViewSet(ViewSet):
    """
    ViewSet for ApplicationType management.

    Provides CRUD operations for application types with validation.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageApplicationTypes]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        """
        List application types with filtering.

        Query Parameters:
            is_active (bool): Filter by active status
            title (str): Search by title (case-insensitive)
        """
        filters = {
            'is_active': request.query_params.get('is_active'),
            'title': request.query_params.get('title'),
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Convert is_active to boolean
        if 'is_active' in filters:
            filters['is_active'] = filters['is_active'].lower() in ['true', '1', 'yes']

        application_types = application_type_list(user=request.user, filters=filters)

        # Pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(application_types, request)
        serializer = ApplicationTypeOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    def create(self, request):
        """Create new application type."""
        serializer = ApplicationTypeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            input_data = ApplicationTypeCreateInput(**serializer.validated_data)
            application_type = application_type_create(
                data=input_data,
                user=request.user
            )

            output_serializer = ApplicationTypeOutputSerializer(application_type)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, pk=None):
        """Get specific application type."""
        try:
            application_type = application_type_get(
                user=request.user,
                application_type_id=pk
            )
            serializer = ApplicationTypeOutputSerializer(application_type)
            return Response(serializer.data)

        except ApplicationType.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Update application type."""
        try:
            application_type = application_type_get(
                user=request.user,
                application_type_id=pk
            )

            serializer = ApplicationTypeUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            input_data = ApplicationTypeUpdateInput(**serializer.validated_data)
            updated = application_type_update(
                application_type=application_type,
                data=input_data,
                user=request.user
            )

            output_serializer = ApplicationTypeOutputSerializer(updated)
            return Response(output_serializer.data)

        except ApplicationType.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, pk=None):
        """Delete application type (with validation)."""
        try:
            application_type = application_type_get(
                user=request.user,
                application_type_id=pk
            )
            application_type_delete(
                application_type=application_type,
                user=request.user
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ApplicationType.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            # Deletion prevented due to business rule
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==============================================================================
# STAGE VIEWSET
# ==============================================================================

class StageViewSet(ViewSet):
    """
    ViewSet for Stage management.

    Provides CRUD operations and reordering for stages.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageApplicationTypes]

    def list(self, request):
        """
        List stages with filtering.

        Query Parameters:
            application_type_id (int): Filter by application type
        """
        filters = {
            'application_type_id': request.query_params.get('application_type_id'),
        }
        filters = {k: v for k, v in filters.items() if v is not None}

        stages = stage_list(user=request.user, filters=filters)
        serializer = StageOutputSerializer(stages, many=True)

        return Response(serializer.data)

    def create(self, request):
        """Create new stage."""
        serializer = StageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            input_data = StageCreateInput(**serializer.validated_data)
            stage = stage_create(data=input_data, user=request.user)

            output_serializer = StageOutputSerializer(stage)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, pk=None):
        """Get specific stage."""
        try:
            stage = stage_get(user=request.user, stage_id=pk)
            serializer = StageOutputSerializer(stage)
            return Response(serializer.data)

        except Stage.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def partial_update(self, request, pk=None):
        """Update stage (name/description only, not position)."""
        try:
            stage = stage_get(user=request.user, stage_id=pk)

            serializer = StageUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            input_data = StageUpdateInput(**serializer.validated_data)
            updated = stage_update(stage=stage, data=input_data, user=request.user)

            output_serializer = StageOutputSerializer(updated)
            return Response(output_serializer.data)

        except Stage.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def destroy(self, request, pk=None):
        """Delete stage."""
        try:
            stage = stage_get(user=request.user, stage_id=pk)
            stage_delete(stage=stage, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Stage.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            # Deletion prevented due to business rule
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder_stages(self, request):
        """
        Reorder stages for an application type after drag-and-drop.

        Request Body:
        {
            "application_type_id": 1,
            "stages": [
                {"stage_id": 1, "new_position": 1},
                {"stage_id": 2, "new_position": 2},
                ...
            ]
        }
        """
        application_type_id = request.data.get('application_type_id')
        stages_data = request.data.get('stages', [])

        if not application_type_id:
            return Response(
                {'detail': 'application_type_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Convert to Pydantic input models
            reorder_inputs = [
                StageReorderInput(**item) for item in stages_data
            ]

            updated_stages = stage_reorder(
                application_type_id=application_type_id,
                reorder_data=reorder_inputs,
                user=request.user
            )

            serializer = StageOutputSerializer(updated_stages, many=True)
            return Response(serializer.data)

        except (PermissionError, ValueError) as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==============================================================================
# COLLEGE APPLICATION VIEWSET
# ==============================================================================

class CollegeApplicationViewSet(ViewSet):
    """
    ViewSet for CollegeApplication management.

    Provides CRUD operations with role-based filtering and custom statistics actions.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageCollegeApplications]
    pagination_class = StandardResultsSetPagination

    def list(self, request):
        """
        List college applications with filtering.

        Query Parameters:
            client_id (int): Filter by client
            application_type_id (int): Filter by application type
            stage_id (int): Filter by stage
            institute_id (int): Filter by institute
            assigned_to_id (int): Filter by assigned user
            client_name (str): Search by client name
        """
        filters = {
            'client_id': request.query_params.get('client_id'),
            'application_type_id': request.query_params.get('application_type_id'),
            'stage_id': request.query_params.get('stage_id'),
            'institute_id': request.query_params.get('institute_id'),
            'assigned_to_id': request.query_params.get('assigned_to_id'),
            'client_name': request.query_params.get('client_name'),
        }
        filters = {k: v for k, v in filters.items() if v is not None}

        applications = college_application_list(user=request.user, filters=filters)

        # Pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(applications, request)
        serializer = CollegeApplicationOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    def create(self, request):
        """Create new college application."""
        serializer = CollegeApplicationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            input_data = CollegeApplicationCreateInput(**serializer.validated_data)
            application = college_application_create(
                data=input_data,
                user=request.user
            )

            output_serializer = CollegeApplicationOutputSerializer(application)
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
        """Get specific college application."""
        try:
            application = college_application_get(
                user=request.user,
                application_id=pk
            )
            serializer = CollegeApplicationOutputSerializer(application)
            return Response(serializer.data)

        except CollegeApplication.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

    def partial_update(self, request, pk=None):
        """Update college application."""
        try:
            application = college_application_get(
                user=request.user,
                application_id=pk
            )

            serializer = CollegeApplicationUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            input_data = CollegeApplicationUpdateInput(**serializer.validated_data)
            updated = college_application_update(
                application=application,
                data=input_data,
                user=request.user
            )

            output_serializer = CollegeApplicationOutputSerializer(updated)
            return Response(output_serializer.data)

        except CollegeApplication.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
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
        """Delete college application."""
        try:
            application = college_application_get(
                user=request.user,
                application_id=pk
            )
            college_application_delete(application=application, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except CollegeApplication.DoesNotExist:
            return Response(
                {'detail': 'Not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=False, methods=['get'], url_path='stage-counts')
    def stage_counts(self, request):
        """
        Get count of applications by stage (for tracker tabs).

        Query Parameters:
            application_type_id (int): Optional filter by application type

        Returns:
            {
                'total': 150,
                'by_stage': [
                    {'stage_id': 1, 'stage_name': '...', 'position': 1, 'count': 45},
                    ...
                ]
            }
        """
        application_type_id = request.query_params.get('application_type_id')

        counts = college_application_stage_counts(
            user=request.user,
            application_type_id=application_type_id
        )

        return Response(counts)

    @action(detail=False, methods=['get'], url_path='dashboard-statistics')
    def dashboard_statistics(self, request):
        """
        Get dashboard statistics.

        Query Parameters:
            time_filter (str): 'today', 'this_week', 'this_month', 'all' (default: 'all')

        Returns comprehensive dashboard statistics including intake breakdown,
        application type breakdown, institute breakdown, and recent applications.

        CRITICAL: Only counts applications in FINAL stage, grouped by intake date.
        """
        time_filter = request.query_params.get('time_filter', 'all')

        statistics = college_application_dashboard_statistics(
            user=request.user,
            time_filter=time_filter
        )

        return Response(statistics)
