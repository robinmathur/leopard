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
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
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
            # from immigration import signals as immigration_signals
            # post_save.disconnect(immigration_signals.client_events, sender=Client)
            # post_save.disconnect(immigration_signals.visa_application_events, sender=VisaApplication)
            
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
                
                # Seed agents, clients, applications per tenant
                all_agents_count = 0
                all_clients_count = 0
                all_applications_count = 0
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        # Get tenant-specific data (query fresh in schema)
                        tenant_users = list(User.objects.all())
                        tenant_branches = list(Branch.objects.all())
                        tenant_visa_categories = list(VisaCategory.objects.all())
                        tenant_visa_types = list(VisaType.objects.all())
                        created_by = tenant_users[0] if tenant_users else None
                        
                        agents = self.seed_agents(created_by, tenant)
                        all_agents_count += len(agents)
                        
                        clients = self.seed_clients(tenant_branches, tenant_users, tenant_visa_categories, agents, tenant)
                        all_clients_count += len(clients)
                        
                        applications = self.seed_applications(clients, tenant_visa_types, tenant_users, tenant)
                        all_applications_count += len(applications)
                
                elapsed = time.time() - start_time
            
            # Tasks are part of User Story 3 - may not exist yet (outside transaction so it doesn't rollback)
            all_tasks_count = 0
            try:
                for tenant in tenants:
                    with schema_context(tenant.schema_name):
                        # Query fresh in schema context
                        tenant_users = list(User.objects.all())
                        tenant_clients = list(Client.objects.all())
                        tasks = self.seed_tasks(tenant_users, tenant_clients)
                        all_tasks_count += len(tasks)
                        if tasks:
                            self.stdout.write(f'  ✓ Created {len(tasks)} tasks for {tenant.name}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠  Skipping tasks (User Story 3 not implemented): {str(e)}'))
            
            # Re-enable signals
            # post_save.connect(immigration_signals.client_events, sender=Client)
            # post_save.connect(immigration_signals.visa_application_events, sender=VisaApplication)
            
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
            self.stdout.write(f'  • Agents: {all_agents_count}')
            self.stdout.write(f'  • Clients: {all_clients_count}')
            self.stdout.write(f'  • Visa Applications: {all_applications_count}')
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
                
                VisaApplication.objects.all().delete()
                Client.objects.all().delete()
                Agent.objects.all().delete()
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
            
            VisaApplication.objects.all().delete()
            Client.objects.all().delete()
            Agent.objects.all().delete()
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
                    f'   python manage.py create_tenant --name "Tenant Name" --subdomain {tenant_subdomain} --admin-email admin@example.com --admin-password password123'
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

    def seed_tasks(self, users, clients):
        """Create tasks for users (per tenant schema)."""
        task_templates = [
            ('Follow up with client', 'Contact client regarding application status'),
            ('Review documents', 'Review and verify submitted documents'),
            ('Prepare application', 'Prepare visa application package'),
            ('Schedule interview', 'Schedule visa interview appointment'),
            ('Submit application', 'Submit completed application to authorities'),
            ('Document collection', 'Collect required supporting documents'),
            ('Client meeting', 'Meeting to discuss visa options'),
            ('Application review', 'Internal review of application materials'),
        ]
        
        tasks = []
        consultants = [u for u in users if hasattr(u, 'is_in_group') and u.is_in_group(GROUP_CONSULTANT)]
        
        # Group clients by tenant (schema)
        # We need to create tasks within each tenant's schema context
        # For now, create tasks in the current schema context (should be called within tenant schema)
        for consultant in consultants:
            # Get clients assigned to this consultant
            consultant_clients = [c for c in clients if hasattr(c, 'assigned_to') and c.assigned_to_id == consultant.id]
            
            num_tasks = random.randint(3, 5)
            for _ in range(num_tasks):
                title, detail = random.choice(task_templates)
                
                due_date = datetime.now().date() + timedelta(days=random.randint(-7, 30))
                
                task = Task.objects.create(
                    title=title,
                    detail=detail,
                    priority=random.choice([TaskPriority.LOW.value, TaskPriority.MEDIUM.value, TaskPriority.HIGH.value]),
                    due_date=due_date,
                    assigned_to=consultant,
                    status=random.choice([TaskStatus.PENDING.value, TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]),
                    created_by=consultant,
                )
                tasks.append(task)
        
        return tasks
