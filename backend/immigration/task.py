from django.db import models
from rest_framework import serializers, status
from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.response import Response

from immigration.constants import TaskPriority, TaskStatus, RESOURCE_MAPPING
from immigration.models import LifeCycleModel
from immigration.serializer import LifeCycleAwareSerializer, ForeignKeySerializer
from immigration.utils.utils import ModelUtils
from immigration.views import LifeCycleViewSet
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime

User = get_user_model()


class Task(LifeCycleModel):
    title = models.CharField(max_length=255)
    detail = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=TaskPriority.choices(), default=TaskPriority.LOW.value)
    due_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        User,
        related_name="task_assigned",
        on_delete=models.CASCADE,
        null=True,
        default=None
    )
    tags = models.JSONField(default=list)

    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=TaskStatus.choices(), default=TaskStatus.PENDING.value)
    comments = models.JSONField(default=list)

    def __str__(self):
        return f"{self.title} - {self.priority}"


class TaskTagSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=255)
    type = serializers.CharField(max_length=255)

    def to_representation(self, tag_data):
        tag_data['name'] = str(ModelUtils.get_model_composite_key(tag_data))
        return tag_data


class CommentContentSerializer(serializers.Serializer):
    child = serializers.CharField()  # This will handle both strings and objects

    def to_representation(self, data):
        if dict == type(data):
            data['name'] = str(ModelUtils.get_model(data.get('type'), data.get('id')))
        return data  # No special transformation needed here


class CommentAddedBySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    # type = serializers.CharField(max_length=20)

    def to_representation(self, data):
        user = ModelUtils.get_model(RESOURCE_MAPPING.get_reverse(data.get('type')), data.get('id'))
        data['name'] = str(user)
        return data


class CommentSerializer(serializers.Serializer):
    comment = serializers.ListField(
        child=serializers.JSONField(),
        help_text="A list containing text and entity references (tags)."
    )
    comment_date = serializers.DateTimeField()
    added_by = CommentAddedBySerializer()

    def validate_comment(self, value):
        for item in value:
            if isinstance(item, dict):
                if 'id' not in item or 'type' not in item:
                    raise serializers.ValidationError("Each tag must contain 'id' and 'type'.")
        return value

    def to_representation(self, instance):
        # Custom logic to structure the 'comment' field with text and tags
        comment_data = []
        for item in instance['comment']:
            if isinstance(item, dict):
                comment_data.append({
                    'id': item['id'],
                    'type': item['type'],
                    'name': str(ModelUtils.get_model(RESOURCE_MAPPING.get_reverse(item['type']), item.get('id')))
                })
            else:
                comment_data.append(item)
        instance['comment'] = comment_data
        return super().to_representation(instance)


class TaskSerializer(LifeCycleAwareSerializer):
    tags = TaskTagSerializer(many=True)
    assigned_to = ForeignKeySerializer(queryset=User.objects.all(), required=False)

    class Meta(LifeCycleAwareSerializer.Meta):
        model = Task
        fields = ['id', 'title', 'priority', 'due_date', 'assigned_to', 'tags', 'status']

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Add custom field 'comments_count'
        representation['comments_count'] = len(instance.comments)
        return representation


class TaskCommentSerializer(LifeCycleAwareSerializer):
    tags = TaskTagSerializer(many=True)
    assigned_to = ForeignKeySerializer(queryset=User.objects.all(), required=False)
    comments = CommentSerializer(many=True)

    class Meta(LifeCycleAwareSerializer.Meta):
        model = Task
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Add custom field 'comments_count'
        representation['comments_count'] = len(instance.comments)
        return representation


class TaskViewSet(LifeCycleViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['priority', 'assigned_to', 'status']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('assigned_to'):
            serializer.validated_data['assigned_to'] = self.request.user
        super().perform_create(serializer)

    def retrieve(self, request, *args, **kwargs):
        # Retrieve the task instance
        instance = self.get_object()

        # Use the serializer to get the enhanced data with comments
        serializer = TaskCommentSerializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='comments')
    def add_comment(self, request, pk=None):
        task = self.get_object()  # Get the task instance
        serializer = CommentSerializer(data=request.data)

        if serializer.is_valid():
            comment_data = serializer.validated_data

            # Store the comment in a structured format
            new_comment = {
                "comment": comment_data['comment'],  # The comment text and tags
                "comment_date": str(datetime.now()),
                "added_by": {
                    "id": request.user.id,
                    "type": RESOURCE_MAPPING.get_forward(type(request.user).__name__)
                }
            }

            # Append the new comment to the existing comments in the Task
            task.comments.append(new_comment)
            task.save()

            return Response({'status': 'comment added'}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
