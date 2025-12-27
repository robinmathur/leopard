# Multi-Tenant Django Architecture Implementation Prompt

## Context
You are tasked with converting an existing Django application into a multi-tenant application using PostgreSQL schema-per-tenant architecture. The project uses `uv` as the package manager (not pip). The application should support a three-tier admin hierarchy: Super Super Admin (creates tenants) → Tenant Super Admin (manages their tenant) → Regular Users (tenant-scoped).

## Requirements

### 1. Package Installation
Add the following to `pyproject.toml` dependencies:
```toml
dependencies = [
    "django>=4.2,<5.1",
    "django-tenants>=3.5.0",
    "psycopg2-binary>=2.9.9",
    "djangorestframework>=3.14.0",
    "django-cors-headers>=4.3.0",
]
```

Then run: `uv pip install -e .` or `uv sync`

### 2. Database Configuration
Update `settings.py` DATABASES configuration:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',  # Special tenant-aware backend
        'NAME': 'your_database_name',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 3. Django Settings Updates

#### A. Update INSTALLED_APPS
- **CRITICAL**: `django_tenants` must be the FIRST app
- `django.contrib.contenttypes` must come before `django.contrib.admin`

```python
INSTALLED_APPS = [
    'django_tenants',  # MUST BE FIRST
    'django.contrib.contenttypes',  # MUST BE BEFORE ADMIN
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Add new tenant management app
    'tenants',  # Will be created
    
    # Your existing apps
    # List all existing apps here...
]
```

#### B. Update MIDDLEWARE
- **CRITICAL**: `TenantMainMiddleware` must be the FIRST middleware

```python
MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # MUST BE FIRST
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

#### C. Add Tenant Configuration
```python
# Tenant models
TENANT_MODEL = "tenants.Tenant"
TENANT_DOMAIN_MODEL = "tenants.Domain"

# Shared apps (stored in public schema)
SHARED_APPS = [
    'django_tenants',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'tenants',  # Tenant management
]

# Tenant-specific apps (each tenant gets their own copy)
TENANT_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    
    # Add ALL your existing apps that should be tenant-isolated
    # For example:
    # 'users',
    # 'products',
    # 'orders',
    # 'invoices',
]

# INSTALLED_APPS combines both
INSTALLED_APPS = list(set(SHARED_APPS + TENANT_APPS))
```

### 4. Create Tenant App
Create a new Django app called `tenants`:

```bash
uv run python manage.py startapp tenants
```

#### Create models in `tenants/models.py`:
```python
from django_tenants.models import TenantMixin, DomainMixin
from django.db import models

class Tenant(TenantMixin):
    """
    Tenant model - stored in public schema
    Each tenant gets its own PostgreSQL schema
    """
    name = models.CharField(max_length=100, help_text="Company/Organization name")
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    
    # Tenant configuration
    max_users = models.IntegerField(default=50, help_text="Maximum users allowed")
    is_active = models.BooleanField(default=True)
    subscription_plan = models.CharField(
        max_length=50, 
        default='basic',
        choices=[
            ('basic', 'Basic'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ]
    )
    
    # Metadata
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Auto-create schema when tenant is created
    auto_create_schema = True
    
    class Meta:
        db_table = 'public.tenants'
    
    def __str__(self):
        return self.name


class Domain(DomainMixin):
    """
    Domain model - links domains/subdomains to tenants
    Stored in public schema
    Examples: 
    - acme.yourapp.com
    - tenant1.yourapp.com
    """
    class Meta:
        db_table = 'public.domains'
    
    def __str__(self):
        return self.domain
```

#### Create admin interface in `tenants/admin.py`:
```python
from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Tenant, Domain

@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'schema_name', 'is_active', 'subscription_plan', 'created_on')
    list_filter = ('is_active', 'subscription_plan', 'created_on')
    search_fields = ('name', 'schema_name', 'contact_email')
    readonly_fields = ('schema_name', 'created_on', 'updated_on')

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
    list_filter = ('is_primary',)
    search_fields = ('domain', 'tenant__name')
```

### 5. Create Super Admin Models

#### Option A: In public schema (for global Super Super Admin)
Create a new app or add to existing app:

```python
# In a shared app's models.py (e.g., accounts/models.py)
from django.db import models
from django.contrib.auth.models import User

class SuperSuperAdmin(models.Model):
    """
    Global super administrator - can create and manage tenants
    Stored in public schema
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='super_super_admin')
    created_at = models.DateTimeField(auto_now_add=True)
    permissions = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'public.super_super_admins'
        verbose_name = 'Super Super Admin'
        verbose_name_plural = 'Super Super Admins'
    
    def __str__(self):
        return f"Super Admin: {self.user.username}"
```

#### Option B: In tenant schema (for Tenant Super Admin)
```python
# In a tenant app's models.py (e.g., users/models.py)
from django.db import models
from django.contrib.auth.models import User

class TenantSuperAdmin(models.Model):
    """
    Tenant-level super administrator
    Can manage users and settings within their tenant
    Stored in each tenant's schema
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tenant_super_admin')
    created_at = models.DateTimeField(auto_now_add=True)
    permissions = models.JSONField(default=dict, blank=True)
    can_create_users = models.BooleanField(default=True)
    can_modify_settings = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Tenant Super Admin'
        verbose_name_plural = 'Tenant Super Admins'
    
    def __str__(self):
        return f"Tenant Admin: {self.user.username}"
```

### 6. Migration Strategy

#### Step 1: Create initial migrations
```bash
# Create migrations for tenant app
uv run python manage.py makemigrations tenants

# Create migrations for any new models in shared apps
uv run python manage.py makemigrations
```

#### Step 2: Migrate public schema (shared tables)
```bash
uv run python manage.py migrate_schemas --shared
```

This creates:
- `public.tenants` table
- `public.domains` table
- `public.auth_user` table
- Other shared tables

#### Step 3: Create first tenant (manually or via script)
```python
# In Django shell: uv run python manage.py shell
from tenants.models import Tenant, Domain

# Create tenant
tenant = Tenant(
    schema_name='tenant_demo',  # Will create schema named 'tenant_demo'
    name='Demo Company'
)
tenant.save()  # Automatically creates the PostgreSQL schema

# Create domain
domain = Domain()
domain.domain = 'demo.localhost'  # For local dev
# domain.domain = 'demo.yourapp.com'  # For production
domain.tenant = tenant
domain.is_primary = True
domain.save()
```

#### Step 4: Migrate tenant schemas
```bash
# Migrate all tenant schemas
uv run python manage.py migrate_schemas --tenant

# Or migrate specific tenant
uv run python manage.py migrate_schemas --schema=tenant_demo
```

### 7. Create Management Commands

#### Command: Create Super Super Admin
File: `tenants/management/commands/create_super_super_admin.py`

```python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django_tenants.utils import schema_context

class Command(BaseCommand):
    help = 'Creates a super super admin in public schema'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='superadmin')
        parser.add_argument('--email', type=str, required=True)
        parser.add_argument('--password', type=str, required=True)

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        
        with schema_context('public'):
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'User {username} already exists')
                )
                return
            
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'Super super admin created: {username}')
            )
```

Run it:
```bash
uv run python manage.py create_super_super_admin --email admin@example.com --password securepass123
```

#### Command: Create Tenant
File: `tenants/management/commands/register_tenant.py`

```python
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain

class Command(BaseCommand):
    help = 'Creates a new tenant with admin user'

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, required=True, help='Company name')
        parser.add_argument('--subdomain', type=str, required=True, help='Subdomain')
        parser.add_argument('--admin-email', type=str, required=True)
        parser.add_argument('--admin-password', type=str, required=True)

    def handle(self, *args, **options):
        name = options['name']
        subdomain = options['subdomain']
        admin_email = options['admin_email']
        admin_password = options['admin_password']
        
        # Create tenant
        schema_name = f'tenant_{subdomain}'
        tenant = Tenant(
            schema_name=schema_name,
            name=name
        )
        tenant.save()
        
        # Create domain
        domain = Domain()
        domain.domain = f'{subdomain}.localhost'  # Change for production
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        
        # Create tenant admin
        with schema_context(schema_name):
            admin_user = User.objects.create_superuser(
                username=admin_email,
                email=admin_email,
                password=admin_password
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Tenant created successfully!\n'
                f'Schema: {schema_name}\n'
                f'Domain: {domain.domain}\n'
                f'Admin: {admin_email}'
            )
        )
```

Run it:
```bash
uv run python manage.py register_tenant \
    --name "Acme Corp" \
    --subdomain "acme" \
    --admin-email "admin@acme.com" \
    --admin-password "secure123"
```

### 8. API Views for Tenant Management

#### Tenant Creation API (for Super Super Admin)
```python
# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tenant_api(request):
    """
    Super Super Admin creates a new tenant
    POST /api/admin/tenants/
    {
        "company_name": "Acme Corp",
        "subdomain": "acme",
        "admin_email": "admin@acme.com",
        "admin_password": "secure_password",
        "subscription_plan": "professional"
    }
    """
    
    # Check if user is super super admin
    if not request.user.is_superuser:
        return Response({'error': 'Unauthorized'}, status=403)
    
    data = request.data
    
    try:
        # Create tenant
        schema_name = f"tenant_{data['subdomain']}"
        tenant = Tenant(
            schema_name=schema_name,
            name=data['company_name'],
            subscription_plan=data.get('subscription_plan', 'basic'),
            contact_email=data.get('admin_email')
        )
        tenant.save()
        
        # Create domain
        domain = Domain()
        domain.domain = f"{data['subdomain']}.yourapp.com"
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        
        # Create tenant super admin
        with schema_context(schema_name):
            admin_user = User.objects.create_superuser(
                username=data['admin_email'],
                email=data['admin_email'],
                password=data['admin_password']
            )
        
        return Response({
            'status': 'success',
            'tenant_id': tenant.id,
            'schema_name': schema_name,
            'domain': domain.domain
        }, status=201)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tenant_user(request):
    """
    Tenant Super Admin creates users in their tenant
    POST /api/users/
    {
        "username": "john.doe",
        "email": "john@example.com",
        "password": "secure_password",
        "first_name": "John",
        "last_name": "Doe"
    }
    """
    
    # Check if user is tenant super admin
    if not request.user.is_staff:
        return Response({'error': 'Unauthorized'}, status=403)
    
    data = request.data
    
    try:
        # Automatically scoped to current tenant
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        
        return Response({
            'status': 'success',
            'user_id': user.id,
            'username': user.username
        }, status=201)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)
```

### 9. Local Development Setup

#### Update `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows)
```
127.0.0.1 localhost
127.0.0.1 demo.localhost
127.0.0.1 acme.localhost
127.0.0.1 tenant1.localhost
```

#### Run migrations and server
```bash
# Install dependencies
uv sync

# Create public schema
uv run python manage.py migrate_schemas --shared

# Create super admin
uv run python manage.py create_super_super_admin --email admin@example.com --password admin123

# Create test tenant
uv run python manage.py register_tenant --name "Demo Corp" --subdomain "demo" --admin-email "demo@example.com" --admin-password "demo123"

# Run server
uv run python manage.py runserver 0.0.0.0:8000
```

#### Access URLs
- Super Admin Panel: http://localhost:8000/admin/
- Demo Tenant: http://demo.localhost:8000/
- Acme Tenant: http://acme.localhost:8000/

### 10. Important Notes & Best Practices

#### A. Schema Naming Convention
- Always prefix with `tenant_` (e.g., `tenant_acme`, `tenant_company1`)
- Use lowercase and underscores only
- Keep it short and meaningful

#### B. Migrations
- **ALWAYS** run `migrate_schemas --shared` first
- Then run `migrate_schemas --tenant` for tenant schemas
- Never manually modify the `public` schema

#### C. Queries
- Within a tenant context, all queries are automatically scoped
- Use `schema_context('schema_name')` to switch contexts manually
- Never hardcode schema names in queries

#### D. Testing
```python
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

class MyTestCase(TenantTestCase):
    def test_something(self):
        # Tests run in tenant schema automatically
        pass
```

#### E. Static Files
- Static files are shared across all tenants
- Each tenant can have their own media files using:
```python
# settings.py
MULTITENANT_RELATIVE_MEDIA_ROOT = "%s/media"  # %s is replaced with schema_name
```

### 11. Existing Data Migration

If you have existing data in your database:

#### Option A: Keep existing data as first tenant
1. Rename your current schema or tables
2. Run migrations to create new structure
3. Migrate data into first tenant schema

#### Option B: Start fresh
1. Backup existing data
2. Drop and recreate database
3. Run all migrations
4. Import data into respective tenant schemas

### 12. Production Deployment Checklist

- [ ] Update `ALLOWED_HOSTS` to include all tenant domains
- [ ] Configure proper domain routing (not localhost)
- [ ] Set up database connection pooling
- [ ] Configure proper logging per tenant
- [ ] Set up monitoring for each tenant schema
- [ ] Implement backup strategy per tenant
- [ ] Configure CORS for tenant-specific domains
- [ ] Set up SSL certificates for all domains
- [ ] Test tenant isolation thoroughly
- [ ] Document tenant provisioning process

### 13. Security Considerations

- Never expose schema names to frontend
- Always validate tenant access in middleware
- Implement rate limiting per tenant
- Log all tenant creation/deletion operations
- Use separate database users for different privilege levels
- Regularly audit cross-tenant access attempts

### 14. URLs Configuration

```python
# urls.py
from django.contrib import admin
from django.urls import path, include
from tenants import views as tenant_views

urlpatterns = [
    # Super admin panel (public schema)
    path('admin/', admin.site.urls),
    
    # Tenant management APIs
    path('api/admin/tenants/', tenant_views.create_tenant_api),
    path('api/users/', tenant_views.create_tenant_user),
    
    # Your existing URLs
    # These will be tenant-scoped automatically
]
```

---

## Execution Steps Summary

1. Update `pyproject.toml` with dependencies
2. Run `uv sync` to install packages
3. Update `settings.py` with all configuration above
4. Create `tenants` app with models
5. Run `uv run python manage.py makemigrations`
6. Run `uv run python manage.py migrate_schemas --shared`
7. Create super admin: `uv run python manage.py create_super_super_admin --email admin@example.com --password admin123`
8. Create test tenant: `uv run python manage.py register_tenant --name "Demo" --subdomain "demo" --admin-email "demo@example.com" --admin-password "demo123"`
9. Run `uv run python manage.py migrate_schemas --tenant`
10. Update `/etc/hosts` for local testing
11. Start server: `uv run python manage.py runserver 0.0.0.0:8000`
12. Test access at http://demo.localhost:8000/

---

## Verification

After implementation, verify:
- [ ] Can access Django admin at localhost:8000/admin
- [ ] Can create new tenants via API or admin
- [ ] Each tenant has isolated database schema
- [ ] Subdomain routing works correctly
- [ ] Users in one tenant cannot access another tenant's data
- [ ] Migrations work for both shared and tenant schemas
- [ ] Super Super Admin can manage all tenants
- [ ] Tenant Super Admin can only manage their tenant

---

## Troubleshooting

### Issue: "relation does not exist"
**Solution**: Run `migrate_schemas --shared` then `migrate_schemas --tenant`

### Issue: "TenantMainMiddleware not found"
**Solution**: Ensure `django_tenants` is first in INSTALLED_APPS and MIDDLEWARE

### Issue: Subdomain not resolving
**Solution**: Check `/etc/hosts` and ensure domain is in `public.domains` table

### Issue: Can't create users in tenant
**Solution**: Ensure you're in correct schema context using `schema_context()`

### Issue: Migrations not applying to tenants
**Solution**: Use `migrate_schemas --tenant`, not regular `migrate`

---

## Additional Resources

- django-tenants documentation: https://django-tenants.readthedocs.io/
- PostgreSQL schemas: https://www.postgresql.org/docs/current/ddl-schemas.html
- Multi-tenancy patterns: https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy

---

**END OF PROMPT**
