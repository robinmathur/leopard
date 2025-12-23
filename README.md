# Leopard - Immigration CRM Platform

A comprehensive **Multi-Tenant SaaS CRM** system designed for Immigration and Study Abroad agents with robust Role-Based Access Control (RBAC) and **PostgreSQL schema-per-tenant architecture**.

## Project Structure

```
leopard/
├── backend/          # Django REST API (Python)
│   ├── tenants/      # Multi-tenant app (Tenant & Domain models)
│   └── immigration/  # Main CRM app (all business models)
├── frontend/         # React SPA (TypeScript)
├── docker-compose.yml
└── README.md
```

## Features

- **🏢 Multi-Tenant Architecture**: PostgreSQL schema-per-tenant for complete data isolation
  - Each tenant gets isolated PostgreSQL schema
  - Subdomain-based routing (e.g., `acme.leopard.com`, `demo.leopard.com`)
  - Automatic schema switching via middleware
  - Independent migrations per tenant
- **🔐 Role-Based Access Control**: Granular permissions using Django Groups
  - Super Super Admin (system-wide, public schema)
  - Tenant Super Admin (tenant-scoped)
  - Region Manager, Branch Admin, Consultant
- **⚡ Event-Driven Framework**: Async event processing with tenant awareness
  - Automatic event creation on model changes
  - Multi-tenant event processing
  - Configurable handlers per event type
- **📊 Compact UI**: High-density interface optimized for maximum data visibility
- **🔄 Real-time Updates**: Server-Sent Events (SSE) for notifications

## Tech Stack

### Backend
- **Python 3.12+** with Django 4.2
- **django-tenants 3.9.0+** for schema-per-tenant multi-tenancy
- **Django REST Framework** for API
- **PostgreSQL** with schema isolation
- **Daphne** for ASGI server (SSE support)
- **uv** for fast package management

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI v5** for component library
- **React Router DOM v6** for routing
- **Zustand** for state management

## Architecture Overview

### Multi-Tenant Schema Architecture

```
PostgreSQL Database
│
├── PUBLIC SCHEMA (Global/Shared)
│   ├── tenants_tenant                           # Tenant records
│   ├── tenants_domain                           # Domain → Tenant mapping
│   ├── auth_user                                # Super Super Admins
│   └── immigration_event_processing_control     # Global event pause/resume
│
├── TENANT_ACME SCHEMA (Acme Corp's Data)
│   ├── immigration_user                         # Tenant users
│   ├── immigration_client                       # Clients
│   ├── immigration_event                        # Events with tenant_schema
│   ├── immigration_task                         # Tasks
│   └── ... (all immigration models)
│
└── TENANT_DEMO SCHEMA (Demo Inc's Data)
    └── ... (same structure, isolated data)
```

### Subdomain Routing Flow

```
1. Request → http://acme.localhost:8000/api/v1/clients/
2. TenantMainMiddleware extracts subdomain: "acme"
3. Lookup Domain → Tenant mapping in public schema
4. Set connection.schema_name = 'tenant_acme'
5. All queries automatically scoped to tenant_acme schema
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager
- PostgreSQL (or use Docker)

### Install uv (Python Package Manager)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Quick Start with Multi-Tenancy

#### 1. Start PostgreSQL Database

```bash
docker-compose up -d
```

#### 2. Setup Backend with Multi-Tenant Support

```bash
cd backend

# Install dependencies (includes django-tenants)
uv sync

# Create fresh database
docker exec leopard-postgres psql -U leopard -d postgres -c "DROP DATABASE IF EXISTS leopard;"
docker exec leopard-postgres psql -U leopard -d postgres -c "CREATE DATABASE leopard;"

# Migrate public schema (shared tables)
uv run python manage.py migrate_schemas --shared

# Create your first tenant
uv run python manage.py shell
```

In the Django shell:

```python
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

# Create tenant
tenant = Tenant(
    schema_name='tenant_main',
    name='Main Agency',
    is_active=True,
    subscription_status='TRIAL'
)
tenant.save()
print(f'✓ Tenant created: {tenant.name}')

# Create domain mapping
domain = Domain(
    domain='main.immigrate.localhost',
    tenant=tenant,
    is_primary=True
)
domain.save()
print(f'✓ Domain: {domain.domain}')

# Create tenant admin in tenant schema
with schema_context(tenant.schema_name):
    User = get_user_model()
    admin = User.objects.create_superuser(
        username='admin@main.com',
        email='admin@main.com',
        password='admin123'
    )
    print(f'✓ Admin created: {admin.email}')
```

Exit shell (`exit()`) and continue:

```bash
# Update /etc/hosts for subdomain routing (macOS/Linux)
echo "127.0.0.1 main.immigrate.localhost" | sudo tee -a /etc/hosts

# Windows: Edit C:\Windows\System32\drivers\etc\hosts
# Add: 127.0.0.1 main.immigrate.localhost

# Start development server
uv run python manage.py runserver 0.0.0.0:8000
```

#### 3. Test Multi-Tenant Setup

```bash
# Test tenant access
curl http://main.immigrate.localhost:8000/api/v1/

# Test login
curl -X POST http://main.immigrate.localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@main.com","password":"admin123"}'
```

#### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Access frontend at: `http://localhost:5173`

## Multi-Tenant Management

### Create Additional Tenants

```python
# Django shell: uv run python manage.py shell
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context
from django.contrib.auth import get_user_model

# Create second tenant
tenant = Tenant(
    schema_name='tenant_demo',
    name='Demo Company',
    is_active=True,
    subscription_status='ACTIVE'
)
tenant.save()

domain = Domain(
    domain='demo.immigrate.localhost',
    tenant=tenant,
    is_primary=True
)
domain.save()

# Create admin for demo tenant
with schema_context('tenant_demo'):
    User = get_user_model()
    admin = User.objects.create_superuser(
        username='admin@demo.com',
        email='admin@demo.com',
        password='demo123'
    )

# Don't forget to add to /etc/hosts:
# 127.0.0.1 demo.immigrate.localhost
```

### Migrate Specific Tenant Schema

```bash
# Migrate a specific tenant's schema
uv run python manage.py migrate_schemas --schema=tenant_main

# Migrate all tenant schemas
uv run python manage.py migrate_schemas
```

### Tenant Database Inspection

```bash
# List all schemas
docker exec leopard-postgres psql -U leopard -d leopard -c "\dn"

# List tables in tenant schema
docker exec leopard-postgres psql -U leopard -d leopard -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'tenant_main';"

# Query tenant data
docker exec leopard-postgres psql -U leopard -d leopard -c \
  "SET search_path TO tenant_main; SELECT * FROM immigration_user;"
```

## API Endpoints

### Multi-Tenant API Access

- Tenant API: `http://<subdomain>.immigrate.localhost:8000/api/v1/`
  - Example: `http://main.immigrate.localhost:8000/api/v1/clients/`
  - Example: `http://demo.immigrate.localhost:8000/api/v1/tasks/`
- Public Admin (Tenant Management): `http://immigrate.localhost:8000/admin/`
- OpenAPI Schema: `http://immigrate.localhost:8000/api/schema/`
- Swagger UI: `http://immigrate.localhost:8000/api/docs/`

### Authentication

```bash
# Login to specific tenant
POST http://main.immigrate.localhost:8000/api/token/
{
  "username": "admin@main.com",
  "password": "admin123"
}

# Use returned JWT token
Authorization: Bearer <access_token>
```

## RBAC Roles (Django Groups)

### System-Wide
- **Super Super Admin**: Can create/manage tenants (public schema)

### Tenant-Scoped
- **Super Admin**: Full access within tenant
- **Region Manager**: Access to all branches in assigned regions
- **Branch Admin**: Access to assigned branches
- **Consultant**: Limited access to own branch

## Development

### Backend Commands

```bash
# Multi-tenant migrations
uv run python manage.py makemigrations tenants
uv run python manage.py makemigrations immigration
uv run python manage.py migrate_schemas --shared    # Public schema
uv run python manage.py migrate_schemas              # All tenants

# Regular Django commands
uv run python manage.py shell
uv run python manage.py dbshell

# Code quality
uv run black .
uv run ruff check .
uv run pytest
```

### Frontend Commands

```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
```

## Event-Driven Framework

The system includes an event-driven framework for async processing:

### Features
- Automatic event creation on model changes (CREATE, UPDATE, DELETE)
- Multi-tenant aware (events include `tenant_schema`)
- Configurable handlers per event type
- Async processing with retry logic
- Global pause/resume control

### Event Processing

```python
# Pause event processing globally
from immigration.events.models import EventProcessingControl
from django_tenants.utils import schema_context

with schema_context('public'):
    control = EventProcessingControl.get_instance()
    control.is_paused = True
    control.save()

# Resume processing
with schema_context('public'):
    control = EventProcessingControl.get_instance()
    control.is_paused = False
    control.save()
```

## Deployment

### Production Considerations

1. **Subdomain Configuration**
   - Update `ALLOWED_HOSTS` in settings.py
   - Configure DNS for wildcard subdomain: `*.leopard.com`
   - Update `Domain` records to use production domains

2. **Database**
   - Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
   - Enable connection pooling
   - Regular backups of all schemas

3. **Static Files & Media**
   ```bash
   uv run python manage.py collectstatic
   ```

4. **ASGI Server** (for SSE support)
   ```bash
   uv run daphne -b 0.0.0.0 -p 8000 leopard.asgi:application
   ```

See `backend/deployment/` for deployment scripts and configurations.

## Troubleshooting

### Common Issues

**Issue**: `relation "immigration_user" does not exist`
- **Solution**: Ensure you're in the correct tenant schema context

**Issue**: `database "leopard" does not exist`
- **Solution**: Create database first:
  ```bash
  docker exec leopard-postgres psql -U leopard -d postgres -c "CREATE DATABASE leopard;"
  ```

**Issue**: Cannot access `subdomain.localhost`
- **Solution**: Add to /etc/hosts:
  ```bash
  echo "127.0.0.1 subdomain.localhost" | sudo tee -a /etc/hosts
  ```

**Issue**: Events not processing
- **Solution**: Check EventProcessingControl status:
  ```python
  from immigration.events.models import EventProcessingControl
  from django_tenants.utils import schema_context

  with schema_context('public'):
      print(EventProcessingControl.is_processing_paused())
  ```

## Documentation

- Backend Architecture: `backend/README.md`
- Event Framework: `backend/specs/003-event-driven-framework/`
- Multi-Tenancy Specs: `backend/specs/003-event-driven-framework/MultiTenant.md`
- Frontend Constitution: `frontend/.specify/memory/constitution.md`

## License

Proprietary - All rights reserved
