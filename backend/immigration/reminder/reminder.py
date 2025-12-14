from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from rest_framework import serializers, viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend

from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration import serializer, pagination

User = get_user_model()


class Reminder(models.Model):
    # Generic foreign key fields
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    title = models.CharField(max_length=255)
    reminder_date = models.DateField(null=True, blank=True)
    reminder_time = models.TimeField(null=True, blank=True, help_text="Optional time for the reminder")
    meta_info = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        User,
        related_name="reminder_created",
        on_delete=models.DO_NOTHING,
        null=True,
        default=None
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    notification_created = models.BooleanField(default=False, help_text="Whether notification has been created for this reminder")

    def __str__(self):
        return f"{self.title} - {self.reminder_date}"
    
    class Meta:
        ordering = ['-reminder_date', '-reminder_time']
        indexes = [
            models.Index(fields=['reminder_date', 'reminder_time', 'notification_created']),
        ]


class ReminderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ['reminder_date', 'reminder_time', 'title', 'meta_info', 'created_by', 'created_at', 
                  'read', 'is_completed', 'content_type', 'object_id']
        read_only_fields = ['created_by', 'created_at']


class ReminderSerializer(ReminderCreateSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'reminder_date', 'reminder_time', 'title', 'meta_info', 'created_by', 
                  'created_by_name', 'created_at', 'read', 'is_completed', 'notification_created',
                  'content_type', 'object_id']
        read_only_fields = ['created_by', 'created_at', 'notification_created']


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    queryset = Reminder.objects.all()
    http_method_names = ['get', 'delete', 'patch', 'post']
    pagination_class = pagination.NotificationPagination
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering = ["-reminder_date", "-reminder_time"]
    filterset_fields = ['content_type', 'object_id', 'is_completed', 'read']

    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'create':
            return ReminderCreateSerializer
        return ReminderSerializer

    def perform_create(self, serializer):
        """Automatically set created_by to the current user."""
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Create a new reminder.
        
        Uses ReminderCreateSerializer for validation and ReminderSerializer for response
        to ensure created_by_name is included.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use ReminderSerializer for response to include created_by_name
        output_serializer = ReminderSerializer(serializer.instance, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        Supports filtering by content_type, object_id, is_completed, and read status.
        """
        queryset = super().get_queryset()
        
        # Filter by content_type if provided
        content_type = self.request.query_params.get('content_type')
        if content_type:
            queryset = queryset.filter(content_type=content_type)
        
        # Filter by object_id if provided
        object_id = self.request.query_params.get('object_id')
        if object_id:
            queryset = queryset.filter(object_id=object_id)
        
        # Filter by completion status if provided
        is_completed = self.request.query_params.get('is_completed')
        if is_completed is not None:
            queryset = queryset.filter(is_completed=is_completed.lower() == 'true')
        
        # Filter by read status if provided
        read = self.request.query_params.get('read')
        if read is not None:
            queryset = queryset.filter(read=read.lower() == 'true')
        
        return queryset

    @action(detail=True, methods=['post'], url_path='completed')
    def mark_completed(self, request, pk=None):
        """Mark a reminder as completed."""
        reminder = self.get_object()
        reminder.is_completed = True
        reminder.save(update_fields=['is_completed'])
        
        serializer = self.get_serializer(reminder)
        return Response(serializer.data, status=status.HTTP_200_OK)
