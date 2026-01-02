"""
CalendarEvent views for API layer.

These views handle HTTP requests for calendar event endpoints.
Business logic lives in services - views are thin wrappers.
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from immigration.pagination import StandardResultsSetPagination
from immigration.selectors.events import event_list, event_get, event_list_upcoming
from immigration.services.events import (
    event_create,
    event_update,
    event_delete,
)
from immigration.api.v1.serializers.event import (
    EventOutputSerializer,
    EventCreateSerializer,
    EventUpdateSerializer,
)
from immigration.models import CalendarEvent, User


class EventViewSet(viewsets.ViewSet):
    """
    ViewSet for calendar event endpoints.

    Provides full CRUD operations for calendar events with permission-based filtering.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    queryset = CalendarEvent.objects.none()  # For schema generation

    @extend_schema(
        summary="List calendar events",
        description="Returns calendar events filtered by user's permissions and role.",
        parameters=[
            OpenApiParameter(
                name='start_date',
                type=OpenApiTypes.DATETIME,
                description='Filter events that end after this date'
            ),
            OpenApiParameter(
                name='end_date',
                type=OpenApiTypes.DATETIME,
                description='Filter events that start before this date'
            ),
            OpenApiParameter(
                name='assigned_to',
                type=OpenApiTypes.INT,
                description='Filter by assigned user ID'
            ),
            OpenApiParameter(
                name='branch',
                type=OpenApiTypes.INT,
                description='Filter by branch ID'
            ),
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                description='Search in title, description, or location'
            ),
        ],
        responses={200: EventOutputSerializer(many=True)},
        tags=['events'],
    )
    def list(self, request):
        """List all calendar events with permission-based filtering."""
        filters = {
            'start_date': request.query_params.get('start_date'),
            'end_date': request.query_params.get('end_date'),
            'assigned_to': request.query_params.get('assigned_to'),
            'branch': request.query_params.get('branch'),
            'search': request.query_params.get('search'),
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}

        events = event_list(user=request.user, filters=filters)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(events, request)
        serializer = EventOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Create calendar event",
        description="Creates a new calendar event.",
        request=EventCreateSerializer,
        responses={201: EventOutputSerializer},
        tags=['events'],
    )
    def create(self, request):
        """Create a new calendar event."""
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Get assigned_to user if provided
            assigned_to = None
            if 'assigned_to_id' in serializer.validated_data:
                assigned_to_id = serializer.validated_data['assigned_to_id']
                if assigned_to_id:
                    try:
                        assigned_to = User.objects.get(id=assigned_to_id)
                    except User.DoesNotExist:
                        return Response(
                            {'detail': f'User with ID {assigned_to_id} not found'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

            # Create event
            event = event_create(
                title=serializer.validated_data['title'],
                start=serializer.validated_data['start'],
                end=serializer.validated_data['end'],
                assigned_to=assigned_to,
                hex_color=serializer.validated_data.get('hex_color', '#3788d8'),
                description=serializer.validated_data.get('description', ''),
                location=serializer.validated_data.get('location', ''),
                all_day=serializer.validated_data.get('all_day', False),
                branch_id=serializer.validated_data.get('branch_id'),
                created_by=request.user,
            )

            output_serializer = EventOutputSerializer(event)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Get event details",
        description="Retrieve a specific calendar event by ID.",
        responses={200: EventOutputSerializer},
        tags=['events'],
    )
    def retrieve(self, request, pk=None):
        """Get a specific calendar event by ID."""
        try:
            event = event_get(user=request.user, event_id=pk)
            serializer = EventOutputSerializer(event)
            return Response(serializer.data)
        except CalendarEvent.DoesNotExist:
            return Response(
                {'detail': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

    @extend_schema(
        summary="Update calendar event",
        description="Partial update of a calendar event (PATCH).",
        request=EventUpdateSerializer,
        responses={200: EventOutputSerializer},
        tags=['events'],
    )
    def partial_update(self, request, pk=None):
        """Partial update of a calendar event (PATCH)."""
        try:
            event_obj = event_get(user=request.user, event_id=pk)

            serializer = EventUpdateSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)

            # Get assigned_to user if provided
            assigned_to = None
            if 'assigned_to_id' in serializer.validated_data:
                assigned_to_id = serializer.validated_data['assigned_to_id']
                if assigned_to_id:
                    try:
                        assigned_to = User.objects.get(id=assigned_to_id)
                    except User.DoesNotExist:
                        return Response(
                            {'detail': f'User with ID {assigned_to_id} not found'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    # Explicitly set to None if null
                    assigned_to = None

            # Update event
            updated_event = event_update(
                event=event_obj,
                title=serializer.validated_data.get('title'),
                start=serializer.validated_data.get('start'),
                end=serializer.validated_data.get('end'),
                assigned_to=assigned_to if 'assigned_to_id' in serializer.validated_data else None,
                hex_color=serializer.validated_data.get('hex_color'),
                description=serializer.validated_data.get('description'),
                location=serializer.validated_data.get('location'),
                all_day=serializer.validated_data.get('all_day'),
                updated_by=request.user,
            )

            output_serializer = EventOutputSerializer(updated_event)
            return Response(output_serializer.data)

        except CalendarEvent.DoesNotExist:
            return Response(
                {'detail': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Delete calendar event",
        description="Soft delete a calendar event.",
        responses={204: None},
        tags=['events'],
    )
    def destroy(self, request, pk=None):
        """Soft delete a calendar event."""
        try:
            event_obj = event_get(user=request.user, event_id=pk)
            event_delete(event=event_obj, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except CalendarEvent.DoesNotExist:
            return Response(
                {'detail': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )

    @extend_schema(
        summary="Get upcoming events",
        description="Returns upcoming events for the next N days (default: 7).",
        parameters=[
            OpenApiParameter(
                name='days',
                type=OpenApiTypes.INT,
                description='Number of days to look ahead (default: 7)'
            ),
        ],
        responses={200: EventOutputSerializer(many=True)},
        tags=['events'],
    )
    @action(detail=False, methods=['get'], url_path='upcoming')
    def upcoming(self, request):
        """Get upcoming calendar events."""
        days = int(request.query_params.get('days', 7))

        events = event_list_upcoming(user=request.user, days=days)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(events, request)
        serializer = EventOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary="Get today's events",
        description="Returns calendar events for today. Includes user's own events and team events if user has permission.",
        responses={200: EventOutputSerializer(many=True)},
        tags=['events'],
    )
    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        """Get today's calendar events."""
        from datetime import datetime, timedelta
        
        # Get today's date range (start of day to end of day)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        # Filter events for today
        filters = {
            'start_date': today_start.isoformat(),
            'end_date': today_end.isoformat(),
        }
        
        events = event_list(user=request.user, filters=filters)
        
        # Order by start time
        events = events.order_by('start')
        
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(events, request)
        serializer = EventOutputSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)
