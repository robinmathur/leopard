from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from immigration.models import Client, VisaApplication
from immigration.constants import NotificationType, ClientStage
from immigration.middleware import get_current_user
from immigration.notification_manager import NotificationManager


# Common signal handler utilities
def capture_previous_state(instance, model):
    instance._previous_state = model.objects.filter(pk=instance.pk).first() if instance.pk else None


# Client signals
@receiver(pre_save, sender=Client)
def capture_previous_client_state(sender, instance, **kwargs):
    capture_previous_state(instance, Client)


@receiver(post_save, sender=Client)
def client_events(sender, instance, created, **kwargs):
    """Handle client create/update events."""
    if created:
        pass  # Client created - history tracking can be added here
    elif hasattr(instance, '_previous_state') and instance._previous_state:
        # Compare previous state with the current state
        previous_state = instance._previous_state
        current_state = instance
        if previous_state.assigned_to != current_state.assigned_to:
            # sending notification along with websocket update
            if instance.stage == ClientStage.LEAD.value:
                NotificationManager.create_notification(instance, NotificationType.LEAD_ASSIGNED,
                                                        get_current_user())


# VisaApplication signals
@receiver(pre_save, sender=VisaApplication)
def capture_previous_visa_application_state(sender, instance, **kwargs):
    capture_previous_state(instance, VisaApplication)


@receiver(post_save, sender=VisaApplication)
def visa_application_events(sender, instance, created, **kwargs):
    """Handle visa application create/update events."""
    if created:
        # Create notification for newly created VisaApplication
        if instance.assigned_to:
            NotificationManager.create_notification(instance, NotificationType.VISA_APPLICATION_ASSIGNED,
                                                    get_current_user())
    elif hasattr(instance, '_previous_state') and instance._previous_state:
        # Compare previous state with the current state
        previous_state = instance._previous_state
        current_state = instance
        if previous_state.assigned_to != current_state.assigned_to:
            # sending notification along with websocket update
            NotificationManager.create_notification(instance, NotificationType.VISA_APPLICATION_ASSIGNED,
                                                    get_current_user())
