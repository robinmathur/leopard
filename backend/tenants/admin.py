"""
Admin interface for Tenant management.
"""

from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Tenant, Domain


@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    """
    Admin interface for Tenant model.

    TenantAdminMixin provides special handling for tenant administration.
    """

    list_display = (
        'name',
        'schema_name',
        'is_active',
        'subscription_status',
        'max_users',
        'created_at'
    )
    list_filter = ('is_active', 'subscription_status', 'created_at')
    search_fields = ('name', 'schema_name', 'contact_email')
    readonly_fields = ('schema_name', 'created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'schema_name', 'is_active')
        }),
        ('Subscription', {
            'fields': ('subscription_status', 'max_users')
        }),
        ('Contact', {
            'fields': ('contact_email', 'contact_phone')
        }),
        ('Configuration', {
            'fields': ('settings',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    """
    Admin interface for Domain model.

    Manages subdomain → tenant mappings.
    """

    list_display = ('domain', 'tenant', 'is_primary')
    list_filter = ('is_primary',)
    search_fields = ('domain', 'tenant__name', 'tenant__schema_name')
    raw_id_fields = ('tenant',)

    fieldsets = (
        (None, {
            'fields': ('domain', 'tenant', 'is_primary')
        }),
    )
