"""
Django management command to seed the database with test data.

Usage:
    python manage.py seed_data [--clear] [--tenant TENANT_SUBDOMAIN]

Options:
    --clear: Clear existing data before seeding
    --tenant: Tenant subdomain to seed (e.g., "global", "visa"). 
              If not provided, seeds all tenants.

Examples:
    # Seed all tenants
    python manage.py seed_data
    
    # Seed a specific tenant
    python manage.py seed_data --tenant global
    
    # Clear and seed a specific tenant
    python manage.py seed_data --tenant global --clear
"""

import random
import time
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.conf import settings
from django_tenants.utils import schema_context

from tenants.models import Tenant, Domain
from immigration.models import (
    Region,
    Branch,
    Client,
    VisaCategory,
    VisaType,
    VisaApplication,
    Agent,
    Task,
    Institute,
    InstituteLocation,
    InstituteContactPerson,
    InstituteRequirement,
    InstituteIntake,
    Course,
    BroadField,
    NarrowField,
    CourseLevel,
    ApplicationType,
    Stage,
    CollegeApplication,
)
from immigration.constants import (
    ClientStage,
    AgentType,
    TaskPriority,
    TaskStatus,
    GROUP_CONSULTANT,
    GROUP_SUPER_ADMIN,
    GROUP_REGION_MANAGER,
    GROUP_BRANCH_ADMIN,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with realistic test data for development and testing. Can seed a specific tenant or all tenants.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--tenant',
            type=str,
            help='Tenant subdomain to seed (e.g., "global", "visa"). If not provided, seeds all tenants.',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        
        tenant_subdomain = options.get('tenant')
        
        self.stdout.write(self.style.WARNING('🌱 Starting database seeding...'))
        if tenant_subdomain:
            self.stdout.write(self.style.WARNING(f'🎯 Seeding data for tenant: {tenant_subdomain}'))
        else:
            self.stdout.write(self.style.WARNING('🌍 Seeding data for all tenants'))
        
        if options['clear']:
            self.stdout.write(self.style.WARNING('⚠️  Clearing existing data...'))
            if tenant_subdomain:
                self.clear_data_for_tenant(tenant_subdomain)
            else:
                self.clear_data()
        
        try:
            # Temporarily disable signals that expect middleware context
            # Disable event dispatcher signals to prevent Event table creation during seeding
            from django.db.models.signals import post_save, pre_save, post_delete
            from immigration.events.dispatcher import (
                create_event_on_save,
                create_event_on_delete,
                capture_pre_save_state,
            )
            
            # Disconnect event dispatcher signals
            # Disconnect by function reference (works with @receiver decorator)
            try:
                post_save.disconnect(create_event_on_save)
            except Exception:
                pass  # Not connected or already disconnected
            try:
                pre_save.disconnect(capture_pre_save_state)
            except Exception:
                pass  # Not connected or already disconnected
            try:
                post_delete.disconnect(create_event_on_delete)
            except Exception:
                pass  # Not connected or already disconnected
            
            with transaction.atomic():
                # Seed in order of dependencies
                if tenant_subdomain:
                    tenants = self.get_tenant(tenant_subdomain)
                else:
                    tenants = self.seed_tenants()
                regions = self.seed_regions(tenants)
                branches = self.seed_branches(regions, tenants)
                users = self.seed_users(tenants, regions, branches)
                
                # Seed visa categories and types per tenant
                all_visa_categories_count = 0
                all_visa_types_count = 0
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        # Get a user from this tenant for created_by (query fresh in schema)
                        tenant_users = User.objects.all()
                        created_by = tenant_users.first() if tenant_users.exists() else None
                        
                        visa_categories = self.seed_visa_categories(created_by, tenant)
                        visa_types = self.seed_visa_types(visa_categories, created_by, tenant)
                        all_visa_categories_count += len(visa_categories)
                        all_visa_types_count += len(visa_types)
                
                # Seed course levels, broad fields, narrow fields (shared across all tenants)
                all_course_levels_count = 0
                all_broad_fields_count = 0
                all_narrow_fields_count = 0
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        course_levels = self.seed_course_levels(tenant)
                        broad_fields = self.seed_broad_fields(tenant)
                        narrow_fields = self.seed_narrow_fields(broad_fields, tenant)
                        all_course_levels_count += len(course_levels)
                        all_broad_fields_count += len(broad_fields)
                        all_narrow_fields_count += len(narrow_fields)
                
                # Seed institutes, courses, agents, clients, applications per tenant
                all_institutes_count = 0
                all_courses_count = 0
                all_agents_count = 0
                all_clients_count = 0
                all_applications_count = 0
                all_application_types_count = 0
                all_stages_count = 0
                all_college_applications_count = 0
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        # Get tenant-specific data (query fresh in schema)
                        tenant_users = list(User.objects.all())
                        tenant_branches = list(Branch.objects.all())
                        tenant_visa_categories = list(VisaCategory.objects.all())
                        tenant_visa_types = list(VisaType.objects.all())
                        created_by = tenant_users[0] if tenant_users else None
                        
                        institutes = self.seed_institutes(created_by, tenant)
                        all_institutes_count += len(institutes)
                        
                        # Seed courses (depends on institutes, course levels, broad/narrow fields)
                        courses = self.seed_courses(institutes, tenant)
                        all_courses_count += len(courses)
                        
                        agents = self.seed_agents(created_by, tenant)
                        all_agents_count += len(agents)
                        
                        clients = self.seed_clients(tenant_branches, tenant_users, tenant_visa_categories, agents, tenant)
                        all_clients_count += len(clients)
                        
                        applications = self.seed_applications(clients, tenant_visa_types, tenant_users, tenant)
                        all_applications_count += len(applications)
                        
                        # Seed application types and stages (for college applications)
                        application_types = self.seed_application_types(created_by, tenant)
                        all_application_types_count += len(application_types)
                        
                        stages = self.seed_stages(application_types, tenant)
                        all_stages_count += len(stages)
                        
                        # Seed college applications (depends on clients, courses, institutes, application types, stages)
                        college_applications = self.seed_college_applications(
                            clients, courses, institutes, application_types, agents, tenant_users, tenant
                        )
                        all_college_applications_count += len(college_applications)
                
                elapsed = time.time() - start_time
            
            # Tasks (outside transaction so it doesn't rollback)
            all_tasks_count = 0
            try:
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        # Query fresh in schema context
                        tenant_users = list(User.objects.all())
                        tenant_clients = list(Client.objects.all())
                        tenant_visa_applications = list(VisaApplication.objects.all())
                        tenant_college_applications = list(CollegeApplication.objects.all())
                        
                        # Seed tasks
                        tasks = self.seed_tasks(
                            tenant_users, 
                            tenant_clients, 
                            tenant_visa_applications, 
                            tenant_college_applications
                        )
                        all_tasks_count += len(tasks)
                        if tasks:
                            self.stdout.write(f'  ✓ Created {len(tasks)} tasks for {tenant.name}')
            except Exception as e:
                import traceback
                self.stdout.write(self.style.ERROR(f'  ❌ Error seeding tasks: {str(e)}'))
                self.stdout.write(self.style.ERROR(f'  Traceback: {traceback.format_exc()}'))
            
            # Re-enable signals
            from django.db.models.signals import post_save, pre_save, post_delete
            from immigration.events.dispatcher import (
                create_event_on_save,
                create_event_on_delete,
                capture_pre_save_state,
            )
            
            # Reconnect event dispatcher signals
            try:
                post_save.connect(create_event_on_save, weak=False)
            except Exception:
                pass  # Already connected
            try:
                pre_save.connect(capture_pre_save_state, weak=False)
            except Exception:
                pass  # Already connected
            try:
                post_delete.connect(create_event_on_delete, weak=False)
            except Exception:
                pass  # Already connected
            
            # Count total users (including super super admin in public schema)
            total_users_count = 1  # Super Super Admin
            for tenant in tenants:
                with schema_context(tenant.schema_name):
                    total_users_count += User.objects.count()
            
            self.stdout.write(self.style.SUCCESS(f'\n✅ Database seeded successfully in {elapsed:.2f} seconds!'))
            self.stdout.write(self.style.SUCCESS(f'\n📊 Summary:'))
            self.stdout.write(f'  • Tenants: {len(tenants)}')
            self.stdout.write(f'  • Regions: {len(regions)}')
            self.stdout.write(f'  • Branches: {len(branches)}')
            self.stdout.write(f'  • Users: {total_users_count}')
            self.stdout.write(f'  • Visa Categories: {all_visa_categories_count}')
            self.stdout.write(f'  • Visa Types: {all_visa_types_count}')
            self.stdout.write(f'  • Course Levels: {all_course_levels_count}')
            self.stdout.write(f'  • Broad Fields: {all_broad_fields_count}')
            self.stdout.write(f'  • Narrow Fields: {all_narrow_fields_count}')
            self.stdout.write(f'  • Institutes: {all_institutes_count}')
            self.stdout.write(f'  • Courses: {all_courses_count}')
            self.stdout.write(f'  • Agents: {all_agents_count}')
            self.stdout.write(f'  • Clients: {all_clients_count}')
            self.stdout.write(f'  • Visa Applications: {all_applications_count}')
            self.stdout.write(f'  • Application Types: {all_application_types_count}')
            self.stdout.write(f'  • Stages: {all_stages_count}')
            self.stdout.write(f'  • College Applications: {all_college_applications_count}')
            self.stdout.write(f'  • Tasks: {all_tasks_count}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error seeding database: {str(e)}'))
            raise

    def clear_data(self):
        """Clear existing test data for all tenants."""
        # Clear in reverse dependency order
        # Note: Need to clear tenant-specific data in each tenant schema
        from django_tenants.utils import schema_context
        
        # Clear tenant-specific data
        for tenant in Tenant.objects.all():
            with schema_context(tenant.schema_name):
                try:
                    Task.objects.all().delete()
                except Exception:
                    pass  # Task model from User Story 3 may not exist yet

                CollegeApplication.objects.all().delete()
                Stage.objects.all().delete()
                ApplicationType.objects.all().delete()
                VisaApplication.objects.all().delete()
                Client.objects.all().delete()
                Agent.objects.all().delete()
                Course.objects.all().delete()
                NarrowField.objects.all().delete()
                BroadField.objects.all().delete()
                CourseLevel.objects.all().delete()
                InstituteIntake.objects.all().delete()
                InstituteRequirement.objects.all().delete()
                InstituteContactPerson.objects.all().delete()
                InstituteLocation.objects.all().delete()
                Institute.objects.all().delete()
                VisaType.objects.all().delete()
                VisaCategory.objects.all().delete()
                User.objects.filter(is_superuser=False).delete()
                Branch.objects.all().delete()
                Region.objects.all().delete()
        
        # Clear public schema data (Super Super Admin)
        with schema_context('public'):
            User.objects.filter(is_superuser=False).delete()
        
        # Clear tenant records and domains
        Domain.objects.all().delete()
        Tenant.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('  ✓ Existing data cleared'))

    def clear_data_for_tenant(self, tenant_subdomain):
        """Clear existing test data for a specific tenant."""
        from django_tenants.utils import schema_context
        
        try:
            tenant = Tenant.objects.get(schema_name=f'tenant_{tenant_subdomain}')
        except Tenant.DoesNotExist:
            self.stdout.write(self.style.WARNING(f'  ⚠  Tenant "{tenant_subdomain}" not found. Skipping clear.'))
            return
        
        with schema_context(tenant.schema_name):
            try:
                Task.objects.all().delete()
            except Exception:
                pass  # Task model from User Story 3 may not exist yet
            
            CollegeApplication.objects.all().delete()
            Stage.objects.all().delete()
            ApplicationType.objects.all().delete()
            VisaApplication.objects.all().delete()
            Client.objects.all().delete()
            Agent.objects.all().delete()
            Course.objects.all().delete()
            NarrowField.objects.all().delete()
            BroadField.objects.all().delete()
            CourseLevel.objects.all().delete()
            InstituteIntake.objects.all().delete()
            InstituteRequirement.objects.all().delete()
            InstituteContactPerson.objects.all().delete()
            InstituteLocation.objects.all().delete()
            Institute.objects.all().delete()
            VisaType.objects.all().delete()
            VisaCategory.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Branch.objects.all().delete()
            Region.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Existing data cleared for tenant: {tenant.name}'))

    def get_tenant(self, tenant_subdomain):
        """Get existing tenant by subdomain. Raises error if tenant doesn't exist."""
        schema_name = f'tenant_{tenant_subdomain}'
        
        try:
            tenant = Tenant.objects.get(schema_name=schema_name)
            # Check if tenant has a domain, if not create one
            domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
            if not domain:
                from django.conf import settings
                app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'immigrate')
                base_domain = getattr(settings, 'BASE_DOMAIN', 'localhost')
                domain_name = f'{tenant_subdomain}-{app_subdomain}.{base_domain}'
                domain = Domain(
                    domain=domain_name,
                    tenant=tenant,
                    is_primary=True
                )
                domain.save()
                self.stdout.write(f'  ✓ Created domain for existing tenant: {domain_name}')
            self.stdout.write(f'  ✓ Using tenant: {tenant.name} (Schema: {schema_name})')
            return [tenant]
        except Tenant.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    f'\n❌ Error: Tenant with subdomain "{tenant_subdomain}" does not exist.\n'
                    f'   Please create the tenant first using:\n'
                    f'   python manage.py register_tenant --name "Tenant Name" --subdomain {tenant_subdomain} --admin-email admin@example.com --admin-password password123'
                )
            )
            raise

    def seed_tenants(self):
        """Create tenants with flattened domain pattern (tenant-app.company.com)."""
        self.stdout.write('Creating tenants...')
        
        # Get configuration from settings
        app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'immigrate')
        base_domain = getattr(settings, 'BASE_DOMAIN', 'localhost')
        
        tenants_data = [
            ('Global Immigration Services', 'global'),
            ('Visa Express Solutions', 'visa'),
            ('Migration Partners Ltd', 'migration'),
        ]
        
        tenants = []
        for name, subdomain in tenants_data:
            schema_name = f'tenant_{subdomain}'
            
            # Create tenant (auto-creates PostgreSQL schema)
            tenant = Tenant(
                schema_name=schema_name,
                name=name,
                is_active=True,
                subscription_status='TRIAL',
                max_users=50,
            )
            tenant.save()
            
            # Create domain with FLATTENED pattern: tenant-app.company.com
            domain_name = f'{subdomain}-{app_subdomain}.{base_domain}'
            domain = Domain(
                domain=domain_name,
                tenant=tenant,
                is_primary=True
            )
            domain.save()
            
            tenants.append(tenant)
            self.stdout.write(f'  ✓ Created tenant: {tenant.name} (Schema: {schema_name}, Domain: {domain_name})')
        
        return tenants


    def seed_regions(self, tenants):
        """Create regions for each tenant."""
        self.stdout.write('Creating regions...')
        
        regions_data = {
            'Global Immigration Services': ['North America', 'Europe', 'Asia Pacific'],
            'Visa Express Solutions': ['East Coast', 'West Coast'],
            'Migration Partners Ltd': ['UK & Ireland', 'Continental Europe'],
        }
        
        regions = []
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                region_names = regions_data.get(tenant.name, ['Region 1', 'Region 2'])
                for name in region_names:
                    region = Region.objects.create(
                        name=name,
                        description=f'{name} region for {tenant.name}'
                    )
                    regions.append(region)
                    self.stdout.write(f'  ✓ Created region: {region.name} ({tenant.name})')
        
        return regions

    def seed_branches(self, regions, tenants):
        """Create branch offices."""
        self.stdout.write('Creating branches...')
        
        branch_templates = [
            ('Downtown Office', '123 Main St', 'Downtown', 'NY', '10001', '+1-555-0100'),
            ('Midtown Branch', '456 Park Ave', 'Midtown', 'NY', '10022', '+1-555-0200'),
            ('Airport Office', '789 Airport Rd', 'Queens', 'NY', '11430', '+1-555-0300'),
        ]
        
        # Create a mapping of region to tenant by finding which tenant schema each region belongs to
        # Since regions are unique per schema, we can identify the tenant by querying in each schema
        region_to_tenant = {}
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                tenant_regions = Region.objects.all()
                for region in tenant_regions:
                    # Match region by name (regions are unique per schema)
                    for r in regions:
                        if r.id == region.id:
                            region_to_tenant[r] = tenant
                            break
        
        branches = []
        for region in regions:
            tenant = region_to_tenant.get(region)
            if not tenant:
                # Fallback: try to find tenant by checking which schema contains this region
                continue
            
            with schema_context(tenant.schema_name):
                # Create 2 branches per region
                for i in range(2):
                    template = branch_templates[i % len(branch_templates)]
                    # Get tenant domain for website
                    tenant_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
                    website = f'https://{tenant_domain.domain}' if tenant_domain else f'https://{tenant.name.lower().replace(" ", "")}.com'
                    
                    # Get the region object in the current schema context
                    region_in_schema = Region.objects.get(id=region.id)
                    
                    branch = Branch.objects.create(
                        region=region_in_schema,
                        name=f'{region.name} - {template[0]}',
                        phone=template[5],
                        website=website,
                        street=template[1],
                        suburb=template[2],
                        state=template[3],
                        postcode=template[4],
                    )
                    branches.append(branch)
                    self.stdout.write(f'  ✓ Created branch: {branch.name}')
        
        return branches

    def seed_users(self, tenants, regions, branches):
        """Create users with different roles."""
        self.stdout.write('Creating users...')
        
        users = []
        
        # Super Super Admin (system-wide, in public schema)
        # with schema_context('public'):
        #     super_super_admin = User.objects.create_user(
        #         username='superadmin',
        #         email='superadmin@system.com',
        #         password='password123',
        #         first_name='Super',
        #         last_name='Admin',
        #         is_staff=True,
        #     )
        #     # Assign to group
        #     group = Group.objects.get(name=GROUP_SUPER_SUPER_ADMIN)
        #     super_super_admin.groups.add(group)
        #     users.append(super_super_admin)
        #     self.stdout.write(f'  ✓ Created Super Super Admin: {super_super_admin.username}')
        
        # Create users for each tenant (in tenant schema)
        for tenant in tenants:
            tenant_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
            domain_name = tenant_domain.domain if tenant_domain else f'{tenant.name.lower().replace(" ", "")}.com'
            
            with schema_context(tenant.schema_name):
                # Super Admin (tenant-wide)
                super_admin = User.objects.create_user(
                    username=f'admin_{tenant.name[:10].lower().replace(" ", "_")}',
                    email=f'admin@{domain_name}',
                    password='password123',
                    first_name='Tenant',
                    last_name='Administrator',
                )
                # Assign to group
                group = Group.objects.get(name=GROUP_SUPER_ADMIN)
                super_admin.groups.add(group)
                users.append(super_admin)
                self.stdout.write(f'  ✓ Created Super Admin: {super_admin.username}')
            
            # Country Manager role is deprecated - skipping
        
        # Create regional and branch users (in tenant schema)
        # Map regions to tenants by checking which schema contains each region
        region_to_tenant = {}
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                tenant_regions = Region.objects.all()
                for region in tenant_regions:
                    for r in regions:
                        if r.id == region.id:
                            region_to_tenant[r] = tenant
                            break
        
        for region in regions:
            tenant = region_to_tenant.get(region)
            if not tenant:
                continue
            
            tenant_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
            domain_name = tenant_domain.domain if tenant_domain else f'{tenant.name.lower().replace(" ", "")}.com'
            
            with schema_context(tenant.schema_name):
                # Get the region object in the current schema context
                region_in_schema = Region.objects.get(id=region.id)
                
                # Region Manager
                region_mgr = User.objects.create_user(
                    username=f'region_{region.name[:15].lower().replace(" ", "_").replace("&", "and")}',
                    email=f'region.{region.name.lower().replace(" ", ".")}@{domain_name}',
                    password='password123',
                    first_name='Regional',
                    last_name='Manager',
                )
                # Assign to group
                group = Group.objects.get(name=GROUP_REGION_MANAGER)
                region_mgr.groups.add(group)
                # Assign regions (ManyToMany)
                region_mgr.regions.add(region_in_schema)
                users.append(region_mgr)
                self.stdout.write(f'  ✓ Created Region Manager: {region_mgr.username}')
        
        # Create branch-level users (in tenant schema)
        # Map branches to tenants by checking which schema contains each branch
        branch_to_tenant = {}
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                tenant_branches = Branch.objects.all()
                for branch in tenant_branches:
                    for b in branches:
                        if b.id == branch.id:
                            branch_to_tenant[b] = tenant
                            break
        
        for branch in branches:
            tenant = branch_to_tenant.get(branch)
            if not tenant:
                continue
            
            tenant_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
            domain_name = tenant_domain.domain if tenant_domain else f'{tenant.name.lower().replace(" ", "")}.com'
            
            with schema_context(tenant.schema_name):
                # Get the branch object in the current schema context
                branch_in_schema = Branch.objects.get(id=branch.id)
                # Branch Admin
                branch_admin = User.objects.create_user(
                    username=f'branch_{branch.id}',
                    email=f'branch.{branch.id}@{domain_name}',
                    password='password123',
                    first_name='Branch',
                    last_name='Administrator',
                )
                # Assign to group
                group = Group.objects.get(name=GROUP_BRANCH_ADMIN)
                branch_admin.groups.add(group)
                # Assign branches (ManyToMany)
                branch_admin.branches.add(branch_in_schema)
                # Also assign region if branch has one
                if branch_in_schema.region:
                    branch_admin.regions.add(branch_in_schema.region)
                users.append(branch_admin)
                
                # 2-3 Consultants per branch
                for i in range(random.randint(2, 3)):
                    consultant = User.objects.create_user(
                        username=f'consultant_{branch.id}_{i+1}',
                        email=f'consultant{i+1}.branch{branch.id}@{domain_name}',
                        password='password123',
                        first_name=random.choice(['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma']),
                        last_name=random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']),
                    )
                    # Assign to group
                    group = Group.objects.get(name=GROUP_CONSULTANT)
                    consultant.groups.add(group)
                    # Assign branch (ManyToMany)
                    consultant.branches.add(branch_in_schema)
                    # Also assign region if branch has one
                    if branch_in_schema.region:
                        consultant.regions.add(branch_in_schema.region)
                    users.append(consultant)
                
                self.stdout.write(f'  ✓ Created branch users for: {branch.name}')
        
        return users

    def seed_visa_categories(self, created_by, tenant):
        """Create visa categories in tenant schema."""
        categories_data = [
            ('Work Visa', 'WORK', 'Employment-based visa programs'),
            ('Student Visa', 'STUDENT', 'Education and training visas'),
            ('Permanent Residence', 'PR', 'Permanent residency programs'),
            ('Family Visa', 'FAMILY', 'Family reunion and sponsorship'),
            ('Visitor Visa', 'VISITOR', 'Tourist and temporary visitor visas'),
            ('Business Visa', 'BUSINESS', 'Business and investor visas'),
        ]
        
        categories = []
        for name, code, desc in categories_data:
            category = VisaCategory.objects.create(
                name=name,
                code=code,
                description=desc,
            )
            categories.append(category)
        
        if categories:
            self.stdout.write(f'  ✓ Created {len(categories)} visa categories for {tenant.name}')
        
        return categories

    def seed_visa_types(self, categories, created_by, tenant):
        """Create specific visa types under categories in tenant schema."""
        visa_types_data = {
            'Work Visa': [
                ('Skilled Independent', '189', 500, 2000),
                ('Employer Sponsored', '482', 1200, 1500),
                ('Regional Sponsored', '494', 400, 1800),
            ],
            'Student Visa': [
                ('Student', '500', 620, 800),
                ('Guardian', '590', 565, 700),
            ],
            'Permanent Residence': [
                ('Skilled Independent PR', '189', 4115, 3000),
                ('Family Sponsored PR', '864', 4155, 2500),
            ],
            'Family Visa': [
                ('Partner Visa', '820', 7715, 2000),
                ('Parent Visa', '103', 4155, 2500),
            ],
            'Visitor Visa': [
                ('Visitor', '600', 145, 500),
                ('ETA', '601', 20, 200),
            ],
            'Business Visa': [
                ('Business Innovation', '188A', 5375, 3500),
                ('Investor', '188B', 8445, 4000),
            ],
        }
        
        visa_types = []
        for category in categories:
            types_data = visa_types_data.get(category.name, [])
            for visa_type_name, sub_class, imm_fee, service_fee in types_data:
                visa_type = VisaType.objects.create(
                    name=visa_type_name,
                    code=sub_class,
                    visa_category=category,
                    checklist=[
                        'Identity documents',
                        'Passport',
                        'Photos',
                        'Financial evidence',
                        'Health examination',
                    ],
                )
                visa_types.append(visa_type)
        
        if visa_types:
            self.stdout.write(f'  ✓ Created {len(visa_types)} visa types for {tenant.name}')
        
        return visa_types

    def seed_institutes(self, created_by, tenant):
        """Create educational institutes in tenant schema."""
        institutes_data = [
            ('University of Technology Sydney', 'UTS', '+61-2-9514-2000', 'https://www.uts.edu.au'),
            ('Monash University', 'Monash', '+61-3-9902-6000', 'https://www.monash.edu'),
            ('University of Melbourne', 'UniMelb', '+61-3-9035-5511', 'https://www.unimelb.edu.au'),
            ('University of Sydney', 'USyd', '+61-2-9351-2222', 'https://www.sydney.edu.au'),
            ('RMIT University', 'RMIT', '+61-3-9925-2000', 'https://www.rmit.edu.au'),
            ('Deakin University', 'Deakin', '+61-3-9244-6333', 'https://www.deakin.edu.au'),
            ('Griffith University', 'Griffith', '+61-7-3735-7111', 'https://www.griffith.edu.au'),
            ('Queensland University of Technology', 'QUT', '+61-7-3138-2000', 'https://www.qut.edu.au'),
        ]
        
        institutes = []
        for name, short_name, phone, website in institutes_data:
            institute = Institute.objects.create(
                name=name,
                short_name=short_name,
                phone=phone,
                website=website,
                created_by=created_by,
            )
            institutes.append(institute)
            
            # Create 1-2 locations per institute
            locations_data = [
                ('123 University Ave', 'Sydney', 'NSW', '2000', 'AU', phone, f'contact@{short_name.lower()}.edu.au'),
                ('456 Campus Dr', 'Melbourne', 'VIC', '3000', 'AU', phone, f'info@{short_name.lower()}.edu.au'),
            ]
            
            num_locations = random.randint(1, 2)
            for i in range(num_locations):
                loc_data = locations_data[i % len(locations_data)]
                InstituteLocation.objects.create(
                    institute=institute,
                    street_name=loc_data[0],
                    suburb=loc_data[1],
                    state=loc_data[2],
                    postcode=loc_data[3],
                    country=loc_data[4],
                    phone_number=loc_data[5],
                    email=loc_data[6],
                )
            
            # Create 1-2 contact persons per institute
            contact_persons_data = [
                ('John Smith', 'MALE', 'Admissions Manager', phone, f'admissions@{short_name.lower()}.edu.au'),
                ('Sarah Johnson', 'FEMALE', 'International Student Coordinator', phone, f'international@{short_name.lower()}.edu.au'),
            ]
            
            num_contacts = random.randint(1, 2)
            for i in range(num_contacts):
                contact_data = contact_persons_data[i % len(contact_persons_data)]
                InstituteContactPerson.objects.create(
                    institute=institute,
                    name=contact_data[0],
                    gender=contact_data[1],
                    position=contact_data[2],
                    phone=contact_data[3],
                    email=contact_data[4],
                )
            
            # Create 2-4 requirements per institute
            requirements_data = [
                ('Academic Transcripts', 'Official transcripts from previous institutions', 'ACADEMIC'),
                ('English Language Proficiency', 'IELTS 6.5 or equivalent', 'LANGUAGE'),
                ('Financial Evidence', 'Proof of sufficient funds for tuition and living expenses', 'FINANCIAL'),
                ('Passport Copy', 'Valid passport with at least 6 months validity', 'DOCUMENT'),
                ('Statement of Purpose', 'Personal statement explaining study goals', 'DOCUMENT'),
            ]
            
            num_requirements = random.randint(2, 4)
            selected_requirements = random.sample(requirements_data, num_requirements)
            for req_title, req_desc, req_type in selected_requirements:
                InstituteRequirement.objects.create(
                    institute=institute,
                    title=req_title,
                    description=req_desc,
                    requirement_type=req_type,
                )
            
            # Create 2-3 intake dates per institute (upcoming dates)
            intake_dates = []
            base_date = datetime.now().date()
            for i in range(random.randint(2, 3)):
                # Create intakes for next 6-18 months
                months_ahead = random.randint(2, 18)
                intake_date = base_date + timedelta(days=months_ahead * 30)
                intake_dates.append(intake_date)
            
            for intake_date in sorted(intake_dates):
                InstituteIntake.objects.create(
                    institute=institute,
                    intake_date=intake_date,
                    description=f'Intake for {intake_date.strftime("%B %Y")}',
                )
        
        if institutes:
            self.stdout.write(f'  ✓ Created {len(institutes)} institutes with locations, contacts, requirements, and intakes for {tenant.name}')
        
        return institutes

    def seed_course_levels(self, tenant):
        """Create course levels in tenant schema."""
        course_levels_data = [
            'Certificate',
            'Diploma',
            'Advanced Diploma',
            'Bachelor',
            'Bachelor (Honours)',
            'Graduate Certificate',
            'Graduate Diploma',
            'Master',
            'Master (Research)',
            'Doctorate (PhD)',
        ]
        
        course_levels = []
        for level_name in course_levels_data:
            level, created = CourseLevel.objects.get_or_create(name=level_name)
            if created:
                course_levels.append(level)
        
        if course_levels:
            self.stdout.write(f'  ✓ Created {len(course_levels)} course levels for {tenant.name}')
        
        return course_levels

    def seed_broad_fields(self, tenant):
        """Create broad fields of study in tenant schema."""
        broad_fields_data = [
            'Engineering',
            'Business and Management',
            'Information Technology',
            'Health Sciences',
            'Education',
            'Arts and Humanities',
            'Science',
            'Law',
            'Architecture',
            'Hospitality and Tourism',
        ]
        
        broad_fields = []
        for field_name in broad_fields_data:
            field, created = BroadField.objects.get_or_create(name=field_name)
            if created:
                broad_fields.append(field)
        
        if broad_fields:
            self.stdout.write(f'  ✓ Created {len(broad_fields)} broad fields for {tenant.name}')
        
        return broad_fields

    def seed_narrow_fields(self, broad_fields, tenant):
        """Create narrow fields of study in tenant schema."""
        narrow_fields_data = {
            'Engineering': [
                'Civil Engineering',
                'Mechanical Engineering',
                'Electrical Engineering',
                'Software Engineering',
                'Chemical Engineering',
            ],
            'Business and Management': [
                'Business Administration',
                'Finance',
                'Marketing',
                'Human Resources',
                'International Business',
            ],
            'Information Technology': [
                'Computer Science',
                'Data Science',
                'Cybersecurity',
                'Information Systems',
                'Web Development',
            ],
            'Health Sciences': [
                'Nursing',
                'Public Health',
                'Biomedical Science',
                'Pharmacy',
                'Physiotherapy',
            ],
            'Education': [
                'Early Childhood Education',
                'Primary Education',
                'Secondary Education',
                'Special Education',
                'Educational Leadership',
            ],
            'Arts and Humanities': [
                'English Literature',
                'History',
                'Philosophy',
                'Linguistics',
                'Cultural Studies',
            ],
            'Science': [
                'Biology',
                'Chemistry',
                'Physics',
                'Mathematics',
                'Environmental Science',
            ],
            'Law': [
                'Commercial Law',
                'International Law',
                'Criminal Law',
                'Constitutional Law',
                'Human Rights Law',
            ],
            'Architecture': [
                'Architectural Design',
                'Urban Planning',
                'Landscape Architecture',
                'Interior Design',
                'Sustainable Architecture',
            ],
            'Hospitality and Tourism': [
                'Hotel Management',
                'Tourism Management',
                'Event Management',
                'Culinary Arts',
                'Hospitality Operations',
            ],
        }
        
        narrow_fields = []
        for broad_field in broad_fields:
            narrow_names = narrow_fields_data.get(broad_field.name, [])
            for narrow_name in narrow_names:
                narrow_field, created = NarrowField.objects.get_or_create(
                    name=narrow_name,
                    broad_field=broad_field
                )
                if created:
                    narrow_fields.append(narrow_field)
        
        if narrow_fields:
            self.stdout.write(f'  ✓ Created {len(narrow_fields)} narrow fields for {tenant.name}')
        
        return narrow_fields

    def seed_courses(self, institutes, tenant):
        """Create courses for institutes in tenant schema."""
        from decimal import Decimal
        
        # Get course levels, broad fields, and narrow fields
        course_levels = list(CourseLevel.objects.all())
        broad_fields = list(BroadField.objects.all())
        narrow_fields = list(NarrowField.objects.all())
        
        if not course_levels or not broad_fields or not narrow_fields:
            self.stdout.write(self.style.WARNING(f'  ⚠  Missing course levels, broad fields, or narrow fields. Skipping courses for {tenant.name}'))
            return []
        
        courses = []
        course_templates = [
            ('Bachelor of Computer Science', 'Bachelor', 'Information Technology', 'Computer Science', Decimal('35000.00'), Decimal('500.00')),
            ('Master of Business Administration', 'Master', 'Business and Management', 'Business Administration', Decimal('45000.00'), Decimal('600.00')),
            ('Bachelor of Engineering (Civil)', 'Bachelor', 'Engineering', 'Civil Engineering', Decimal('38000.00'), Decimal('550.00')),
            ('Master of Data Science', 'Master', 'Information Technology', 'Data Science', Decimal('42000.00'), Decimal('580.00')),
            ('Bachelor of Nursing', 'Bachelor', 'Health Sciences', 'Nursing', Decimal('32000.00'), Decimal('480.00')),
            ('Master of Education', 'Master', 'Education', 'Educational Leadership', Decimal('28000.00'), Decimal('450.00')),
            ('Bachelor of Commerce', 'Bachelor', 'Business and Management', 'Finance', Decimal('36000.00'), Decimal('520.00')),
            ('Master of Public Health', 'Master', 'Health Sciences', 'Public Health', Decimal('33000.00'), Decimal('500.00')),
            ('Bachelor of Architecture', 'Bachelor', 'Architecture', 'Architectural Design', Decimal('40000.00'), Decimal('600.00')),
            ('Master of Information Systems', 'Master', 'Information Technology', 'Information Systems', Decimal('39000.00'), Decimal('560.00')),
        ]
        
        for institute in institutes:
            # Create 2-4 courses per institute
            num_courses = random.randint(2, 4)
            selected_courses = random.sample(course_templates, min(num_courses, len(course_templates)))
            
            for course_name, level_name, broad_name, narrow_name, tuition_fee, coe_fee in selected_courses:
                # Find matching level, broad field, and narrow field
                level = next((l for l in course_levels if l.name == level_name), None)
                broad_field = next((b for b in broad_fields if b.name == broad_name), None)
                narrow_field = next((n for n in narrow_fields if n.name == narrow_name and n.broad_field == broad_field), None)
                
                if not level or not broad_field or not narrow_field:
                    continue  # Skip if dependencies not found
                
                course = Course.objects.create(
                    name=f'{course_name} - {institute.short_name}',
                    level=level,
                    total_tuition_fee=tuition_fee,
                    coe_fee=coe_fee,
                    broad_field=broad_field,
                    narrow_field=narrow_field,
                    institute=institute,
                    description=f'{course_name} program offered by {institute.name}. This program provides comprehensive education in {narrow_name} within the {broad_name} field.',
                )
                courses.append(course)
        
        if courses:
            self.stdout.write(f'  ✓ Created {len(courses)} courses for {tenant.name}')
        
        return courses

    def seed_agents(self, created_by, tenant):
        """Create external agents in tenant schema."""
        agents_data = [
            ('Global Migration Associates', 'SUPER_AGENT', '+1-555-1000', 'contact@globalmigration.com'),
            ('Visa Partners Network', 'SUPER_AGENT', '+1-555-2000', 'info@visapartners.com'),
            ('Regional Consultancy Services', 'SUB_AGENT', '+1-555-3000', 'hello@regionalconsult.com'),
            ('Education Visa Specialists', 'SUB_AGENT', '+1-555-4000', 'team@eduvisa.com'),
            ('Family Migration Experts', 'SUB_AGENT', '+1-555-5000', 'support@familymigration.com'),
        ]
        
        agents = []
        for name, agent_type, phone, email in agents_data:
            agent = Agent.objects.create(
                agent_name=name,
                agent_type=agent_type,
                phone_number=phone,
                email=email,
                website=f'https://{name.lower().replace(" ", "")}.com',
                street=f'{random.randint(100, 999)} Business St',
                suburb='Business District',
                state='NY',
                postcode='10001',
                country='US',
                created_by=created_by,
            )
            agents.append(agent)
        
        if agents:
            self.stdout.write(f'  ✓ Created {len(agents)} agents for {tenant.name}')
        
        return agents

    def seed_clients(self, branches, users, visa_categories, agents, tenant):
        """Create client records in tenant schema."""
        first_names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Emily', 
                       'Robert', 'Lisa', 'William', 'Maria', 'Richard', 'Jennifer', 'Thomas', 'Patricia']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                     'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson']
        
        # Get consultants for assignment
        consultants = [u for u in users if hasattr(u, 'is_in_group') and u.is_in_group(GROUP_CONSULTANT)]
        
        clients = []
        target_count = 20  # Create 20 clients per tenant
        
        for i in range(target_count):
            # Randomly select branch
            branch = random.choice(branches)
            
            # Get consultants from this branch
            branch_consultants = [u for u in consultants if hasattr(u, 'branches') and branch in u.branches.all()]
            assigned_to = random.choice(branch_consultants) if branch_consultants else None
            
            # Random client data
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            client = Client.objects.create(
                first_name=first_name,
                last_name=last_name,
                middle_name=random.choice(['', 'A', 'B', 'C', 'D']) if random.random() > 0.5 else '',
                gender=random.choice(['MALE', 'FEMALE']),
                dob=datetime.now().date() - timedelta(days=random.randint(8000, 18000)),  # 22-49 years old
                phone_number=f'+1-555-{random.randint(6000, 9999)}',
                email=f'{first_name.lower()}.{last_name.lower()}{i}@email.com',
                street=f'{random.randint(1, 999)} {random.choice(["Main", "Oak", "Pine", "Maple"])} St',
                suburb=random.choice(['Downtown', 'Midtown', 'Uptown', 'Suburbs']),
                state=random.choice(['NY', 'CA', 'TX', 'FL', 'IL']),
                postcode=f'{random.randint(10000, 99999)}',
                country=random.choice(['US', 'GB', 'CA', 'AU', 'IN', 'CN']),
                branch=branch,
                visa_category=random.choice(visa_categories) if visa_categories and random.random() > 0.2 else None,
                agent=random.choice(agents) if agents and random.random() > 0.6 else None,
                assigned_to=assigned_to,
                stage=random.choice(['LEAD', 'FOLLOW_UP', 'CLIENT', 'CLOSE']),
                active=random.random() > 0.3,  # 70% active
                description=f'Client interested in {random.choice(["work", "study", "family", "business"])} visa',
            )
            clients.append(client)
        
        if clients:
            self.stdout.write(f'  ✓ Created {len(clients)} clients for {tenant.name}')
        
        return clients

    def seed_applications(self, clients, visa_types, users, tenant):
        """Create visa applications in tenant schema."""
        applications = []
        
        if not clients or not visa_types:
            return applications
        
        # Create applications for ~60% of clients
        sample_size = min(int(len(clients) * 0.6), len(clients))
        selected_clients = random.sample(clients, sample_size) if sample_size > 0 else []
        
        for client in selected_clients:
            # Some clients may have multiple applications
            num_applications = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
            
            for _ in range(num_applications):
                visa_type = random.choice(visa_types)
                status = random.choice(['TO_BE_APPLIED', 'VISA_APPLIED', 'CASE_OPENED', 'GRANTED', 'REJECTED'])
                
                submission_date = None
                decision_date = None
                
                if status != 'TO_BE_APPLIED':
                    submission_date = datetime.now().date() - timedelta(days=random.randint(1, 180))
                    
                    if status in ['GRANTED', 'REJECTED']:
                        decision_date = submission_date + timedelta(days=random.randint(30, 120))
                
                application = VisaApplication.objects.create(
                    client=client,
                    visa_type=visa_type,
                    status=status,
                    date_applied=submission_date,
                    date_granted=decision_date if status == 'GRANTED' else None,
                    date_rejected=decision_date if status == 'REJECTED' else None,
                    assigned_to=client.assigned_to,
                    immigration_fee=random.randint(500, 5000),
                    service_fee=random.randint(200, 2000),
                    notes=f'Application for {visa_type.name} ({visa_type.code})',
                )
                applications.append(application)
        
        if applications:
            self.stdout.write(f'  ✓ Created {len(applications)} visa applications for {tenant.name}')
        
        return applications

    def seed_application_types(self, created_by, tenant):
        """Create application types in tenant schema."""
        application_types_data = [
            ('Undergraduate', 'USD', 'GST', Decimal('10.00'), 'Undergraduate degree programs (Bachelor\'s level)'),
            ('Postgraduate', 'USD', 'GST', Decimal('10.00'), 'Postgraduate degree programs (Master\'s and PhD)'),
            ('Foundation Program', 'USD', 'GST', Decimal('10.00'), 'Foundation programs for students preparing for university'),
            ('Diploma', 'USD', 'GST', Decimal('10.00'), 'Diploma and certificate programs'),
            ('Short Course', 'USD', 'GST', Decimal('10.00'), 'Short-term courses and professional development programs'),
            ('English Language', 'USD', 'GST', Decimal('10.00'), 'English language courses and preparation programs'),
        ]
        
        application_types = []
        for title, currency, tax_name, tax_percentage, description in application_types_data:
            application_type = ApplicationType.objects.create(
                title=title,
                currency=currency,
                tax_name=tax_name,
                tax_percentage=tax_percentage,
                description=description,
                is_active=True,
            )
            application_types.append(application_type)
        
        if application_types:
            self.stdout.write(f'  ✓ Created {len(application_types)} application types for {tenant.name}')
        
        return application_types

    def seed_stages(self, application_types, tenant):
        """Create stages for each application type in tenant schema."""
        # Define stage templates for different application types
        stage_templates = {
            'Undergraduate': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Under Review', 4, 'Application is being reviewed by the institute'),
                ('Offer Received', 5, 'Offer letter received from the institute'),
                ('Offer Accepted', 6, 'Student has accepted the offer'),
                ('Enrolled', 7, 'Student has successfully enrolled'),
            ],
            'Postgraduate': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Under Review', 4, 'Application is being reviewed by the institute'),
                ('Interview Scheduled', 5, 'Interview has been scheduled with the institute'),
                ('Offer Received', 6, 'Offer letter received from the institute'),
                ('Offer Accepted', 7, 'Student has accepted the offer'),
                ('Enrolled', 8, 'Student has successfully enrolled'),
            ],
            'Foundation Program': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Offer Received', 4, 'Offer letter received from the institute'),
                ('Enrolled', 5, 'Student has successfully enrolled'),
            ],
            'Diploma': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Offer Received', 4, 'Offer letter received from the institute'),
                ('Enrolled', 5, 'Student has successfully enrolled'),
            ],
            'Short Course': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Enrolled', 4, 'Student has successfully enrolled'),
            ],
            'English Language': [
                ('Application Received', 1, 'Initial application submission received'),
                ('Documents Verified', 2, 'All required documents have been verified'),
                ('Submitted to Institute', 3, 'Application submitted to the educational institution'),
                ('Enrolled', 4, 'Student has successfully enrolled'),
            ],
        }
        
        stages = []
        for application_type in application_types:
            stage_data = stage_templates.get(application_type.title, stage_templates['Diploma'])
            for stage_name, position, description in stage_data:
                stage = Stage.objects.create(
                    application_type=application_type,
                    stage_name=stage_name,
                    position=position,
                    description=description,
                )
                stages.append(stage)
        
        if stages:
            self.stdout.write(f'  ✓ Created {len(stages)} stages for {tenant.name}')
        
        return stages

    def seed_college_applications(self, clients, courses, institutes, application_types, agents, users, tenant):
        """Create college applications in tenant schema."""
        applications = []
        
        if not clients or not courses or not institutes or not application_types:
            return applications
        
        # Get all stages for the application types
        all_stages = {}
        for app_type in application_types:
            all_stages[app_type.id] = list(Stage.objects.filter(application_type=app_type).order_by('position'))
        
        # Get super agents and sub agents
        super_agents = [a for a in agents if a.agent_type == 'SUPER_AGENT']
        sub_agents = [a for a in agents if a.agent_type == 'SUB_AGENT']
        
        # Get consultants for assignment
        consultants = [u for u in users if hasattr(u, 'is_in_group') and u.is_in_group(GROUP_CONSULTANT)]
        
        # Create applications for ~40% of clients
        sample_size = min(int(len(clients) * 0.4), len(clients))
        selected_clients = random.sample(clients, sample_size) if sample_size > 0 else []
        
        for client in selected_clients:
            # Some clients may have multiple applications
            num_applications = random.choices([1, 2], weights=[80, 20])[0]
            
            for _ in range(num_applications):
                # Select random application type
                application_type = random.choice(application_types)
                
                # Get first stage for this application type (position 1)
                stages_for_type = all_stages.get(application_type.id, [])
                if not stages_for_type:
                    continue  # Skip if no stages available
                
                # Randomly select a stage (weighted towards earlier stages)
                # Create weights that match the number of stages
                num_stages = len(stages_for_type)
                # Generate weights: higher for earlier stages, decreasing exponentially
                stage_weights = []
                base_weight = 50
                for i in range(num_stages):
                    # Weight decreases as position increases
                    weight = max(1, int(base_weight * (0.6 ** i)))
                    stage_weights.append(weight)
                
                stage_index = random.choices(range(num_stages), weights=stage_weights)[0]
                stage = stages_for_type[stage_index]
                
                # Select random course and ensure it belongs to an institute
                course = random.choice(courses)
                institute = course.institute
                
                # Get locations and intakes for this institute
                locations = list(InstituteLocation.objects.filter(institute=institute))
                intakes = list(InstituteIntake.objects.filter(institute=institute))
                
                if not locations or not intakes:
                    continue  # Skip if no locations or intakes
                
                location = random.choice(locations)
                start_date = random.choice(intakes)
                
                # Calculate finish date (typically 1-4 years from start, depending on course level)
                finish_date = None
                if start_date.intake_date:
                    years = 1 if 'Short' in application_type.title or 'English' in application_type.title else random.randint(2, 4)
                    finish_date = start_date.intake_date + timedelta(days=years * 365)
                
                # Random tuition fee (based on course fee with some variation)
                base_fee = course.total_tuition_fee if course.total_tuition_fee else Decimal('30000.00')
                tuition_fee = base_fee * Decimal(str(random.uniform(0.9, 1.1)))  # ±10% variation
                
                # Random student ID (only if enrolled or later stages)
                student_id = ''
                if stage.position >= 5:  # Assume position 5+ means enrolled
                    student_id = f'STU{random.randint(100000, 999999)}'
                
                # Random agent assignment (30% chance)
                super_agent = random.choice(super_agents) if super_agents and random.random() < 0.15 else None
                sub_agent = random.choice(sub_agents) if sub_agents and random.random() < 0.15 else None
                
                # Assign to consultant (usually the client's assigned consultant)
                assigned_to = client.assigned_to if client.assigned_to else (random.choice(consultants) if consultants else None)
                
                # Create application
                application = CollegeApplication.objects.create(
                    application_type=application_type,
                    stage=stage,
                    client=client,
                    institute=institute,
                    course=course,
                    start_date=start_date,
                    location=location,
                    finish_date=finish_date,
                    total_tuition_fee=tuition_fee,
                    student_id=student_id,
                    super_agent=super_agent,
                    sub_agent=sub_agent,
                    assigned_to=assigned_to,
                    notes=f'College application for {course.name} at {institute.name}. Stage: {stage.stage_name}',
                )
                applications.append(application)
        
        if applications:
            self.stdout.write(f'  ✓ Created {len(applications)} college applications for {tenant.name}')
        
        return applications

    def seed_tasks(self, users, clients, visa_applications=None, college_applications=None):
        """Create tasks for users (per tenant schema)."""
        from django.utils import timezone
        from django.contrib.contenttypes.models import ContentType
        
        if visa_applications is None:
            visa_applications = []
        if college_applications is None:
            college_applications = []
        
        task_templates = [
            ('Follow up with client', 'Contact client regarding application status and answer any questions'),
            ('Review documents', 'Review and verify all submitted documents for completeness and accuracy'),
            ('Prepare application', 'Prepare complete visa application package with all required forms'),
            ('Schedule interview', 'Schedule visa interview appointment with consulate'),
            ('Submit application', 'Submit completed application to immigration authorities'),
            ('Document collection', 'Collect required supporting documents from client'),
            ('Client meeting', 'Meeting to discuss visa options and requirements'),
            ('Application review', 'Internal review of application materials before submission'),
            ('Verify passport validity', 'Check passport expiration date and validity period'),
            ('Obtain police clearance', 'Assist client in obtaining police clearance certificate'),
            ('Medical examination', 'Schedule and coordinate medical examination appointment'),
            ('Financial documentation', 'Review and organize financial evidence documents'),
            ('Translation services', 'Arrange translation of documents if needed'),
            ('Update client status', 'Update client record with latest information'),
            ('Follow up on pending case', 'Check status of submitted application with authorities'),
            ('Prepare appeal documents', 'Prepare documents for visa appeal if rejected'),
            ('Client onboarding', 'Complete initial client onboarding process'),
            ('Visa grant notification', 'Notify client of visa grant and next steps'),
            ('Post-arrival support', 'Provide support for client after visa grant'),
            ('Renewal preparation', 'Prepare documents for visa renewal application'),
            ('Compliance check', 'Verify client compliance with visa conditions'),
            ('Document notarization', 'Arrange for document notarization if required'),
            ('Biometric appointment', 'Schedule biometric data collection appointment'),
            ('Payment processing', 'Process visa application fees and service charges'),
            ('Case file organization', 'Organize and maintain case file documentation'),
            ('College application review', 'Review college application documents and requirements'),
            ('Submit college application', 'Submit college application to educational institution'),
            ('Follow up on college application', 'Check status of college application with institution'),
            ('College offer processing', 'Process offer letter and assist with acceptance'),
            ('College enrollment support', 'Assist with college enrollment and registration'),
        ]
        
        tasks = []
        all_users = list(users)  # Include all users for assignment
        
        # Early return if no users available
        if not all_users:
            self.stdout.write(self.style.WARNING('  ⚠  No users available for task assignment. Skipping task creation.'))
            return tasks
        
        # Get branches for linking
        branches = list(Branch.objects.all())
        
        # Get ContentType for Client, VisaApplication, and CollegeApplication
        client_content_type = ContentType.objects.get_for_model(Client) if clients else None
        visa_app_content_type = ContentType.objects.get_for_model(VisaApplication) if visa_applications else None
        college_app_content_type = ContentType.objects.get_for_model(CollegeApplication) if college_applications else None
        
        # Create approximately 100 tasks
        target_count = 100
        created_count = 0
        
        while created_count < target_count:
            # Randomly select task template
            title, base_detail = random.choice(task_templates)
            
            # Vary the detail slightly
            detail_variations = [
                base_detail,
                f'{base_detail}. Please ensure all requirements are met.',
                f'{base_detail}. This is a high-priority item.',
                f'{base_detail}. Follow up within 24 hours if needed.',
            ]
            detail = random.choice(detail_variations)
            
            # Random priority (weighted towards medium and high)
            priority = random.choices(
                [TaskPriority.LOW.value, TaskPriority.MEDIUM.value, TaskPriority.HIGH.value, TaskPriority.URGENT.value],
                weights=[15, 35, 35, 15]
            )[0]
            
            # Random status (weighted towards pending and in_progress)
            status = random.choices(
                [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value],
                weights=[30, 25, 35, 10]
            )[0]
            
            # Random due date (mix of past, present, and future)
            days_offset = random.choices(
                [random.randint(-30, -1), random.randint(0, 7), random.randint(8, 30), random.randint(31, 90)],
                weights=[20, 30, 30, 20]
            )[0]
            due_date = timezone.now() + timedelta(days=days_offset, hours=random.randint(9, 17))
            
            # Random assignment: user (70%), branch (20%), or unassigned (10%)
            assignment_type = random.choices(['user', 'branch', 'unassigned'], weights=[70, 20, 10])[0]
            assigned_to = None
            branch = None
            
            if assignment_type == 'user' and all_users:
                assigned_to = random.choice(all_users)
            elif assignment_type == 'branch' and branches:
                branch = random.choice(branches)
            
            # Random creator (if assigned to user, creator is usually that user or another user)
            if all_users:
                if assigned_to and len(all_users) > 1:
                    # Prefer assigned_to but sometimes use another user
                    created_by = random.choice([assigned_to] + [u for u in all_users if u != assigned_to])
                else:
                    created_by = random.choice(all_users)
            else:
                created_by = None
            
            # Random assigner
            assigned_by = None
            if assigned_to and all_users:
                assigned_by = random.choice([u for u in all_users if u != assigned_to] + [assigned_to])
            
            # Link to client, visa application, or college application (40% chance)
            content_type = None
            object_id = None
            if random.random() < 0.4:
                # Determine which entity type to link to (weighted distribution)
                entity_choice = random.choices(
                    ['client', 'visa_application', 'college_application'],
                    weights=[40, 35, 25]  # 40% client, 35% visa app, 25% college app
                )[0]
                
                if entity_choice == 'client' and clients:
                    # Link to client
                    linked_client = random.choice(clients)
                    # Verify the client still exists in database
                    if Client.objects.filter(id=linked_client.id).exists():
                        content_type = client_content_type
                        object_id = linked_client.id
                        # Enhance detail with client info
                        detail = f'{detail} (Client: {linked_client.first_name} {linked_client.last_name})'
                elif entity_choice == 'visa_application' and visa_applications:
                    # Link to visa application
                    linked_app = random.choice(visa_applications)
                    # Verify the visa application still exists in database
                    if VisaApplication.objects.filter(id=linked_app.id).exists():
                        content_type = visa_app_content_type
                        object_id = linked_app.id
                        # Enhance detail with application info
                        visa_type_name = linked_app.visa_type.name if linked_app.visa_type else "N/A"
                        detail = f'{detail} (Visa Application: {visa_type_name})'
                elif entity_choice == 'college_application' and college_applications:
                    # Link to college application
                    linked_college_app = random.choice(college_applications)
                    # Verify the college application still exists in database
                    if CollegeApplication.objects.filter(id=linked_college_app.id).exists():
                        content_type = college_app_content_type
                        object_id = linked_college_app.id
                        # Enhance detail with college application info
                        course_name = linked_college_app.course.name if linked_college_app.course else "N/A"
                        institute_name = linked_college_app.institute.short_name if linked_college_app.institute else "N/A"
                        detail = f'{detail} (College Application: {course_name} at {institute_name})'
            
            # Random tags (20% chance)
            tags = []
            if random.random() < 0.2:
                tag_options = ['urgent', 'follow-up', 'documentation', 'client-meeting', 'application', 'review', 'compliance']
                num_tags = random.randint(1, 3)
                tags = random.sample(tag_options, min(num_tags, len(tag_options)))
            
            # Set completed_at if status is COMPLETED
            completed_at = None
            if status == TaskStatus.COMPLETED.value:
                completed_at = due_date - timedelta(days=random.randint(0, 5), hours=random.randint(1, 8))
            
            # Create task
            task = Task.objects.create(
                title=title,
                detail=detail,
                priority=priority,
                status=status,
                due_date=due_date,
                assigned_to=assigned_to,
                branch=branch,
                assigned_by=assigned_by,
                created_by=created_by,
                content_type=content_type,
                object_id=object_id,
                tags=tags,
                completed_at=completed_at,
            )
            tasks.append(task)
            created_count += 1
        
        return tasks
