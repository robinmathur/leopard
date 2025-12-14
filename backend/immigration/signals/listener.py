from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from immigration.client.client import Client
from immigration.client.history.client_history import ClientHistory
from immigration.client.history.history_manager import HistoryManager
from immigration.models.task import Task
from immigration.models.client_activity import ClientActivity
from immigration.models.client import Client as ClientModel
from immigration.services.notifications import notification_create
from immigration.constants import NotificationType


# @receiver(post_save, sender=Client)
# def create_client_history(sender, instance, created, **kwargs):
#     if created:
#         # Create an associated ClientHistory with an empty history
#         client_history = ClientHistory.objects.create(client=instance, entries={})
#         new_entry = HistoryManager.client_created()
#         client_history.entries.append(new_entry)
#         client_history.save()


@receiver(pre_save, sender=Task)
def track_task_status_change(sender, instance, **kwargs):
    """Track task status changes and create ClientActivity records."""
    if instance.pk:  # Only for existing tasks
        try:
            old_task = Task.objects.get(pk=instance.pk)
            # Check if status changed
            if old_task.status != instance.status:
                # Get the client from linked_entity or legacy client_id
                client = None
                
                # Try generic FK first
                if instance.content_type and instance.object_id:
                    try:
                        client_content_type = ContentType.objects.get(app_label='immigration', model='client')
                        if instance.content_type == client_content_type:
                            from immigration.models.client import Client
                            client = Client.objects.get(id=instance.object_id)
                    except (ContentType.DoesNotExist, Client.DoesNotExist):
                        pass
                
                # Fallback to legacy client_id
                if not client and instance.client_id:
                    from immigration.models.client import Client
                    try:
                        client = Client.objects.get(id=instance.client_id)
                    except Client.DoesNotExist:
                        pass
                
                # Create ClientActivity if we have a client
                if client:
                    activity_type = None
                    if instance.status == 'COMPLETED':
                        activity_type = 'TASK_COMPLETED'
                    elif instance.status == 'IN_PROGRESS':
                        activity_type = 'TASK_IN_PROGRESS'
                    elif instance.status == 'CANCELLED':
                        activity_type = 'TASK_CANCELLED'
                    
                if activity_type:
                    performed_by = instance.updated_by or instance.assigned_by or instance.created_by
                    if performed_by:
                        ClientActivity.objects.create(
                            client=client,
                            activity_type=activity_type,
                            performed_by=performed_by,
                            description=f'Task "{instance.title}" status changed to {instance.get_status_display()}',
                            metadata={
                                'task_id': instance.id,
                                'old_status': old_task.status,
                                'new_status': instance.status,
                            }
                        )
        except Task.DoesNotExist:
            pass  # New task, no status change to track


@receiver(pre_save, sender=ClientModel)
def track_client_assignment_change(sender, instance, **kwargs):
    """Track client assignment changes and create notifications."""
    if instance.pk:  # Only for existing clients
        try:
            old_client = ClientModel.objects.get(pk=instance.pk)
            # Check if assigned_to changed
            if old_client.assigned_to != instance.assigned_to and instance.assigned_to:
                # Store the new assigned_to in a temporary attribute for post_save
                instance._new_assigned_to = instance.assigned_to
                instance._old_assigned_to = old_client.assigned_to
        except ClientModel.DoesNotExist:
            pass


@receiver(post_save, sender=ClientModel)
def notify_client_assignment(sender, instance, created, **kwargs):
    """Create notification when client is assigned to a user."""
    # Handle assignment change (not creation)
    if not created and hasattr(instance, '_new_assigned_to') and instance._new_assigned_to:
        new_assigned_to = instance._new_assigned_to
        old_assigned_to = getattr(instance, '_old_assigned_to', None)
        
        # Only create notification if assignment actually changed
        if new_assigned_to != old_assigned_to:
            # Get client name
            client_name = instance.full_name or f"Client {instance.id}"
            
            # Create notification for the newly assigned user
            notification_create(
                notification_type=NotificationType.CLIENT_ASSIGNED.value,
                assigned_to=new_assigned_to,
                title=f'Client Assigned: {client_name}',
                message=f'Client "{client_name}" has been assigned to you.',
                meta_info={
                    'client_id': instance.id,
                    'client_name': client_name,
                },
                created_by=instance.updated_by or instance.created_by,
            )
            
            # Create ClientActivity record
            performed_by = instance.updated_by or instance.created_by
            if performed_by:
                assigned_to_name = f"{new_assigned_to.first_name} {new_assigned_to.last_name}".strip() or new_assigned_to.username
                ClientActivity.objects.create(
                    client=instance,
                    activity_type='ASSIGNED',
                    performed_by=performed_by,
                    description=f'Client assigned to {assigned_to_name}',
                    metadata={
                        'assigned_to_id': new_assigned_to.id,
                        'assigned_to_name': assigned_to_name,
                        'old_assigned_to_id': old_assigned_to.id if old_assigned_to else None,
                    }
                )
        
        # Clean up temporary attributes
        if hasattr(instance, '_new_assigned_to'):
            delattr(instance, '_new_assigned_to')
        if hasattr(instance, '_old_assigned_to'):
            delattr(instance, '_old_assigned_to')


@receiver(post_save, sender=Task)
def track_task_creation(sender, instance, created, **kwargs):
    """Track task creation and create ClientActivity record."""
    if created:
        # Get the client from linked_entity or legacy client_id
        client = None
        
        # Try generic FK first
        if instance.content_type and instance.object_id:
            try:
                client_content_type = ContentType.objects.get(app_label='immigration', model='client')
                if instance.content_type == client_content_type:
                    from immigration.models.client import Client
                    client = Client.objects.get(id=instance.object_id)
            except (ContentType.DoesNotExist, Client.DoesNotExist):
                pass
        
        # Fallback to legacy client_id
        if not client and instance.client_id:
            from immigration.models.client import Client
            try:
                client = Client.objects.get(id=instance.client_id)
            except Client.DoesNotExist:
                pass
        
        # Create ClientActivity if we have a client
        if client:
            performed_by = instance.created_by or instance.assigned_by
            if performed_by:
                ClientActivity.objects.create(
                    client=client,
                    activity_type='TASK_CREATED',
                    performed_by=performed_by,
                    description=f'Task "{instance.title}" created and assigned to {instance.assigned_to.get_full_name() or instance.assigned_to.username}',
                    metadata={
                        'task_id': instance.id,
                        'assigned_to_id': instance.assigned_to.id,
                        'priority': instance.priority,
                        'due_date': instance.due_date.isoformat() if instance.due_date else None,
                    }
                )
