"""
Notification views for API layer.

These views handle HTTP requests for notification endpoints.
Business logic lives in services - views are thin wrappers.
"""

import asyncio
import json

from django.http import StreamingHttpResponse, JsonResponse
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from channels.layers import get_channel_layer

from immigration.api.v1.authentication import JWTQueryParamAuthentication
from immigration.models import Notification
from immigration.pagination import StandardResultsSetPagination
from immigration.services.notifications import (
    notification_list,
    notification_mark_read,
    notification_bulk_mark_read,
    notification_get_unread_count,
    notification_get_overdue,
    notification_update,
)
from immigration.api.v1.serializers.notification import (
    NotificationOutputSerializer,
    NotificationUpdateSerializer,
)
from immigration.constants import NotificationType

User = get_user_model()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for notification endpoints.
    
    Provides list, retrieve, and custom actions for notifications.
    """
    serializer_class = NotificationOutputSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """
        Get notifications for the authenticated user based on filters.
        """
        # Handle schema generation
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        include_read_default = str(settings.NOTIFICATIONS_INCLUDE_READ_DEFAULT).lower() == 'true'
        include_read = self.request.query_params.get('include_read', str(include_read_default)).lower() == 'true'
        notification_type = self.request.query_params.get('type')
        
        return notification_list(
            user=self.request.user,
            include_read=include_read,
            notification_type=notification_type
        )
    
    @extend_schema(
        summary="List notifications",
        description="Get all notifications for the authenticated user. Can filter by read status and type.",
        parameters=[
            OpenApiParameter(
                name='include_read',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include read notifications (default: true)',
                required=False,
            ),
            OpenApiParameter(
                name='type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description=f"Filter by notification type ({', '.join(NotificationType.values())})",
                required=False,
            ),
        ],
        responses={200: NotificationOutputSerializer(many=True)},
        tags=['notifications'],
    )
    def list(self, request, *args, **kwargs):
        """List all notifications for the authenticated user."""
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get notification details",
        description="Retrieve a specific notification by ID.",
        responses={
            200: NotificationOutputSerializer,
            404: OpenApiTypes.OBJECT,
        },
        tags=['notifications'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific notification."""
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Update notification",
        description="Update notification fields (typically to mark as read or completed).",
        request=NotificationUpdateSerializer,
        responses={
            200: NotificationOutputSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Mark as read',
                value={'read': True},
                request_only=True,
            ),
            OpenApiExample(
                'Mark as completed',
                value={'read': True, 'is_completed': True},
                request_only=True,
            ),
        ],
        tags=['notifications'],
    )
    @action(detail=True, methods=['put', 'patch'])
    def update_notification(self, request, pk=None):
        """
        Update a notification (mark as read, completed, etc.).
        """
        serializer = NotificationUpdateSerializer(data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            notification = notification_update(
                notification_id=pk,
                user=request.user,
                **serializer.validated_data
            )
            if notification:
                output_serializer = NotificationOutputSerializer(notification)
                return Response(output_serializer.data)
            return Response(
                {'error': 'Notification not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Mark notification as read",
        description="Mark a specific notification as read.",
        request=None,
        responses={
            200: NotificationOutputSerializer,
            404: OpenApiTypes.OBJECT,
        },
        tags=['notifications'],
    )
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = notification_mark_read(pk, request.user)
        if notification:
            serializer = NotificationOutputSerializer(notification)
            return Response(serializer.data)
        return Response(
            {'error': 'Notification not found or access denied'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @extend_schema(
        summary="Bulk mark notifications as read",
        description="Mark multiple notifications as read at once.",
        request={
            'type': 'object',
            'properties': {
                'notification_ids': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of notification IDs to mark as read',
                }
            },
            'required': ['notification_ids'],
        },
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'marked_read_count': {'type': 'integer'}
                }
            },
            400: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Bulk mark read',
                value={'notification_ids': [1, 2, 3, 4, 5]},
                request_only=True,
            ),
        ],
        tags=['notifications'],
    )
    @action(detail=False, methods=['post'])
    def bulk_mark_read(self, request):
        """Mark multiple notifications as read."""
        notification_ids = request.data.get('notification_ids', [])
        if not notification_ids:
            return Response(
                {'error': 'notification_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count = notification_bulk_mark_read(request.user, notification_ids)
        return Response({'marked_read_count': count})
    
    @extend_schema(
        summary="Get unread count",
        description="Get the count of unread notifications for the authenticated user.",
        request=None,
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'unread_count': {'type': 'integer'}
                }
            },
        },
        tags=['notifications'],
    )
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = notification_get_unread_count(request.user)
        return Response({'unread_count': count})
    
    @extend_schema(
        summary="Get overdue notifications",
        description="Get all overdue notifications for the authenticated user.",
        request=None,
        responses={200: NotificationOutputSerializer(many=True)},
        tags=['notifications'],
    )
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue notifications."""
        notifications = notification_get_overdue(request.user)
        serializer = NotificationOutputSerializer(notifications, many=True)
        return Response(serializer.data)


# SSE Implementation
async def notification_sse_stream(user):
    """
    Async generator function for SSE stream of notifications using channel layer.
    
    This implements true real-time notifications via Django Channels.
    Tracks user online status for SSE optimization.
    """
    from immigration.services.user_presence import mark_user_online, mark_user_offline, refresh_user_online_status
    
    channel_layer = get_channel_layer()
    if not channel_layer:
        # Fallback: Send error message if channel layer not configured
        yield f"data: {json.dumps({'error': 'Channel layer not configured'})}\n\n".encode('utf-8')
        return

    # Create unique channel name for this connection
    group_name = f"user_{user.id}"
    channel_name = await channel_layer.new_channel()

    try:
        # Add this channel to the user's group
        await channel_layer.group_add(group_name, channel_name)
        
        # Mark user as online when connection is established
        mark_user_online(user.id)

        # Send initial connection message
        initial_message = {
            'type': 'connection_established',
            'message': 'SSE connection established',
            'user_id': user.id
        }
        yield f"data: {json.dumps(initial_message)}\n\n".encode('utf-8')

        # Keep connection alive and listen for messages
        while True:
            try:
                # Wait for messages from the channel layer (with timeout)
                message = await asyncio.wait_for(
                    channel_layer.receive(channel_name),
                    timeout=30.0  # 30 second timeout for heartbeat
                )

                # Handle different message types
                if message.get('type') == 'notification_message':
                    notification_data = message.get('notification', {})
                    yield f"data: {json.dumps(notification_data)}\n\n".encode('utf-8')
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive and refresh online status
                refresh_user_online_status(user.id)
                heartbeat = {'type': 'heartbeat', 'timestamp': timezone.now().isoformat()}
                yield f"data: {json.dumps(heartbeat)}\n\n".encode('utf-8')
            except Exception as e:
                # Log error but continue
                error_msg = {'type': 'error', 'message': str(e)}
                yield f"data: {json.dumps(error_msg)}\n\n".encode('utf-8')
                break

    finally:
        # Clean up: remove channel from group and mark user as offline
        await channel_layer.group_discard(group_name, channel_name)
        mark_user_offline(user.id)


def notification_sse_view(request):
    """
    Server-Sent Events endpoint for real-time notifications.

    Clients can connect with:
    1. Authorization Header: GET /api/v1/notifications/stream/
       Authorization: Bearer <token>
    2. Query Parameter (for browsers): GET /api/v1/notifications/stream/?token=<token>
    
    The query parameter method is needed for EventSource in browsers since it doesn't
    support custom headers.
    
    This uses Django Channels for true real-time notification delivery.
    Notifications are sent immediately when created, not via polling.
    """
    # Manual authentication (no DRF decorators)
    auth = JWTQueryParamAuthentication()
    
    # Get token from query parameter or Authorization header
    token = request.GET.get('token')
    if not token:
        # Try Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    if not token:
        return JsonResponse(
            {'error': 'Authentication token required. Use ?token=<jwt> or Authorization: Bearer <jwt>'},
            status=401
        )
    
    try:
        # Validate token and get user
        validated_token = auth.get_validated_token(token)
        user = auth.get_user(validated_token)
        
        if user is None:
            return JsonResponse(
                {'error': 'Invalid authentication credentials.'},
                status=401
            )
    except Exception as e:
        # Handle token validation errors
        error_detail = str(e)
        if 'expired' in error_detail.lower():
            error_msg = 'Token has expired.'
        elif 'invalid' in error_detail.lower() or 'signature' in error_detail.lower():
            error_msg = 'Invalid token signature.'
        elif 'decode' in error_detail.lower():
            error_msg = 'Token decode error.'
        else:
            error_msg = f'Authentication failed: {error_detail}'
        
        return JsonResponse(
            {'error': error_msg},
            status=401
        )

    # Create async wrapper for the SSE stream
    async def async_stream_wrapper():
        """Wrapper to run the async SSE stream generator."""
        async for chunk in notification_sse_stream(user):
            yield chunk

    # Create SSE response with async generator
    response = StreamingHttpResponse(
        async_stream_wrapper(),
        content_type='text/event-stream'
    )

    # SSE-specific headers
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['X-Accel-Buffering'] = 'no'  # Disable Nginx buffering
    response['Connection'] = 'keep-alive'
    response['Access-Control-Allow-Origin'] = settings.NOTIFICATION_STREAM_ALLOWED_ORIGIN
    response['Access-Control-Allow-Headers'] = 'Cache-Control, Authorization'

    return response