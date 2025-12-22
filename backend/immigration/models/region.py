"""
Region model for grouping branches under regional management.
"""

from django.db import models


class Region(models.Model):
    """
    Groups branches for regional management hierarchy.

    Schema-per-tenant: No tenant FK needed (automatic isolation via PostgreSQL schemas)

    Regions are organizational groupings within a tenant,
    allowing Region Managers to oversee multiple branches.
    """

    # REMOVED: tenant FK (schema provides tenant isolation)
    # tenant = models.ForeignKey('Tenant', ...)

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'immigration_region'
        # REMOVED: unique_together with tenant (unique by name within schema)
        indexes = [
            # REMOVED: tenant index (no longer needed)
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name
