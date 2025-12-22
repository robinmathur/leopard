"""
Tenant models for multi-tenant architecture.

Uses django-tenants for PostgreSQL schema-per-tenant isolation.
"""

from django_tenants.models import TenantMixin, DomainMixin
from django.db import models


class Tenant(TenantMixin):
    """
    Tenant model - stored in public schema.

    Each tenant gets its own PostgreSQL schema (e.g., tenant_acme, tenant_demo).
    Replaces the old immigration.Tenant model.

    auto_create_schema=True means PostgreSQL schemas are created automatically
    when a tenant is saved.
    """

    name = models.CharField(max_length=200, unique=True, help_text="Company/Organization name")

    # From old Tenant model
    is_active = models.BooleanField(default=True)

    SUBSCRIPTION_STATUS_CHOICES = [
        ('TRIAL', 'Trial'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
        ('CANCELLED', 'Cancelled'),
    ]
    subscription_status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='TRIAL'
    )

    settings = models.JSONField(default=dict, blank=True, help_text="Tenant-specific configuration")
    max_users = models.IntegerField(default=50, help_text="Maximum users allowed")

    # Contact information
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Auto-create PostgreSQL schema when tenant is created
    auto_create_schema = True

    class Meta:
        db_table = 'public.tenants'
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'
        ordering = ['name']

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    """
    Domain model - links domains/subdomains to tenants.

    Stored in public schema.

    Examples:
    - acme.leopard.com → maps to tenant_acme schema
    - demo.localhost → maps to tenant_demo schema (for development)

    TenantMainMiddleware uses this to route requests to correct tenant schema.
    """

    class Meta:
        db_table = 'public.domains'
        verbose_name = 'Domain'
        verbose_name_plural = 'Domains'

    def __str__(self):
        return self.domain
