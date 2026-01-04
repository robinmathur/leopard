"""
Task views for API layer.

These views handle HTTP requests for task endpoints.
Business logic lives in services - views are thin wrappers.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q
from django.utils import timezone
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
    task_claim_from_branch,
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
        Get tasks based on filters.

        Behavior:
        - Returns ALL tasks by default (no role-based restrictions)
        - If assigned_to_me=true: returns only tasks assigned to current user
        """
        from immigration.models.task import Task
        from django.contrib.contenttypes.models import ContentType

        # Handle schema generation
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()

        # Get query parameters for filtering
        assigned_to_me = self.request.query_params.get('assigned_to_me', 'false').lower() == 'true'
        content_type = self.request.query_params.get('content_type')
        object_id = self.request.query_params.get('object_id')
        client_id = self.request.query_params.get('client')

        if assigned_to_me:
            # Check user's role to determine what tasks to show
            from immigration.constants import GROUP_BRANCH_ADMIN, GROUP_REGION_MANAGER, GROUP_SUPER_ADMIN

            # Check if user is branch admin or above
            is_admin = self.request.user.groups.filter(name__in=[
                GROUP_BRANCH_ADMIN,
                GROUP_REGION_MANAGER,
                GROUP_SUPER_ADMIN,
            ]).exists()

            if is_admin:
                # For admins: Show tasks assigned to them OR tasks assigned to their branches
                user_branch_ids = list(self.request.user.branches.values_list('id', flat=True))
                queryset = Task.objects.filter(
                    Q(assigned_to=self.request.user) |
                    Q(branch_id__in=user_branch_ids)
                )
            else:
                # For consultants: Show only tasks assigned directly to them
                queryset = Task.objects.filter(assigned_to=self.request.user)
        else:
            # Default: show ALL tasks (no restrictions)
            queryset = Task.objects.all()

        # Use select_related to optimize queries
        queryset = queryset.select_related(
            'assigned_to', 'assigned_by', 'content_type', 'branch'
        )

        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by priority if provided
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        # Filter by content_type and object_id if provided (for generic FK)
        if content_type and object_id:
            try:
                ct = ContentType.objects.get(id=int(content_type))
                queryset = queryset.filter(content_type=ct, object_id=int(object_id))
            except (ContentType.DoesNotExist, ValueError):
                pass
        
        # Support client filter via generic FK
        if client_id:
            try:
                client_content_type = ContentType.objects.get(app_label='immigration', model='client')
                queryset = queryset.filter(content_type=client_content_type, object_id=int(client_id))
            except (ContentType.DoesNotExist, ValueError):
                pass
        
        # Filter overdue tasks if needed
        include_overdue_default = getattr(settings, 'TASKS_INCLUDE_OVERDUE_DEFAULT', 'true')
        include_overdue = self.request.query_params.get('include_overdue', str(include_overdue_default)).lower() == 'true'
        if not include_overdue:
            queryset = queryset.filter(
                Q(due_date__gte=timezone.now()) |
                Q(status__in=[TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value])
            )
        
        return queryset.order_by('-due_date', '-created_at')
    
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
        description="Get all tasks (no role-based restrictions). Can filter by status, priority, content_type, object_id, assigned_to_me, and overdue.",
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
                name='content_type',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by ContentType ID (for generic foreign key queries)',
                required=False,
            ),
            OpenApiParameter(
                name='object_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by object ID (for generic foreign key queries, use with content_type)',
                required=False,
            ),
            OpenApiParameter(
                name='client',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by client ID (uses content_type + object_id)',
                required=False,
            ),
            OpenApiParameter(
                name='assigned_to_me',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Set to true to only return tasks assigned to current user or user\'s branches (default: false, returns all tasks)',
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
        """List all tasks."""
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
                    'content_type': 10,
                    'object_id': 5,
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
            validated_data = serializer.validated_data.copy()
            
            # Extract User objects from IDs (assigned_to is now optional)
            assigned_to = None
            if 'assigned_to' in validated_data and validated_data['assigned_to']:
                assigned_to_id = validated_data.pop('assigned_to')
                assigned_to = User.objects.get(id=assigned_to_id)
            else:
                validated_data.pop('assigned_to', None)  # Remove if present but None
            
            # Extract branch_id
            branch_id = validated_data.pop('branch_id', None)
            
            assigned_by = None
            if 'assigned_by' in validated_data and validated_data['assigned_by']:
                assigned_by_id = validated_data.pop('assigned_by')
                assigned_by = User.objects.get(id=assigned_by_id)
            else:
                # Default to request.user if not provided
                assigned_by = request.user
            
            # Extract and convert entity linking fields (multi-tenant safe)
            linked_entity_type = validated_data.pop('linked_entity_type', None)
            linked_entity_id = validated_data.pop('linked_entity_id', None)
            content_type_id = None
            object_id = None

            if linked_entity_type and linked_entity_id:
                from django.contrib.contenttypes.models import ContentType
                try:
                    ct = ContentType.objects.get(
                        app_label='immigration',
                        model=linked_entity_type.lower()
                    )
                    content_type_id = ct.id
                    object_id = linked_entity_id
                except ContentType.DoesNotExist:
                    return Response(
                        {'error': f'Invalid entity type: {linked_entity_type}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            task_obj = task_create(
                assigned_to=assigned_to,
                branch_id=branch_id,
                assigned_by=assigned_by,
                content_type=content_type_id,
                object_id=object_id,
                created_by=request.user,
                **validated_data
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
        if not task_obj:
            return Response(
                {'error': 'Task not found'},
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
        if not task_obj:
            return Response(
                {'error': 'Task not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Permission check is handled in task_update service
        serializer = TaskUpdateSerializer(data=request.data, partial=partial)
        if serializer.is_valid():
            validated_data = serializer.validated_data.copy()
            
            # Handle assigned_to if provided (can be null to unassign)
            if 'assigned_to' in validated_data:
                assigned_to_id = validated_data.pop('assigned_to')
                if assigned_to_id is not None:
                    validated_data['assigned_to'] = User.objects.get(id=assigned_to_id)
                    # When assigning to a user, clear branch assignment
                    validated_data['branch'] = None
                else:
                    validated_data['assigned_to'] = None
            
            # Handle branch_id if provided (can be null to unassign)
            if 'branch_id' in validated_data:
                branch_id = validated_data.pop('branch_id')
                if branch_id is not None:
                    from immigration.models.branch import Branch
                    validated_data['branch'] = Branch.objects.get(id=branch_id)
                    # When assigning to a branch, clear user assignment
                    validated_data['assigned_to'] = None
                else:
                    validated_data['branch'] = None
            
            # Handle assigned_by if provided
            if 'assigned_by' in validated_data and validated_data['assigned_by']:
                assigned_by_id = validated_data.pop('assigned_by')
                validated_data['assigned_by'] = User.objects.get(id=assigned_by_id)

            # Handle entity linking (multi-tenant safe)
            linked_entity_type = validated_data.pop('linked_entity_type', None)
            linked_entity_id = validated_data.pop('linked_entity_id', None)

            if linked_entity_type and linked_entity_id:
                from django.contrib.contenttypes.models import ContentType
                try:
                    ct = ContentType.objects.get(
                        app_label='immigration',
                        model=linked_entity_type.lower()
                    )
                    validated_data['content_type'] = ct
                    validated_data['object_id'] = linked_entity_id
                except ContentType.DoesNotExist:
                    return Response(
                        {'error': f'Invalid entity type: {linked_entity_type}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            updated_task = task_update(task_id, request.user, **validated_data)
            if updated_task:
                output_serializer = TaskOutputSerializer(updated_task)
                return Response(output_serializer.data)
            return Response(
                {'error': 'Task not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
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
    
    @extend_schema(
        summary="Claim branch task",
        description="Claim a branch-assigned task for the current user. The task will be assigned to the user and removed from the branch pool.",
        request=None,
        responses={
            200: TaskOutputSerializer,
            400: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
        },
        tags=['tasks'],
    )
    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """Claim a branch-assigned task."""
        try:
            task_obj = task_claim_from_branch(pk, request.user)
            if task_obj:
                serializer = TaskOutputSerializer(task_obj)
                return Response(serializer.data)
            return Response(
                {'error': 'Task not found or cannot be claimed'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )