# Leopard Backend - Django REST API

Immigration CRM Backend with **PostgreSQL schema-per-tenant multi-tenancy** and **event-driven architecture**.

## Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Multi-Tenant Setup](#multi-tenant-setup)
- [Commands](#commands)
- [Event-Driven Framework](#event-driven-framework)
- [API Documentation](#api-documentation)
- [Development](#development)

## Architecture

### Multi-Tenant Schema-Per-Tenant

This application uses **django-tenants** for PostgreSQL schema-per-tenant architecture:

```
PostgreSQL Database: leopard
│
├── PUBLIC SCHEMA
│   ├── tenants_tenant           # Tenant records (Tenant model)
│   ├── tenants_domain           # Domain → Tenant mapping
│   ├── auth_user                # Django's default User for Super Super Admins
│   ├── auth_group               # Django groups
│   ├── auth_permission          # Django permissions
│   └── immigration_event_processing_control  # Global event pause/resume
│
├── TENANT_MAIN SCHEMA (Main Agency)
│   ├── immigration_user         # Custom User model (AbstractUser)
│   ├── immigration_client       # Clients
│   ├── immigration_event        # Events (with tenant_schema field)
│   ├── immigration_task         # Tasks
│   ├── immigration_notification # Notifications
│   ├── immigration_branch       # Branches
│   ├── immigration_region       # Regions
│   └── ... (all other immigration models - 40+ tables)
│
└── TENANT_DEMO SCHEMA (Demo Company)
    └── ... (same structure, completely isolated data)
```

### Key Components

1. **TenantMainMiddleware**: Routes requests to correct schema based on subdomain
2. **Tenants App**: Manages Tenant and Domain models (public schema)
3. **Immigration App**: All business logic (tenant schemas)
4. **Event Framework**: Async event processing with multi-tenant support

### Subdomain Routing

```
http://main.localhost:8000/api/v1/clients/
         ↓
TenantMainMiddleware extracts "main"
         ↓
Looks up Domain("main.localhost") → Tenant(schema_name="tenant_main")
         ↓
Sets connection.schema_name = "tenant_main"
         ↓
ALL queries automatically scoped to tenant_main schema
```

## Prerequisites

- **Python 3.12+**
- **PostgreSQL 15+** (or use Docker)
- **[uv](https://docs.astral.sh/uv/)** - Fast Python package manager
- **Docker** (optional, for PostgreSQL)

### Install uv

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Quick Start

### 1. Start PostgreSQL

```bash
# Using Docker
docker-compose up -d

# Verify PostgreSQL is running
docker ps | grep postgres
```

### 2. Install Dependencies

```bash
cd backend
uv sync
```

This installs all dependencies including:
- `django-tenants>=3.5.0` - Multi-tenancy support
- `djangorestframework` - REST API
- `djangorestframework-simplejwt` - JWT authentication
- `daphne` - ASGI server for SSE
- And more...

### 3. Setup Environment Variables

Create `.env` file:

```env
# Django
SECRET_KEY=dev-secret-key-not-for-production
DEBUG=True

# Database (PostgreSQL)
DB_NAME=leopard
DB_USER=leopard
DB_PASSWORD=leopard
DB_HOST=localhost
DB_PORT=5432
```

## Multi-Tenant Setup

### Step 1: Create Database

```bash
# Create the leopard database
docker exec leopard-postgres psql -U leopard -d postgres -c "CREATE DATABASE leopard;"
```

### Step 2: Migrate Public Schema

This creates shared tables (Tenant, Domain, etc.) in the public schema:

```bash
uv run python manage.py migrate_schemas --shared
```

**What this does**:
- Creates `tenants_tenant` table
- Creates `tenants_domain` table
- Creates Django auth tables (`auth_user`, `auth_group`, `auth_permission`)
- Creates `immigration_event_processing_control` in public schema

### Step 3: Create Your First Tenant

```bash
uv run python manage.py shell
```

In the Django shell:

```python
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

# Create tenant record
tenant = Tenant(
    schema_name='tenant_main',        # PostgreSQL schema name
    name='Main Agency',                # Display name
    is_active=True,
    subscription_status='TRIAL',
    max_users=50
)
tenant.save()
print(f'✓ Tenant created: {tenant.name} (Schema: {tenant.schema_name})')

# Create domain mapping (for subdomain routing)
domain = Domain(
    domain='main.localhost',           # For development
    # domain='main.leopard.com',      # For production
    tenant=tenant,
    is_primary=True
)
domain.save()
print(f'✓ Domain created: {domain.domain}')

# Create tenant admin user IN THE TENANT SCHEMA
with schema_context(tenant.schema_name):
    User = get_user_model()
    admin = User.objects.create_superuser(
        username='admin@main.com',
        email='admin@main.com',
        password='admin123',
        first_name='Admin',
        last_name='User'
    )
    print(f'✓ Tenant admin created: {admin.email}')

print('\n✅ Tenant setup complete!')
print(f'Access URL: http://main.localhost:8000')
exit()
```

### Step 4: Update /etc/hosts (Local Development)

```bash
# macOS/Linux
echo "127.0.0.1 main.localhost" | sudo tee -a /etc/hosts

# Windows: Edit C:\Windows\System32\drivers\etc\hosts
# Add: 127.0.0.1 main.localhost
```

### Step 5: Start Development Server

```bash
uv run python manage.py runserver 0.0.0.0:8000
```

### Step 6: Test Multi-Tenant Access

```bash
# Test tenant API access
curl http://main.localhost:8000/api/v1/

# Test login
curl -X POST http://main.localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@main.com","password":"admin123"}'

# Use the returned access token
curl http://main.localhost:8000/api/v1/clients/ \
  -H "Authorization: Bearer <access_token>"
```

## Commands

### Multi-Tenant Migration Commands

```bash
# Create migrations
uv run python manage.py makemigrations tenants
uv run python manage.py makemigrations immigration

# Migrate public schema only (shared apps)
uv run python manage.py migrate_schemas --shared

# Migrate a specific tenant
uv run python manage.py migrate_schemas --schema=tenant_main

# Migrate all tenant schemas
uv run python manage.py migrate_schemas

# Show migrations status
uv run python manage.py showmigrations
```

### Tenant Management

**Create Additional Tenant** (Django shell):

```python
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

# Create tenant
tenant = Tenant(
    schema_name='tenant_demo',
    name='Demo Company',
    is_active=True,
    subscription_status='ACTIVE'
)
tenant.save()

# Create domain
domain = Domain(
    domain='demo.localhost',
    tenant=tenant,
    is_primary=True
)
domain.save()

# Create admin in tenant schema
with schema_context('tenant_demo'):
    User = get_user_model()
    admin = User.objects.create_superuser(
        username='admin@demo.com',
        email='admin@demo.com',
        password='demo123'
    )

# Don't forget: echo "127.0.0.1 demo.localhost" | sudo tee -a /etc/hosts
```

### Database Inspection

```bash
# List all PostgreSQL schemas
docker exec leopard-postgres psql -U leopard -d leopard -c "\dn"

# List tables in a tenant schema
docker exec leopard-postgres psql -U leopard -d leopard -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_main' ORDER BY tablename;"

# Query tenant data
docker exec leopard-postgres psql -U leopard -d leopard -c \
  "SET search_path TO tenant_main; SELECT id, username, email FROM immigration_user;"

# Check tenant schemas
docker exec leopard-postgres psql -U leopard -d leopard -c \
  "SELECT schema_name, name, is_active FROM public.tenants_tenant;"
```

### Package Management (uv)

```bash
# Install all dependencies (including dev)
uv sync

# Install production dependencies only
uv sync --no-dev

# Add a new package
uv add <package-name>

# Add a dev dependency
uv add --dev <package-name>

# Remove a package
uv remove <package-name>

# Update all packages
uv lock --upgrade

# Export to requirements.txt (for compatibility)
uv export > requirements.txt
```

### Django Commands

```bash
# Django shell (multi-tenant aware)
uv run python manage.py shell

# Database shell
uv run python manage.py dbshell

# Create new Django app
uv run python manage.py startapp <app-name>

# Collect static files
uv run python manage.py collectstatic

# Show available management commands
uv run python manage.py help
```

### Code Quality

```bash
# Format code with black
uv run black .

# Lint with ruff
uv run ruff check .

# Lint and auto-fix
uv run ruff check --fix .

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=immigration --cov=tenants

# Type checking (if mypy is installed)
uv run mypy .
```

## Event-Driven Framework

The system includes an async event-driven framework for processing side effects:

### Features

- **Automatic Event Creation**: Events created on model changes (CREATE, UPDATE, DELETE)
- **Multi-Tenant Aware**: Events include `tenant_schema` field
- **Async Processing**: Events processed in background threads
- **Retry Logic**: Failed events retry with exponential backoff
- **Configurable Handlers**: Define handlers per event type
- **Global Control**: Pause/resume processing across all tenants

### Event Model

```python
class Event(models.Model):
    event_type = CharField()        # e.g., "Client.assigned_to.UPDATE"
    entity_type = CharField()       # e.g., "Client"
    entity_id = IntegerField()      # ID of the entity
    tenant_schema = CharField()     # e.g., "tenant_main"
    action = CharField()            # CREATE, UPDATE, DELETE
    previous_state = JSONField()    # Before state
    current_state = JSONField()     # After state
    changed_fields = JSONField()    # List of changed fields
    status = CharField()            # PENDING, PROCESSING, COMPLETED, FAILED
    # ... more fields
```

### Event Processing

**Pause/Resume Event Processing**:

```python
from immigration.events.models import EventProcessingControl
from django_tenants.utils import schema_context

# Pause (affects all tenants)
with schema_context('public'):
    control = EventProcessingControl.get_instance()
    control.is_paused = True
    control.pause_reason = "System maintenance"
    control.save()

# Resume
with schema_context('public'):
    control = EventProcessingControl.get_instance()
    control.is_paused = False
    control.save()

# Check status
with schema_context('public'):
    is_paused = EventProcessingControl.is_processing_paused()
    print(f"Processing paused: {is_paused}")
```

**View Events for a Tenant**:

```python
from django_tenants.utils import schema_context
from immigration.events.models import Event

with schema_context('tenant_main'):
    # Recent events
    events = Event.objects.order_by('-created_at')[:10]
    for event in events:
        print(f"{event.event_type} - {event.status}")

    # Failed events
    failed = Event.objects.filter(status='FAILED')
    print(f"Failed events: {failed.count()}")
```

### Event Configuration

Events are configured in `immigration/events/config.py`:

```python
TRACKED_ENTITIES = [
    {
        'model': 'immigration.Client',
        'track_fields': ['assigned_to', 'stage'],
    },
    {
        'model': 'immigration.Task',
        'track_fields': ['status', 'assigned_to'],
    },
]

EVENT_HANDLERS = {
    'Client.assigned_to.UPDATE': [
        {
            'handler': 'notification',
            'enabled': True,
            'config': {
                'template': 'client_assigned',
            }
        }
    ],
}
```

## API Documentation

### Endpoints

- **Tenant API**: `http://<subdomain>.localhost:8000/api/v1/`
  - Clients: `/api/v1/clients/`
  - Tasks: `/api/v1/tasks/`
  - Notifications: `/api/v1/notifications/`
  - Users: `/api/v1/users/`

- **Authentication**:
  - Login: `POST /api/token/` (returns access + refresh tokens)
  - Refresh: `POST /api/token/refresh/`
  - Logout (blacklist): `POST /api/token/blacklist/`

- **OpenAPI**:
  - Schema: `http://localhost:8000/api/schema/`
  - Swagger UI: `http://localhost:8000/api/docs/`
  - ReDoc: `http://localhost:8000/api/redoc/`

### Authentication Example

```bash
# Login to tenant
curl -X POST http://main.localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@main.com",
    "password": "admin123"
  }'

# Response:
{
  "access": "eyJ0eXAiOiJKV1QiLC...",
  "refresh": "eyJ0eXAiOiJKV1QiLC..."
}

# Use access token
curl http://main.localhost:8000/api/v1/clients/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLC..."

# Refresh token
curl -X POST http://main.localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1QiLC..."
  }'
```

## Development

### Project Structure

```
backend/
├── leopard/                    # Django project settings
│   ├── settings.py            # Multi-tenant configuration
│   ├── urls.py                # Root URL config
│   ├── asgi.py                # ASGI config (for Daphne/SSE)
│   └── wsgi.py                # WSGI config (for Gunicorn)
│
├── tenants/                    # Multi-tenant app (SHARED_APPS)
│   ├── models.py              # Tenant, Domain models
│   ├── admin.py               # Tenant admin interface
│   └── management/
│       └── commands/
│           └── create_super_super_admin.py
│
├── immigration/                # Main CRM app (TENANT_APPS)
│   ├── models/                # Business models (User, Client, Task, etc.)
│   ├── api/v1/                # API viewsets & serializers
│   ├── selectors/             # Query logic (read operations)
│   ├── services/              # Business logic (write operations)
│   ├── events/                # Event-driven framework
│   │   ├── models.py          # Event, EventProcessingControl
│   │   ├── dispatcher.py      # Signal handlers
│   │   ├── processor.py       # Event processing
│   │   ├── handlers/          # Event handlers
│   │   └── config.py          # Event configuration
│   ├── middleware.py          # CurrentUserMiddleware
│   ├── permissions.py         # Custom DRF permissions
│   └── migrations/            # Database migrations
│
├── pyproject.toml              # Dependencies (uv)
├── uv.lock                     # Lock file
├── .env                        # Environment variables
└── manage.py
```

### Key Settings Configuration

**`leopard/settings.py`**:

```python
# Multi-tenant configuration
TENANT_MODEL = "tenants.Tenant"
TENANT_DOMAIN_MODEL = "tenants.Domain"

SHARED_APPS = [
    'django_tenants',  # MUST BE FIRST
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'tenants',  # Tenant management
]

TENANT_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',
    'immigration',  # ALL business models
    'rest_framework',
    'rest_framework_simplejwt',
    # ... other tenant-specific apps
]

INSTALLED_APPS = list(set(SHARED_APPS + TENANT_APPS))

MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # MUST BE FIRST
    # ... other middleware
]

DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',  # Multi-tenant backend
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': os.environ['DB_PORT']
    }
}

DATABASE_ROUTERS = [
    'django_tenants.routers.TenantSyncRouter',
]

# Custom user model (in tenant schemas)
AUTH_USER_MODEL = 'immigration.User'
```

### Production Server

```bash
# Run with Daphne (ASGI - for SSE support)
uv run daphne -b 0.0.0.0 -p 8000 leopard.asgi:application

# Run with Gunicorn (WSGI - no SSE)
uv run gunicorn leopard.wsgi:application --bind 0.0.0.0:8000

# Run with Uvicorn (ASGI alternative)
uv run uvicorn leopard.asgi:application --host 0.0.0.0 --port 8000
```

## Deployment

See `deployment/` directory for:
- Nginx configuration with subdomain routing
- Daphne (ASGI) systemd service files
- SSL/TLS setup with Let's Encrypt
- Environment-specific settings

### Production Checklist

- [ ] Set `DEBUG=False` in .env
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` for production domains
- [ ] Set up wildcard DNS: `*.leopard.com → <server-ip>`
- [ ] Configure SSL certificates for wildcard domain
- [ ] Set up PostgreSQL backups (all schemas)
- [ ] Configure connection pooling (pgBouncer)
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure static file serving (Nginx or CDN)
- [ ] Enable CORS for frontend domain

## Troubleshooting

**Database doesn't exist**:
```bash
docker exec leopard-postgres psql -U leopard -d postgres -c "CREATE DATABASE leopard;"
```

**Cannot access subdomain**:
```bash
# Add to /etc/hosts
echo "127.0.0.1 subdomain.localhost" | sudo tee -a /etc/hosts
```

**Events not processing**:
```python
from immigration.events.models import EventProcessingControl
from django_tenants.utils import schema_context

with schema_context('public'):
    EventProcessingControl.get_instance().is_paused  # Check if paused
```

**Tenant schema doesn't exist**:
```bash
# Migrate the specific tenant
uv run python manage.py migrate_schemas --schema=tenant_name
```

## Documentation

- Multi-Tenancy Specs: `specs/003-event-driven-framework/MultiTenant.md`
- Event Framework: `specs/003-event-driven-framework/PLAN.md`
- API Integration: `specs/003-event-driven-framework/event_framework_multi_tenant_adj.md`

## License

Proprietary - All rights reserved
