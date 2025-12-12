from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from immigration.application.application import Application
from immigration.client.client import Client
from immigration.client.history.client_history import ClientHistory
from immigration.client.history.history_manager import HistoryManager
from immigration.constants import NotificationType, ClientStage
from immigration.middleware import get_current_user
from immigration.notification_manager import NotificationManager
from immigration.visa.visa_application import VisaApplication


# Common signal handler utilities
def capture_previous_state(instance, model):
    instance._previous_state = model.objects.filter(pk=instance.pk).first() if instance.pk else None


def add_client_history(entries, client):
    if entries:
        client_history, _ = ClientHistory.objects.get_or_create(client=client)
        client_history.entries.extend(entries)
        client_history.save()


# Client signals
@receiver(pre_save, sender=Client)
def capture_previous_client_state(sender, instance, **kwargs):
    capture_previous_state(instance, Client)


@receiver(post_save, sender=Client)
def client_events(sender, instance, created, **kwargs):
    entries = []
    if created:
        # Create an entry for a newly created client
        entries.append(HistoryManager.client_created(get_current_user()))
    elif instance._previous_state:
        # Compare previous state with the current state
        previous_state = instance._previous_state
        current_state = instance
        if previous_state.assigned_to != current_state.assigned_to:
            # sending notification along with websocket update
            if instance.stage == ClientStage.LEAD.value:
                NotificationManager.create_notification(instance, NotificationType.LEAD_ASSIGNED,
                                                        get_current_user())
            # Add in client history
            entries.append(HistoryManager.client_assigned(current_state.assigned_to, previous_state.assigned_to,
                                                          get_current_user()))

        if previous_state.stage != current_state.stage:
            entries.append(HistoryManager.client_status_changed(previous_state.stage, current_state.stage,
                                                                get_current_user()))
    add_client_history(entries, instance)


# VisaApplication signals
@receiver(pre_save, sender=VisaApplication)
def capture_previous_visa_application_state(sender, instance, **kwargs):
    capture_previous_state(instance, VisaApplication)


@receiver(post_save, sender=VisaApplication)
def visa_application_events(sender, instance, created, **kwargs):
    entries = []
    if created:
        # Create an entries for a newly created VisaApplication
        if instance.assigned_to:
            NotificationManager.create_notification(instance, NotificationType.VISA_APPLICATION_ASSIGNED,
                                                    get_current_user())
        entries.append(HistoryManager.visa_application_created(instance, get_current_user(), instance.assigned_to))
    elif instance._previous_state:
        # Compare previous state with the current state
        previous_state = instance._previous_state
        current_state = instance
        if previous_state.assigned_to != current_state.assigned_to:
            # sending notification along with websocket update
            NotificationManager.create_notification(instance, NotificationType.VISA_APPLICATION_ASSIGNED,
                                                    get_current_user())
            # Add in client history for User assignment change
            entries.append(
                HistoryManager.visa_application_assigned(current_state.assigned_to, previous_state.assigned_to,
                                                         get_current_user()))

        if previous_state.status != current_state.status:
            # Add in client history for VisaApplication status change
            entries.append(HistoryManager.visa_application_status_changed(current_state, previous_state.status,
                                                                          current_state.status, get_current_user()))
    add_client_history(entries, instance.client)


# Application signals
@receiver(pre_save, sender=Application)
def capture_previous_application_state(sender, instance, **kwargs):
    capture_previous_state(instance, Application)


@receiver(post_save, sender=Application)
def application_events(sender, instance, created, **kwargs):
    entries = []
    if created:
        # Create an entries for a newly created VisaApplication
        if instance.assigned_to:
            NotificationManager.create_notification(instance, NotificationType.APPLICATION_ASSIGNED,
                                                    get_current_user())
        entries.append(HistoryManager.application_created(instance, get_current_user(), instance.assigned_to))
    elif instance._previous_state:
        # Compare previous state with the current state
        previous_state = instance._previous_state
        current_state = instance
        if previous_state.assigned_to != current_state.assigned_to:
            # sending notification along with websocket update
            NotificationManager.create_notification(instance, NotificationType.APPLICATION_ASSIGNED,
                                                    get_current_user())
            # Add in client history for User assignment change
            entries.append(HistoryManager.application_assigned(instance, get_current_user(), current_state.assigned_to,
                                                               previous_state.assigned_to))
    add_client_history(entries, instance.client)
