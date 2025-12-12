# Quickstart Guide: Multi-Tenant CRM Refactoring

**Feature**: 001-multi-tenant-crm-refactor  
**Date**: Fri Dec 05 2025  
**Purpose**: Development environment setup and refactoring workflow guide

---

## Prerequisites

Before starting, ensure you have:

- **Python 3.8+** installed
- **PostgreSQL** installed and running
- **Git** installed
- **Code editor** (VS Code, PyCharm, etc.)
- **Access to repository**: Clone the leopard repository

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd leopard
git checkout 001-multi-tenant-crm-refactor
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt

# Install additional refactoring dependencies
pip install drf-spectacular pydantic black ruff
```

### 4. Database Setup

```bash
# Create PostgreSQL database
createdb leopard_dev

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

**.env Configuration**:
```ini
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database
DB_NAME=leopard_dev
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# JWT Keys (RS256)
JWT_SIGNING_KEY=<your-private-key>
JWT_VERIFYING_KEY=<your-public-key>
```

### 5. Run Initial Migrations

```bash
# Apply existing migrations (before squashing)
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

---

## Development Workflow

### Understanding the Refactored Structure

```text
immigration/
├── models/              # Domain models (Step 1)
│   ├── base.py          # LifeCycleModel, SoftDeletionModel
│   ├── tenant.py
│   ├── branch.py
│   ├── user.py
│   └── client.py
├── selectors/           # Read operations (Step 2)
│   ├── clients.py
│   └── users.py
├── services/            # Write operations (Step 3)
│   ├── clients.py
│   └── users.py
└── api/v1/              # API layer (Step 4)
    ├── views/
    ├── serializers/
    └── permissions.py
```

### Refactoring Steps

#### Step 1: Create Base Models

```bash
# Create models directory
mkdir -p immigration/models
touch immigration/models/__init__.py
touch immigration/models/base.py
```

**immigration/models/base.py**:
```python
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class SoftDeletionManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeletionModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, editable=False)
    
    objects = SoftDeletionManager()
    all_objects = models.Manager()
    
    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(using=using)
    
    def hard_delete(self):
        super().delete()

class LifeCycleModel(models.Model):
    created_by = models.ForeignKey(User, SET_NULL, related_name="%(class)s_created_by", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(User, SET_NULL, related_name="%(class)s_updated_by", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
```

#### Step 2: Create Selectors

```bash
mkdir -p immigration/selectors
touch immigration/selectors/__init__.py
touch immigration/selectors/clients.py
```

**immigration/selectors/clients.py**:
```python
from django.db.models import QuerySet
from immigration.models import Client, User

def client_list(*, user: User, filters: dict = None) -> QuerySet[Client]:
    """Get clients filtered by user's role and scope."""
    filters = filters or {}
    
    qs = Client.objects.select_related('branch', 'visa_category')
    
    # Multi-tenant scoping
    if user.role in ['CONSULTANT', 'BRANCH_ADMIN']:
        qs = qs.filter(branch=user.branch)
    elif user.role == 'REGION_MANAGER':
        qs = qs.filter(branch__region=user.region)
    elif user.role == 'COUNTRY_MANAGER':
        qs = qs.filter(branch__tenant=user.tenant)
    
    # Apply filters
    if 'email' in filters:
        qs = qs.filter(email__icontains=filters['email'])
    
    return qs
```

#### Step 3: Create Services

```bash
mkdir -p immigration/services
touch immigration/services/__init__.py
touch immigration/services/clients.py
```

**immigration/services/clients.py**:
```python
from django.db import transaction
from pydantic import BaseModel, EmailStr
from immigration.models import Client, User

class ClientCreateInput(BaseModel):
    email: EmailStr
    name: str
    branch_id: int

@transaction.atomic
def client_create(*, data: ClientCreateInput, user: User) -> Client:
    """Create a new client."""
    client = Client(
        email=data.email,
        name=data.name,
        branch_id=data.branch_id,
        created_by=user
    )
    client.full_clean()
    client.save()
    return client
```

#### Step 4: Refactor API Views

```bash
mkdir -p immigration/api/v1/views
touch immigration/api/v1/__init__.py
touch immigration/api/v1/views/__init__.py
touch immigration/api/v1/views/clients.py
```

**immigration/api/v1/views/clients.py**:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from immigration.selectors.clients import client_list
from immigration.services.clients import client_create, ClientCreateInput

class ClientListApi(APIView):
    def get(self, request):
        clients = client_list(user=request.user)
        # Serialize and return
        return Response(status=200)
```

---

## Running the Application

### Development Server

```bash
# Run development server
python manage.py runserver

# Access at: http://localhost:8000
```

### Generate OpenAPI Specification

```bash
# Install drf-spectacular
pip install drf-spectacular

# Update settings.py
# Add 'drf_spectacular' to INSTALLED_APPS
# Set REST_FRAMEWORK['DEFAULT_SCHEMA_CLASS'] = 'drf_spectacular.openapi.AutoSchema'

# Generate spec
python manage.py spectacular --file specs/001-multi-tenant-crm-refactor/contracts/openapi.yaml
```

### View API Documentation

```bash
# Add to urls.py:
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Access Swagger UI: http://localhost:8000/api/docs/
```

---

## Code Quality Tools

### Format Code with Black

```bash
# Format all Python files
black immigration/

# Check without making changes
black --check immigration/
```

### Lint with Ruff

```bash
# Install ruff
pip install ruff

# Run linter
ruff check immigration/

# Auto-fix issues
ruff check --fix immigration/
```

---

## Database Management

### Create Migrations

```bash
# Create migrations for model changes
python manage.py makemigrations

# View SQL for migration
python manage.py sqlmigrate immigration 0001

# Apply migrations
python manage.py migrate
```

### Seed Data

```bash
# Run seed command (after implementing)
python manage.py seed_data

# This creates:
# - 3 Tenants
# - 2 Branches per Tenant
# - Users for each role
# - 50+ Clients with relationships
```

### Database Backup

```bash
# Backup database
pg_dump leopard_dev > backup_$(date +%Y%m%d).sql

# Restore database
psql leopard_dev < backup_20251205.sql
```

---

## Testing SSE Notifications

### Start Server

```bash
python manage.py runserver
```

### Test with curl

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | jq -r '.token')

# Connect to SSE stream
curl -N http://localhost:8000/api/v1/notifications/stream/?token=$TOKEN
```

### Test with JavaScript

```javascript
// In browser console
const token = 'YOUR_JWT_TOKEN';
const eventSource = new EventSource(`/api/v1/notifications/stream/?token=${token}`);

eventSource.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    console.log('Notification:', data);
});

eventSource.addEventListener('connected', (e) => {
    console.log('Connected:', e.data);
});
```

---

## Common Tasks

### Add New Model

1. Create model in `immigration/models/your_model.py`
2. Import in `immigration/models/__init__.py`
3. Create migration: `python manage.py makemigrations`
4. Apply migration: `python manage.py migrate`
5. Create selector in `immigration/selectors/your_model.py`
6. Create service in `immigration/services/your_model.py`
7. Create API view in `immigration/api/v1/views/your_model.py`

### Add New API Endpoint

1. Create view in `immigration/api/v1/views/`
2. Create serializer if needed
3. Add URL route in `immigration/api/v1/urls.py`
4. Update OpenAPI annotations with `@extend_schema`
5. Regenerate spec: `python manage.py spectacular`

### Debug Permission Issues

```bash
# Django shell
python manage.py shell

>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.get(username='admin')
>>> user.role
'SUPER_ADMIN'
>>> user.branch
<Branch: Main Office>
```

---

## Troubleshooting

### Migration Conflicts

```bash
# Reset migrations (ONLY in development!)
python manage.py migrate immigration zero
rm immigration/migrations/0*.py
python manage.py makemigrations
python manage.py migrate
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -d leopard_dev
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python path
python -c "import sys; print(sys.path)"
```

---

## Next Steps

1. ✅ Environment set up
2. ⏳ Implement base models (`models/base.py`)
3. ⏳ Create selectors for read operations
4. ⏳ Create services for write operations
5. ⏳ Refactor API views to use services/selectors
6. ⏳ Implement custom permissions
7. ⏳ Add SSE notifications
8. ⏳ Squash migrations
9. ⏳ Generate seed data command

**Ready for Implementation**: Yes - start with Phase A (Foundation) from plan.md

---

## Resources

- **Project Spec**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/openapi.yaml](./contracts/openapi.yaml)
- **Research**: [research.md](./research.md)

- **Django Docs**: https://docs.djangoproject.com/
- **DRF Docs**: https://www.django-rest-framework.org/
- **HackSoft Style Guide**: https://github.com/HackSoftware/Django-Styleguide
- **drf-spectacular**: https://drf-spectacular.readthedocs.io/
