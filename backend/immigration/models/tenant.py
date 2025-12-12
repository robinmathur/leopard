"""
Tenant model for multi-tenant CRM system.

Represents an independent immigration agency organization.
"""

from django.db import models


class Tenant(models.Model):
    """
    Represents an independent organization (immigration agency) using the system.
    
    Each tenant has complete data isolation from other tenants.
    All tenant-specific data (branches, users, clients) must reference this model.
    """
    
    SUBSCRIPTION_STATUS_CHOICES = [
        ('TRIAL', 'Trial'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    name = models.CharField(max_length=200, unique=True)
    domain = models.CharField(max_length=255, unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)  # type: ignore
    subscription_status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='TRIAL'
    )
    settings = models.JSONField(default=dict, blank=True)  # type: ignore
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'immigration_tenant'
        indexes = [
            models.Index(fields=['domain']),
            models.Index(fields=['is_active', 'subscription_status']),
        ]
    
    def __str__(self):
        return str(self.name)
