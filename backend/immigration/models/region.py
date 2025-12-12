"""
Region model for grouping branches under regional management.
"""

from django.db import models
from immigration.models.tenant import Tenant


class Region(models.Model):
    """
    Groups branches for regional management hierarchy.
    
    Regions are organizational groupings within a tenant,
    allowing Region Managers to oversee multiple branches.
    """
    
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='regions'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'immigration_region'
        unique_together = [['tenant', 'name']]
        indexes = [
            models.Index(fields=['tenant']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.tenant.name})"
