"""
Branch model for office locations within a tenant.
"""

from django.db import models
from immigration.models.region import Region
from immigration.models.base import LifeCycleModel, SoftDeletionModel


class Branch(LifeCycleModel, SoftDeletionModel):
    """
    Represents a physical or logical office location within a Tenant.

    Schema-per-tenant: No tenant FK needed (automatic isolation via PostgreSQL schemas)

    Branches are the primary organizational unit for data scoping.
    Consultants and Branch Admins work within a specific branch.
    """

    # REMOVED: tenant FK (schema provides tenant isolation)
    # tenant = models.ForeignKey('Tenant', ...)

    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        related_name='branches',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=100, unique=True)
    phone = models.CharField(max_length=15, blank=True)
    website = models.CharField(max_length=100, blank=True)
    street = models.CharField(max_length=100, blank=True)
    suburb = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, blank=True)

    class Meta:
        db_table = 'immigration_branch'
        # REMOVED: unique_together with tenant (unique by name within schema)
        indexes = [
            # REMOVED: tenant indexes (no longer needed)
            models.Index(fields=['region']),
            models.Index(fields=['name']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return self.name
