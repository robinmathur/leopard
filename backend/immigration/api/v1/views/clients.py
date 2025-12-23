"""
Client API views using service/selector pattern.

This module provides RESTful API endpoints for client management with
role-based access control and proper separation of concerns.
"""

from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from immigration.authentication import TenantJWTAuthentication
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from immigration.api.v1.permissions import CanManageClients
from immigration.pagination import StandardResultsSetPagination
from immigration.api.v1.serializers.clients import (
    ClientOutputSerializer,
    ClientCreateSerializer,
    ClientUpdateSerializer,
    ClientStageCountSerializer
)
from immigration.api.v1.serializers.client_activity import ClientActivityOutput
from immigration.selectors.clients import client_list, client_get, deleted_clients_list
from immigration.services.clients import (
    client_create,
    client_update,
    client_delete,
    client_restore,
    ClientCreateInput,
    ClientUpdateInput
)
from immigration.models import Client
from django.db.models import Count


@extend_schema_view(
    list=extend_schema(
        summary="List all clients",
        description="""
        Returns a paginated list of clients filtered by user's role and scope.
        
        Role-based filtering:
        - Consultant/Branch Admin: Only clients in their branch
        - Region Manager: Clients in all branches within their region
        - Country Manager/Super Admin: All clients in their tenant
        - Super Super Admin: System-wide access
        
        Query parameters allow additional filtering by email, stage, active status, etc.
        """,
        parameters=[
            OpenApiParameter(
                name='search',
                type=str,
                description='Search across first name, last name, and email (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='email',
                type=str,
                description='Filter by email (partial match, case-insensitive)',
                required=False,
            ),
            OpenApiParameter(
                name='stage',
                type=str,
                description='Filter by client stage (LEAD, FOLLOW_UP, CLIENT, CLOSE)',
                required=False,
                enum=['LEAD', 'FOLLOW_UP', 'CLIENT', 'CLOSE'],
            ),
            OpenApiParameter(
                name='active',
                type=bool,
                description='Filter by active status',
                required=False,
            ),
            OpenApiParameter(
                name='first_name',
                type=str,
                description='Filter by first name (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='last_name',
                type=str,
                description='Filter by last name (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='visa_category',
                type=int,
                description='Filter by visa category ID',
                required=False,
            ),
            OpenApiParameter(
                name='include_deleted',
                type=bool,
                description='Include soft-deleted clients in the result set',
                required=False,
            ),
        ],
        responses={
            200: ClientOutputSerializer(many=True),
            401: {'description': 'Unauthorized - Invalid or missing authentication'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['clients'],
    ),
    create=extend_schema(
        summary="Create a new client",
        description="""
        Creates a new client with proper scope validation.
        
        Business rules:
        - Created_by is automatically set to the requesting user
        - Assigned user must be within the creator's scope (branch/region/tenant)
        - Branch Admin can only assign to users in their branch
        - Defaults active=False, requires explicit activation
        """,
        request=ClientCreateSerializer,
        responses={
            201: ClientOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Cannot create client (scope violation)'},
        },
        tags=['clients'],
    ),
    retrieve=extend_schema(
        summary="Get client details",
        description="Retrieve details of a specific client by ID. User must have access to this client based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        responses={
            200: ClientOutputSerializer,
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this client'},
            404: {'description': 'Not Found - Client does not exist'},
        },
        tags=['clients'],
    ),
    update=extend_schema(
        summary="Update client (full update)",
        description="Update all fields of a client. User must have access to this client based on their role and scope.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        request=ClientUpdateSerializer,
        responses={
            200: ClientOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['clients'],
    ),
    partial_update=extend_schema(
        summary="Partial update client",
        description="Update specific fields of a client. Only provided fields are updated.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        request=ClientUpdateSerializer,
        responses={
            200: ClientOutputSerializer,
            400: {'description': 'Bad Request - Validation errors'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access or scope violation'},
            404: {'description': 'Not Found'},
        },
        tags=['clients'],
    ),
    destroy=extend_schema(
        summary="Delete client (soft delete)",
        description="Soft delete a client. Sets deleted_at timestamp without removing from database.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - No access to this client'},
            404: {'description': 'Not Found'},
        },
        tags=['clients'],
    ),
    restore=extend_schema(
        summary="Restore soft-deleted client",
        description="Restore a previously soft-deleted client. Only administrators can restore clients.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        responses={
            200: ClientOutputSerializer,
            400: {'description': 'Bad Request - Client is not soft-deleted'},
            401: {'description': 'Unauthorized'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Not Found - Client does not exist or not soft-deleted'},
        },
        tags=['clients'],
    ),
)
class ClientViewSet(ViewSet):
    """
    ViewSet for client management using service/selector pattern.

    This ViewSet delegates business logic to services (write operations)
    and selectors (read operations), keeping views thin.
    """

    authentication_classes = [TenantJWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination
    queryset = Client.objects.none()  # For drf-spectacular schema generation
    
    def list(self, request):
        """
        List all clients with role-based filtering.

        GET /api/v1/clients/
        """
        # Extract filters from query params
        filters = {
            'search': request.query_params.get('search'),
            'email': request.query_params.get('email'),
            'stage': request.query_params.get('stage'),
            'first_name': request.query_params.get('first_name'),
            'last_name': request.query_params.get('last_name'),
            'visa_category': request.query_params.get('visa_category'),
        }

        # Parse active parameter as boolean (query params come as strings)
        active_param = request.query_params.get('active')
        if active_param is not None and active_param != '':
            filters['active'] = str(active_param).lower() in ('true', '1', 'yes', 'on')

        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        # Check if user wants to include soft-deleted clients
        include_deleted = str(
            request.query_params.get('include_deleted', 'false')
        ).lower() in ('true', '1', 'yes', 'on')

        # Get filtered clients using selector
        clients = client_list(user=request.user, filters=filters, include_deleted=include_deleted)

        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(clients, request)
        serializer = ClientOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request):
        """
        Create a new client.
        
        POST /api/v1/clients/
        """
        # Validate input
        serializer = ClientCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Convert to Pydantic model for service
            input_data = ClientCreateInput(**serializer.validated_data)
            
            # Create client using service
            client = client_create(data=input_data, user=request.user)
            
            # Return created client
            output_serializer = ClientOutputSerializer(client)
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
        Get a specific client by ID.
        
        GET /api/v1/clients/{id}/
        """
        try:
            # Get client using selector (with scope validation)
            client = client_get(user=request.user, client_id=pk)
            
            # Serialize and return
            serializer = ClientOutputSerializer(client)
            return Response(serializer.data)
        
        except Client.DoesNotExist:
            return Response(
                {'detail': 'Client not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
    
    def update(self, request, pk=None):
        """
        Full update of a client.
        
        PUT /api/v1/clients/{id}/
        """
        return self._update_client(request, pk, partial=False)
    
    def partial_update(self, request, pk=None):
        """
        Partial update of a client.
        
        PATCH /api/v1/clients/{id}/
        """
        return self._update_client(request, pk, partial=True)
    
    def _update_client(self, request, pk, partial=False):
        """
        Internal method to handle both full and partial updates.
        """
        try:
            # Get client using selector (with scope validation)
            client = client_get(user=request.user, client_id=pk)
            
            # Validate input
            serializer = ClientUpdateSerializer(data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            
            # Convert to Pydantic model for service
            input_data = ClientUpdateInput(**serializer.validated_data)
            
            # Update client using service
            updated_client = client_update(
                client=client,
                data=input_data,
                user=request.user
            )
            
            # Return updated client
            output_serializer = ClientOutputSerializer(updated_client)
            return Response(output_serializer.data)
        
        except Client.DoesNotExist:
            return Response(
                {'detail': 'Client not found'},
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
        Soft delete a client.
        
        DELETE /api/v1/clients/{id}/
        """
        try:
            # Get client using selector (with scope validation)
            client = client_get(user=request.user, client_id=pk)
            
            # Delete client using service (soft delete)
            client_delete(client=client, user=request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Client.DoesNotExist:
            return Response(
                {'detail': 'Client not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """
        Restore a soft-deleted client.

        POST /api/v1/clients/{id}/restore/
        """
        try:
            # Fetch client from scoped soft-deleted list
            client = deleted_clients_list(user=request.user).get(id=pk)

            # Restore via service to ensure consistent behavior
            restored_client = client_restore(client=client, user=request.user)

            output_serializer = ClientOutputSerializer(restored_client)
            return Response(output_serializer.data)

        except Client.DoesNotExist:
            return Response(
                {'detail': 'Client not found or not soft-deleted'},
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

    @extend_schema(
        summary="Get client counts by stage",
        description="""
        Returns the count of clients grouped by their stage.
        
        Stage values:
        - LEAD: Lead
        - FOLLOW_UP: Follow Up
        - CLIENT: Client
        - CLOSE: Close
        
        The counts respect role-based filtering:
        - Consultant/Branch Admin: Only clients in their branch
        - Region Manager: Clients in all branches within their region
        - Super Admin: All clients in their tenant
        - Super Super Admin: System-wide access
        
        All stages are included in the response, even if the count is 0.
        """,
        responses={
            200: ClientStageCountSerializer,
            401: {'description': 'Unauthorized - Invalid or missing authentication'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['clients'],
    )
    @action(detail=False, methods=['get'], url_path='stage-counts')
    def stage_counts(self, request):
        """
        Get client counts grouped by stage.
        
        GET /api/v1/clients/stage-counts/
        """
        # Get scoped clients using selector (respects role-based filtering)
        clients = client_list(user=request.user, filters={}, include_deleted=False)
        
        # Group by stage and count
        stage_counts = clients.values('stage').annotate(count=Count('id'))
        
        # Initialize counts dictionary with all stages set to 0
        # Using actual database values: LE, FU, CT, CL
        counts = {
            'LEAD': 0,
            'FOLLOW_UP': 0,
            'CLIENT': 0,
            'CLOSE': 0,
        }
        
        # Populate counts from queryset
        total = 0
        for item in stage_counts:
            stage = item['stage']
            count = item['count']
            if stage in counts:
                counts[stage] = count
                total += count
        
        # Add total count
        counts['TOTAL'] = total
        
        # Serialize and return
        serializer = ClientStageCountSerializer(counts)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get client timeline",
        description="""
        Get chronological timeline of activities for a client.
        Returns paginated list of activities ordered by created_at (newest first).
        
        GET /api/v1/clients/{id}/timeline/
        """,
        parameters=[
            OpenApiParameter(
                name='activity_type',
                type=str,
                description='Filter by activity type',
                required=False,
            ),
        ],
        responses={200: ClientActivityOutput(many=True)},
        tags=['clients'],
    )
    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        """
        Get timeline activities for a client.
        
        GET /api/v1/clients/{id}/timeline/
        """
        from immigration.services.timeline import timeline_list
        
        activity_type = request.query_params.get('activity_type')
        
        # Get timeline activities
        activities = timeline_list(
            client_id=int(pk),
            activity_type=activity_type
        )
        
        # Paginate results
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(activities, request)
        
        if page is not None:
            serializer = ClientActivityOutput(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)
        
        serializer = ClientActivityOutput(activities, many=True, context={'request': request})
        return Response(serializer.data)
    
    @extend_schema(
        methods=['GET'],
        summary="Get client profile picture",
        description="Get the profile picture for a client.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        responses={
            200: {'description': 'Profile picture data'},
            404: {'description': 'Profile picture not found'},
        },
        tags=['clients'],
    )
    @extend_schema(
        methods=['POST'],
        summary="Upload client profile picture",
        description="Upload or replace a client's profile picture.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
            OpenApiParameter(
                name='file',
                type={'type': 'string', 'format': 'binary'},
                location=OpenApiParameter.QUERY,
                description='Profile picture file',
                required=True,
            ),
        ],
        request={'type': 'object', 'properties': {'file': {'type': 'string', 'format': 'binary'}}},
        responses={
            201: {'description': 'Profile picture uploaded successfully'},
            400: {'description': 'Bad Request - No file provided'},
            403: {'description': 'Forbidden - Insufficient permissions'},
        },
        tags=['clients'],
    )
    @extend_schema(
        methods=['DELETE'],
        summary="Delete client profile picture",
        description="Delete a client's profile picture.",
        parameters=[
            OpenApiParameter(
                name='id',
                type=int,
                location=OpenApiParameter.PATH,
                description='Client ID',
                required=True,
            ),
        ],
        responses={
            204: {'description': 'No Content - Successfully deleted'},
            403: {'description': 'Forbidden - Insufficient permissions'},
            404: {'description': 'Profile picture not found'},
        },
        tags=['clients'],
    )
    @action(detail=True, methods=['get', 'post', 'delete'], url_path='profile-picture')
    def profile_picture(self, request, pk=None):
        """
        Get, upload, or delete a client's profile picture.
        
        GET /api/v1/clients/{id}/profile-picture/ - Get profile picture
        POST /api/v1/clients/{id}/profile-picture/ - Upload profile picture
        DELETE /api/v1/clients/{id}/profile-picture/ - Delete profile picture
        """
        from immigration.models import ProfilePicture
        from immigration.api.v1.serializers.profile_picture import ProfilePictureOutput
        
        if request.method == 'GET':
            # Get profile picture
            try:
                profile_picture = ProfilePicture.objects.get(client_id=pk)
                serializer = ProfilePictureOutput(profile_picture, context={'request': request})
                return Response(serializer.data)
            except ProfilePicture.DoesNotExist:
                return Response(
                    {'detail': 'Profile picture not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        elif request.method == 'POST':
            # Upload/replace profile picture
            if not request.user.has_perm('immigration.add_profilepicture'):
                return Response(
                    {'detail': 'You do not have permission to upload profile pictures.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {'detail': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Delete existing profile picture if exists
            ProfilePicture.objects.filter(client_id=pk).delete()
            
            # Create new profile picture
            profile_picture = ProfilePicture.objects.create(
                client_id=pk,
                file=file,
                file_size=file.size,
                file_type=file.content_type,
                uploaded_by=request.user
            )
            
            serializer = ProfilePictureOutput(profile_picture, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        elif request.method == 'DELETE':
            # Delete profile picture
            if not request.user.has_perm('immigration.delete_profilepicture'):
                return Response(
                    {'detail': 'You do not have permission to delete profile pictures.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            try:
                profile_picture = ProfilePicture.objects.get(client_id=pk)
                profile_picture.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except ProfilePicture.DoesNotExist:
                return Response(
                    {'detail': 'Profile picture not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
