"""
Task views for API layer.

These views handle HTTP requests for task endpoints.
Business logic lives in services - views are thin wrappers.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from immigration.pagination import StandardResultsSetPagination

from immigration.services.tasks import (
    task_create,
    task_get,
    task_list,
    task_update,
    task_mark_completed,
    task_mark_cancelled,
    task_add_comment,
    task_delete,
    task_get_overdue,
    task_get_due_soon,
)
from immigration.api.v1.serializers.task import (
    TaskOutputSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
)
from immigration.constants import TaskPriority, TaskStatus

User = get_user_model()


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for task endpoints.
    
    Provides full CRUD operations for tasks.
    """
    serializer_class = TaskOutputSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """
        Get tasks for the authenticated user based on filters.
        """
        status_filter = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        include_overdue_default = str(settings.TASKS_INCLUDE_OVERDUE_DEFAULT).lower() == 'true'
        include_overdue = self.request.query_params.get('include_overdue', str(include_overdue_default)).lower() == 'true'
        
        return task_list(
            user=self.request.user,
            status=status_filter,
            priority=priority,
            include_overdue=include_overdue
        )
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        return TaskOutputSerializer
    
    @extend_schema(
        summary="List tasks",
        description="Get all tasks for the authenticated user. Can filter by status, priority, and overdue.",
        parameters=[
            OpenApiParameter(
                name='status',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description=f"Filter by task status ({', '.join(TaskStatus.values())})",
                required=False,
            ),
            OpenApiParameter(
                name='priority',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description=f"Filter by priority ({', '.join(TaskPriority.values())})",
                required=False,
            ),
            OpenApiParameter(
                name='include_overdue',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include overdue tasks (default: true)',
                required=False,
            ),
        ],
        responses={200: TaskOutputSerializer(many=True)},
        tags=['tasks'],
    )
    def list(self, request, *args, **kwargs):
        """List all tasks for the authenticated user."""
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Create task",
        description="Create a new task and optionally assign it to a user.",
        request=TaskCreateSerializer,
        responses={
            201: TaskOutputSerializer,
            400: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Create high priority task',
                value={
                    'title': 'Review client documents',
                    'detail': 'Review and verify all submitted documents for completeness',
                    'priority': 'HIGH',
                    'due_date': '2025-12-15T17:00:00Z',
                    'assigned_to': 1,
                    'tags': ['document-review', 'urgent'],
                    'client_id': 5,
                },
                request_only=True,
            ),
        ],
        tags=['tasks'],
    )
    def create(self, request, *args, **kwargs):
        """Create a new task."""
        serializer = TaskCreateSerializer(data=request.data)
        if serializer.is_valid():
            task_obj = task_create(
                **serializer.validated_data,
                created_by=request.user
            )
            output_serializer = TaskOutputSerializer(task_obj)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Get task details",
        description="Retrieve a specific task by ID.",
        responses={
            200: TaskOutputSerializer,
            404: OpenApiTypes.OBJECT,
        },
        tags=['tasks'],
    )
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific task."""
        task_obj = task_get(kwargs.get('pk'))
        if not task_obj or task_obj.assigned_to != request.user:
            return Response(
                {'error': 'Task not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TaskOutputSerializer(task_obj)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Update task",
        description="Update task fields. Use PUT for full update or PATCH for partial update.",
        request=TaskUpdateSerializer,
        responses={
            200: TaskOutputSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Update task priority and status',
                value={
                    'priority': TaskPriority.URGENT.value,
                    'status': TaskStatus.IN_PROGRESS.value,
                },
                request_only=True,
            ),
            OpenApiExample(
                'Update task details',
                value={
                    'title': 'Updated task title',
                    'detail': 'Updated task description',
                    'due_date': '2025-12-20T17:00:00Z',
                    'tags': ['updated', 'in-progress'],
                },
                request_only=True,
            ),
        ],
        tags=['tasks'],
    )
    def update(self, request, *args, **kwargs):
        """Update a task (PUT)."""
        return self._update_task(request, kwargs.get('pk'), partial=False)
    
    @extend_schema(
        summary="Partially update task",
        description="Update specific task fields without providing all fields.",
        request=TaskUpdateSerializer,
        responses={
            200: TaskOutputSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Mark as in progress',
                value={'status': TaskStatus.IN_PROGRESS.value},
                request_only=True,
            ),
            OpenApiExample(
                'Change priority',
                value={'priority': 'HIGH'},
                request_only=True,
            ),
        ],
        tags=['tasks'],
    )
    def partial_update(self, request, *args, **kwargs):
        """Update a task (PATCH)."""
        return self._update_task(request, kwargs.get('pk'), partial=True)
    
    def _update_task(self, request, task_id, partial=False):
        """Internal method to handle task updates."""
        task_obj = task_get(task_id)
        if not task_obj or task_obj.assigned_to != request.user:
            return Response(
                {'error': 'Task not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TaskUpdateSerializer(data=request.data, partial=partial)
        if serializer.is_valid():
            updated_task = task_update(task_id, request.user, **serializer.validated_data)
            if updated_task:
                output_serializer = TaskOutputSerializer(updated_task)
                return Response(output_serializer.data)
            return Response(
                {'error': 'Failed to update task'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        summary="Delete task",
        description="Soft delete a task.",
        responses={
            204: None,
            404: OpenApiTypes.OBJECT,
        },
        tags=['tasks'],
    )
    def destroy(self, request, *args, **kwargs):
        """Delete a task (soft delete)."""
        success = task_delete(kwargs.get('pk'), request.user)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Task not found or access denied'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @extend_schema(
        summary="Mark task as completed",
        description="Mark a specific task as completed.",
        request=None,
        responses={
            200: TaskOutputSerializer,
            404: OpenApiTypes.OBJECT,
        },
        tags=['tasks'],
    )
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark a task as completed."""
        task_obj = task_mark_completed(pk, request.user)
        if task_obj:
            serializer = TaskOutputSerializer(task_obj)
            return Response(serializer.data)
        return Response(
            {'error': 'Task not found or access denied'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @extend_schema(
        summary="Mark task as cancelled",
        description="Mark a specific task as cancelled.",
        request=None,
        responses={
            200: TaskOutputSerializer,
            404: OpenApiTypes.OBJECT,
        },
        tags=['tasks'],
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Mark a task as cancelled."""
        task_obj = task_mark_cancelled(pk, request.user)
        if task_obj:
            serializer = TaskOutputSerializer(task_obj)
            return Response(serializer.data)
        return Response(
            {'error': 'Task not found or access denied'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @extend_schema(
        summary="Add comment to task",
        description="Add a comment to a task.",
        request={
            'type': 'object',
            'properties': {
                'comment': {
                    'type': 'string',
                    'description': 'Comment text',
                }
            },
            'required': ['comment'],
        },
        responses={
            200: TaskOutputSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Add comment',
                value={'comment': 'All documents have been verified and are complete.'},
                request_only=True,
            ),
        ],
        tags=['tasks'],
    )
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to a task."""
        comment_text = request.data.get('comment')
        if not comment_text:
            return Response(
                {'error': 'Comment text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task_obj = task_add_comment(pk, request.user, comment_text)
        if task_obj:
            serializer = TaskOutputSerializer(task_obj)
            return Response(serializer.data)
        return Response(
            {'error': 'Task not found or access denied'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @extend_schema(
        summary="Get overdue tasks",
        description="Get all overdue tasks for the authenticated user.",
        request=None,
        responses={200: TaskOutputSerializer(many=True)},
        tags=['tasks'],
    )
    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue tasks."""
        tasks = task_get_overdue(request.user)
        serializer = TaskOutputSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get tasks due soon",
        description="Get tasks due within a specified number of days (default: 3 days).",
        parameters=[
            OpenApiParameter(
                name='days',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Number of days to look ahead (default: 3)',
                required=False,
            ),
        ],
        responses={200: TaskOutputSerializer(many=True)},
        tags=['tasks'],
    )
    @action(detail=False, methods=['get'])
    def due_soon(self, request):
        """Get tasks due soon."""
        days = int(request.query_params.get('days', settings.TASKS_DUE_SOON_DEFAULT_DAYS))
        tasks = task_get_due_soon(request.user, days)
        serializer = TaskOutputSerializer(tasks, many=True)
        return Response(serializer.data)