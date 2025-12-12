from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from rest_framework import serializers, viewsets, filters, status

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

    def __str__(self):
        return self.reminder_date + str(self.created_at)


class ReminderCreateSerializer(serializers.ModelSerializer):
    created_by = serializer.ForeignKeySerializer(queryset=User.objects.all(), required=False)

    class Meta:
        model = Reminder
        fields = ['reminder_date', 'title', 'meta_info', 'created_by', 'created_at', 'read',
                  'is_completed']


class ReminderSerializer(ReminderCreateSerializer):
    # reminder_date = serializers.DateTimeField()

    class Meta:
        model = Reminder
        fields = ['id', 'reminder_date', 'title', 'meta_info', 'created_by', 'created_at', 'read',
                  'is_completed']
        read_only_fields = ['created_by', 'created_at', 'meta_info']


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    queryset = Reminder.objects.all()
    http_method_names = ['get', 'delete', 'patch', 'post']  # TODO : remove post once implemented
    pagination_class = pagination.NotificationPagination
    filter_backends = (filters.OrderingFilter)
    ordering = ["-reminder_date"]

    @action(detail=True, methods=['post'], url_path='completed')
    def mark_completed(self, request, pk=None):
        reminder = self.get_object()  # Get the reminder instance

        reminder.is_completed = True
        reminder.save()

        return Response({'status': 'Reminder marked as completed'}, status=status.HTTP_200_OK)
