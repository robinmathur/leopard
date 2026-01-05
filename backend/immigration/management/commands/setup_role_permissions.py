"""
Management command to set up role-based groups and permissions.

This command creates Django Groups for each role and assigns appropriate
permissions based on the role hierarchy for a specific tenant.

Usage:
    python manage.py setup_role_permissions --tenant "Tenant Name"
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django_tenants.utils import schema_context

from tenants.models import Tenant
from immigration.constants import ALL_GROUPS, GROUP_DISPLAY_NAMES
from immigration.models import (
    User, Client, Branch, Region,
    VisaApplication, Task, Notification,
    Note, ClientActivity, ProfilePicture, Agent,
    Institute,
    InstituteContactPerson,
    InstituteLocation,
    InstituteIntake,
    InstituteRequirement,
    Course,
    BroadField,
    NarrowField,
    CourseLevel,
    ApplicationType,
    Stage,
    CollegeApplication,
    LPE,
    Proficiency,
    Qualification,
    Passport,
    Employment,
    CalendarEvent,
    VisaCategory,
    VisaType,
    Reminder,
)


class Command(BaseCommand):
    help = 'Set up role-based groups and permissions for a specific tenant'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            required=True,
            help='Tenant name (company/organization name)'
        )

    def handle(self, *args, **options):
        """Execute the command."""
        tenant_name = options['tenant']
        
        # Validate tenant exists in public schema
        with schema_context('public'):
            try:
                tenant = Tenant.objects.get(schema_name=f'tenant_{tenant_name}')
            except Tenant.DoesNotExist:
                raise CommandError(
                    f'Tenant "{tenant_name}" not found.'
                )
            
            schema_name = tenant.schema_name
        
        # Validate schema exists by attempting to switch to it
        try:
            with schema_context(schema_name):
                # Test query to ensure schema is accessible
                ContentType.objects.first()
        except Exception as e:
            raise CommandError(
                f'Schema "{schema_name}" validation failed: {e}\n'
                f'Please ensure the tenant schema exists and is accessible.'
            )
        
        self.stdout.write(
            f'Setting up role-based groups and permissions for tenant: {tenant_name} (schema: {schema_name})...'
        )
        
        # Execute all operations within the tenant's schema context
        with schema_context(schema_name):
            with transaction.atomic():
                self._create_groups()
                self._assign_permissions()
                self._sync_existing_users()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully set up role permissions for tenant: {tenant_name}!'
            )
        )

    def _create_groups(self):
        """Create a Group for each group name."""
        self.stdout.write('Creating groups...')
        
        for group_name in ALL_GROUPS:
            group_label = GROUP_DISPLAY_NAMES.get(group_name, group_name)
            group, created = Group.objects.get_or_create(name=group_name)
            if created:
                self.stdout.write(f'  Created group: {group_label}')
            else:
                self.stdout.write(f'  Group already exists: {group_label}')

    def _assign_permissions(self):
        """Assign permissions to groups based on role hierarchy."""
        self.stdout.write('Assigning permissions to groups...')
        
        # Get all permissions dynamically, excluding the same ones as the permission API
        # Exclude admin-related permissions
        excluded_apps = ['admin', 'contenttypes', 'sessions', 'token_blacklist', 'tenants']
        all_permissions = Permission.objects.select_related('content_type').exclude(
            content_type__app_label__in=excluded_apps
        )
        
        # Filter out system permissions (Group, Permission, EventProcessingControl, Event)
        from django.db.models import Q
        excluded_content_types = [
            Q(content_type__app_label='auth', content_type__model='group'),
            Q(content_type__app_label='auth', content_type__model='permission'),
            Q(content_type__app_label='immigration', content_type__model='eventprocessingcontrol'),
            Q(content_type__app_label='immigration', content_type__model='event'),
        ]
        exclude_q = excluded_content_types[0]
        for q in excluded_content_types[1:]:
            exclude_q |= q
        all_permissions = all_permissions.exclude(exclude_q)
        
        # Get all permissions for SUPER_ADMIN (all permissions except excluded)
        super_admin_permissions = list(all_permissions)
        
        # Add Group permissions for SUPER_ADMIN (Group is excluded from main query)
        # SUPER_ADMIN can view and change groups, but NOT add or delete them
        try:
            group_content_type = ContentType.objects.get(app_label='auth', model='group')
            group_perms = Permission.objects.filter(content_type=group_content_type)
            excluded_group_perms = ['add_group', 'delete_group']
            for perm in group_perms:
                if perm.codename not in excluded_group_perms:
                    if perm not in super_admin_permissions:
                        super_admin_permissions.append(perm)
        except ContentType.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('  Group content type not found')
            )
        
        # Get permissions for BRANCH_ADMIN (all except Branch and Group management, but keep view)
        branch_admin_permissions = []
        excluded_codenames = ['add_branch', 'change_branch', 'delete_branch', 
                              'add_group', 'change_group', 'delete_group']
        
        for perm in super_admin_permissions:
            # Include all permissions except Branch and Group management
            if perm.codename not in excluded_codenames:
                branch_admin_permissions.append(perm)
            # But keep view permissions for Branch and Group
            elif perm.codename in ['view_branch', 'view_group']:
                branch_admin_permissions.append(perm)
        
        # Define role-specific permissions for other roles
        # Format: {role: {model: [actions]}}
        role_permissions = {
            'CONSULTANT': {
                Client: ['view', 'add', 'change'],
                VisaApplication: ['view', 'add', 'change'],
                Task: ['view', 'add', 'change'],
                Notification: ['view'],
                User: ['view'],  # Can only view users
                Note: ['view', 'add', 'change'],  # Can add and edit notes
                ClientActivity: ['view'],  # Can view timeline
                ProfilePicture: ['view', 'add', 'change'],  # Can upload profile pictures
                Institute: ['view'],  # Can view institutes
            },
            'REGION_MANAGER': {
                Client: ['view', 'add', 'change', 'delete'],
                VisaApplication: ['view', 'add', 'change', 'delete'],
                Task: ['view', 'add', 'change', 'delete'],
                Notification: ['view', 'add'],
                Branch: ['view', 'add', 'change'],
                Region: ['view'],
                User: ['view', 'change'],  # Can view and update, but NOT create users
                Note: ['view', 'add', 'change', 'delete'],  # Full note access
                ClientActivity: ['view'],  # Can view timeline
                ProfilePicture: ['view', 'add', 'change', 'delete'],  # Full profile picture access
                Institute: ['view', 'add', 'change', 'delete'],  # Full institute access
            },
        }
        
        # Assign permissions to each group
        for group_name in ALL_GROUPS:
            group_label = GROUP_DISPLAY_NAMES.get(group_name, group_name)
            group = Group.objects.get(name=group_name)
            
            # Clear existing permissions
            group.permissions.clear()
            
            if group_name == 'SUPER_ADMIN':
                # Assign all permissions to SUPER_ADMIN
                group.permissions.set(super_admin_permissions)
                self.stdout.write(
                    f'  Assigned {len(super_admin_permissions)} permissions to {group_label}'
                )
            elif group_name == 'BRANCH_ADMIN':
                # Assign all permissions except Branch/Group management to BRANCH_ADMIN
                group.permissions.set(branch_admin_permissions)
                self.stdout.write(
                    f'  Assigned {len(branch_admin_permissions)} permissions to {group_label} '
                    f'(excluded Branch/Group management permissions)'
                )
            else:
                # Use role-specific permissions for other roles
                role_perms = role_permissions.get(group_name, {})
                
                for model, actions in role_perms.items():
                    content_type = ContentType.objects.get_for_model(model)
                    
                    for action in actions:
                        # Get the permission
                        codename = f'{action}_{model._meta.model_name}'
                        try:
                            permission = Permission.objects.get(
                                codename=codename,
                                content_type=content_type
                            )
                            group.permissions.add(permission)
                            self.stdout.write(
                                f'  Added {action} permission for {model.__name__} to {group_label}'
                            )
                        except Permission.DoesNotExist:
                            self.stdout.write(
                                self.style.WARNING(
                                    f'  Permission {codename} not found for {model.__name__}'
                                )
                            )

    def _sync_existing_users(self):
        """Sync existing users to their groups (if needed)."""
        self.stdout.write('Syncing existing users to groups...')
        
        users = User.objects.all()
        synced_count = 0
        
        for user in users:
            # If user has no groups, this might be a problem
            if not user.groups.exists():
                self.stdout.write(f'  Warning: User {user.username} has no groups assigned')
            else:
                primary_group = user.get_primary_group()
                self.stdout.write(f'  User: {user.username} - Group: {primary_group.name if primary_group else "None"}')
                synced_count += 1
        
        self.stdout.write(f'Checked {synced_count} users')

