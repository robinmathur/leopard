"""
Base models and abstract classes for the immigration app.

This module provides reusable abstract base classes for:
- Soft deletion functionality (SoftDeletionModel)
- Lifecycle tracking (LifeCycleModel)
"""

from django.db import models
from django.utils import timezone


class SoftDeletionManager(models.Manager):
    """
    Manager that automatically filters out soft-deleted records.
    
    Usage:
        MyModel.objects.all()  # Returns only non-deleted records
    """
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class SoftDeletionAllManager(models.Manager):
    """
    Manager to access all records including soft-deleted ones.
    
    Usage:
        MyModel.all_objects.all()  # Returns all records
    """
    pass


class SoftDeletionModel(models.Model):
    """
    Abstract base class providing soft deletion functionality.
    
    When delete() is called, sets deleted_at timestamp instead of
    actually removing the record from the database.
    
    Fields:
        deleted_at: Timestamp when record was soft-deleted (null if active)
    
    Managers:
        objects: Returns only non-deleted records
        all_objects: Returns all records including deleted
    
    Methods:
        delete(): Soft delete (sets deleted_at)
        hard_delete(): Permanently delete from database
        restore(): Restore a soft-deleted record
    
    Usage:
        class Client(SoftDeletionModel):
            name = models.CharField(max_length=100)
        
        client.delete()  # Soft delete
        client.hard_delete()  # Permanent delete
        client.restore()  # Undelete
    """
    
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        editable=False,
        help_text="Timestamp when record was soft-deleted"
    )
    
    objects = SoftDeletionManager()  # Default manager excludes deleted
    all_objects = SoftDeletionAllManager()  # Includes deleted records
    
    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        """
        Soft delete: set deleted_at timestamp instead of removing from DB.
        """
        self.deleted_at = timezone.now()
        self.save(using=using)
        return (0, {})
    
    def hard_delete(self):
        """
        Permanently delete record from database.
        Use with caution - this cannot be undone.
        """
        super().delete()
    
    def restore(self):
        """
        Restore a soft-deleted record by clearing deleted_at timestamp.
        """
        self.deleted_at = None
        self.save()
    
    @property
    def is_deleted(self):
        """Check if record is soft-deleted."""
        return self.deleted_at is not None


class LifeCycleModel(models.Model):
    """
    Abstract base class providing audit trail fields.

    Tracks who created/updated a record and when.

    Fields:
        created_by: User who created the record
        created_at: Timestamp when record was created
        updated_by: User who last updated the record
        updated_at: Timestamp when record was last updated

    Usage:
        class Client(LifeCycleModel):
            name = models.CharField(max_length=100)

        # In service layer:
        client = Client(name="John", created_by=request.user)
        client.save()
    """

    def get_user_model(self):
        """Get the User model dynamically to avoid circular imports."""
        from django.contrib.auth import get_user_model
        return get_user_model()

    created_by = models.ForeignKey(
        'immigration.User',  # Use string reference to avoid circular import
        on_delete=models.SET_NULL,
        related_name="%(class)s_created_by",
        null=True,
        blank=True,
        help_text="User who created this record"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when record was created"
    )
    updated_by = models.ForeignKey(
        'immigration.User',  # Use string reference to avoid circular import
        on_delete=models.SET_NULL,
        related_name="%(class)s_updated_by",
        null=True,
        blank=True,
        help_text="User who last updated this record"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when record was last updated"
    )

    class Meta:
        abstract = True
