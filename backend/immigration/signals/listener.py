from django.db.models.signals import post_save
from django.dispatch import receiver

from immigration.client.client import Client
from immigration.client.history.client_history import ClientHistory
from immigration.client.history.history_manager import HistoryManager


# @receiver(post_save, sender=Client)
# def create_client_history(sender, instance, created, **kwargs):
#     if created:
#         # Create an associated ClientHistory with an empty history
#         client_history = ClientHistory.objects.create(client=instance, entries={})
#         new_entry = HistoryManager.client_created()
#         client_history.entries.append(new_entry)
#         client_history.save()
