import logging

from . import consumers
from .constants import MODEL_NOTIFICATION_MAPPING, NotificationType
from django.contrib.auth import get_user_model
from django.utils import timezone

from .api.v1.serializers.notification import NotificationCreateSerializer

logger = logging.getLogger(__name__)

User = get_user_model()


class NotificationManager:
    @staticmethod
    def create_notification(instance, notification_type: NotificationType, created_by_user):
        """
        Create and serialize a Notification object based on the model instance and user.
        """
        try:
            mapping = MODEL_NOTIFICATION_MAPPING.get(notification_type.value)

            meta_info_func = mapping['meta_info']
            due_date = mapping['due_date']

            # Prepare the data for the serializer
            notification_data = {
                'type': notification_type.value,
                'due_date': due_date(instance),  # if due_date else None,
                'assigned_to': instance.assigned_to.id if instance.assigned_to else None,
                'meta_info': meta_info_func(instance),
                'created_by': {'id': created_by_user.id},
                'created_at': timezone.now()
            }

            # Create the Notification using the serializer
            serializer = NotificationCreateSerializer(data=notification_data)
            serializer.is_valid(raise_exception=True)
            notification = serializer.save()

            # Send the notification to the user
            consumers.send_message_to_user(notification.assigned_to.id, serializer.data)
        except Exception as e:
            logger.error(f"Error in create_notification: {e}")
            raise
