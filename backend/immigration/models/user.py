"""
Extended User model with group-based access and multi-tenant scoping.

SIMPLIFIED: No role field - uses Django Groups only.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Extended User model for multi-tenant CRM.

    Schema-per-tenant: No tenant FK needed (automatic isolation via PostgreSQL schemas)

    Groups (instead of roles):
    - SUPER_SUPER_ADMIN: System-wide access (stored in public schema)
    - SUPER_ADMIN: Tenant-scoped, can create all other groups (in tenant schema)
    - REGION_MANAGER: Multiple regions access
    - BRANCH_ADMIN: Multiple branches access
    - CONSULTANT: Limited access

    Note:
    - User permissions are managed via Django Groups
    - No role field - group membership determines access
    - SUPER_ADMIN group has special permission to create/manage users
    - Tenant isolation provided by PostgreSQL schema (not FK)
    """

    # REMOVED: tenant FK (schema provides tenant isolation)
    # tenant = models.ForeignKey('Tenant', ...)

    # Multiple branches assignment
    branches = models.ManyToManyField(
        'Branch',
        related_name='assigned_users',
        blank=True,
        help_text='Branch assignments'
    )

    # Multiple regions assignment
    regions = models.ManyToManyField(
        'Region',
        related_name='assigned_users',
        blank=True,
        help_text='Region assignments'
    )

    class Meta:
        db_table = 'immigration_user'
        indexes = [
            # REMOVED: tenant index (no longer needed)
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        groups_str = ', '.join([g.name for g in self.groups.all()]) or 'No Group'
        return f"{self.username} ({groups_str})"
    
    def get_primary_group(self):
        """Get the user's primary group (first group)."""
        return self.groups.first()
    
    def is_in_group(self, group_name):
        """Check if user is in a specific group."""
        return self.groups.filter(name=group_name).exists()
    
    def get_all_permissions_list(self):
        """
        Get all permissions for this user including from groups.
        Returns a list of permission codenames.
        """
        from django.contrib.auth.models import Permission
        
        # Get user's direct permissions
        user_perms = set(self.user_permissions.values_list('codename', 'content_type__app_label'))
        
        # Get permissions from groups
        group_perms = set(
            Permission.objects.filter(group__user=self)
            .values_list('codename', 'content_type__app_label')
        )
        
        # Combine and format
        all_perms = user_perms | group_perms
        return [f"{app_label}.{codename}" for codename, app_label in all_perms]
