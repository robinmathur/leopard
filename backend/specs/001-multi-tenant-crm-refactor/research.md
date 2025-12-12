# Research: Multi-Tenant CRM Refactoring Technical Decisions

**Feature**: 001-multi-tenant-crm-refactor  
**Date**: Fri Dec 05 2025  
**Purpose**: Document technical research and decisions for Django/DRF refactoring project

---

## Overview

This document consolidates research findings for key architectural decisions in refactoring the multi-tenant immigration CRM system. All research was conducted to resolve "NEEDS CLARIFICATION" items from the Technical Context and to validate best practices for:

1. Service/Selector pattern implementation
2. SSE (Server-Sent Events) for real-time notifications
3. Custom DRF permission classes for role-based access control
4. Soft deletion implementation
5. Migration squashing strategy
6. OpenAPI generation tooling

---

## 1. Service/Selector Pattern

### Decision

**Adopt Service/Selector Pattern** following the HackSoft Django Style Guide approach:
- **Services** (`services.py`): Write operations (create, update, delete) with business logic
- **Selectors** (`selectors.py`): Read operations (queries, filtering, data retrieval)
- **Use Pydantic** for input/output type validation in services
- **Keep APIs thin**: Views delegate to services/selectors

### Rationale

1. **Perfect for Multi-Tenancy**: Selectors centralize tenant/branch/region filtering logic - crucial for our 6-tier role hierarchy
2. **Current Pain Point**: Existing codebase has business logic scattered across views and serializers
3. **Testability**: Business logic can be tested without HTTP layer mocking
4. **Reusability**: Services can be called from APIs, management commands, Celery tasks
5. **Team Scalability**: Multiple developers can work on different services without merge conflicts
6. **Transaction Management**: Explicit `@transaction.atomic` decorators in services (vs hidden in save methods)

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **Fat Models** | Business logic doesn't belong on data models; violates SRP; hard to test; multi-tenant filtering logic is contextual (depends on requesting user) |
| **Fat Views** | Already causing maintenance issues; business logic mixed with HTTP concerns; hard to reuse |
| **Repository Pattern** | Django ORM already provides excellent query abstraction; adds unnecessary layer |
| **Keep Current Structure** | Technical debt accumulating; views contain 200+ lines of mixed concerns |

### Implementation Guidance

**Module Organization** (for large app like `immigration`):

```text
immigration/
├── models/
│   ├── client.py
│   ├── visa.py
│   └── application.py
├── selectors/              # NEW
│   ├── __init__.py
│   ├── clients.py          # client_list, client_get
│   ├── users.py
│   └── applications.py
├── services/               # NEW
│   ├── __init__.py
│   ├── clients.py          # client_create, client_update
│   ├── users.py
│   └── applications.py
└── api/v1/
    ├── views/
    └── serializers/
```

**Naming Convention**: `{entity}_{action}`
- Selectors: `client_list`, `client_get`, `client_get_for_export`
- Services: `client_create`, `client_update`, `client_delete`

**Example Selector** (read operation with multi-tenant scoping):

```python
# immigration/selectors/clients.py
from django.db.models import QuerySet
from immigration.models import Client, User

def client_list(*, user: User, filters: dict = None) -> QuerySet[Client]:
    """
    Get clients filtered by user's role and scope.
    
    Role-based filtering:
    - Consultant/Branch Admin: only their branch
    - Region Manager: all branches in their region
    - Country Manager: entire tenant
    """
    filters = filters or {}
    
    qs = Client.objects.select_related(
        'branch', 'visa_category', 'assigned_to'
    ).filter(active=True)
    
    # Multi-tenant scoping
    if user.role in ['CONSULTANT', 'BRANCH_ADMIN']:
        qs = qs.filter(branch=user.branch)
    elif user.role == 'REGION_MANAGER':
        qs = qs.filter(branch__region=user.region)
    elif user.role == 'COUNTRY_MANAGER':
        qs = qs.filter(branch__tenant=user.tenant)
    
    # Additional filters
    if 'email' in filters:
        qs = qs.filter(email__icontains=filters['email'])
    
    return qs
```

**Example Service** (write operation with Pydantic validation):

```python
# immigration/services/clients.py
from django.db import transaction
from pydantic import BaseModel, EmailStr
from immigration.models import Client, User

class ClientCreateInput(BaseModel):
    email: EmailStr
    name: str
    branch_id: int
    visa_category_id: int

@transaction.atomic
def client_create(*, data: ClientCreateInput, user: User) -> Client:
    """Create a new client with proper tenant scoping."""
    
    # Validate branch belongs to user's scope
    if user.role == 'BRANCH_ADMIN' and data.branch_id != user.branch_id:
        raise PermissionError("Cannot create client for different branch")
    
    client = Client(
        email=data.email,
        name=data.name,
        branch_id=data.branch_id,
        visa_category_id=data.visa_category_id,
        created_by=user,
        active=True
    )
    
    client.full_clean()
    client.save()
    
    # Side effects (email, notifications) here
    transaction.on_commit(
        lambda: send_welcome_email.delay(client.id)
    )
    
    return client
```

**Refactored API View** (thin layer):

```python
# immigration/api/v1/views/clients.py
from rest_framework.views import APIView
from rest_framework.response import Response
from immigration.selectors.clients import client_list
from immigration.services.clients import client_create, ClientCreateInput

class ClientListApi(APIView):
    def get(self, request):
        clients = client_list(user=request.user)
        data = ClientOutputSerializer(clients, many=True).data
        return Response(data)

class ClientCreateApi(APIView):
    def post(self, request):
        input_data = ClientCreateInput(**request.data)
        client = client_create(data=input_data, user=request.user)
        return Response({'id': client.id}, status=201)
```

### Pydantic vs Dataclasses

**Decision: Use Pydantic**

| Feature | Dataclasses | Pydantic |
|---------|-------------|----------|
| Runtime validation | ❌ No | ✅ Yes |
| Type coercion | ❌ No | ✅ Yes (e.g., "123" → 123) |
| Detailed errors | ❌ Basic | ✅ Field-level messages |
| Django integration | ⚠️ Manual | ✅ pydantic-django package |
| Performance | ✅ Fast | ⚠️ ~10% slower (acceptable) |

Pydantic provides better error messages and validation for API inputs, worth the small performance trade-off.

### Migration Strategy

1. **Phase 1**: Create selectors for read operations (low risk)
2. **Phase 2**: Create services for write operations (test carefully)
3. **Phase 3**: Migrate ViewSets to use services/selectors (one at a time)
4. **Phase 4**: Remove business logic from old views/serializers

Start with `Client` model (most critical for business), then `User`, then `Visa`/`Application`.

---

## 2. SSE (Server-Sent Events) Implementation

### Decision

**Use Custom StreamingHttpResponse Implementation** (not django-eventstream library)

### Rationale

1. **Simplicity**: One-way notifications don't need WebSocket complexity
2. **No Additional Infrastructure**: Works with existing daphne 4.1.2 ASGI server (already installed)
3. **JWT Integration**: Easy to authenticate SSE connections with existing JWT setup
4. **Lightweight**: ~50-100KB memory per connection (vs WebSocket overhead)
5. **Nginx Compatible**: Standard HTTP/HTTPS, no special proxy requirements
6. **Automatic Reconnection**: Browsers handle SSE reconnection natively

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **Keep Django Channels (WebSocket)** | Two-way communication not needed; Channels adds deployment complexity (ASGI workers, channel layer); overkill for notifications |
| **django-eventstream library** | Requires GRIP proxy (Pushpin) or Redis for multi-instance; adds persistence layer we don't need; heavier dependency footprint |
| **Polling (setInterval)** | Inefficient; wastes server resources; doesn't meet <2s latency requirement |
| **Long-polling** | More complex than SSE; requires custom reconnection logic |

### Implementation Structure

**SSE View** (`immigration/api/v1/views/notification_stream.py`):

```python
import json
import asyncio
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from channels.layers import get_channel_layer

async def sse_event_stream(user_id):
    """Generate SSE events for a specific user."""
    channel_layer = get_channel_layer()
    channel_name = f"sse_user_{user_id}"
    
    # Send initial connection message
    yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"
    
    # Subscribe to user-specific channel
    await channel_layer.group_add(channel_name, channel_name)
    
    try:
        while True:
            # Wait for messages with 30s timeout (keepalive)
            message = await asyncio.wait_for(
                channel_layer.receive(channel_name),
                timeout=30.0
            )
            
            if message:
                event_type = message.get('type', 'message')
                event_data = message.get('data', {})
                
                # Format SSE message
                yield f"event: {event_type}\n"
                yield f"data: {json.dumps(event_data)}\n\n"
                
    except asyncio.TimeoutError:
        # Send keepalive comment
        yield ": keepalive\n\n"
    finally:
        await channel_layer.group_discard(channel_name, channel_name)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_stream(request):
    """SSE endpoint at /api/v1/notifications/stream/"""
    user_id = request.user.id
    
    response = StreamingHttpResponse(
        sse_event_stream(user_id),
        content_type='text/event-stream'
    )
    
    # Required SSE headers
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'  # Disable Nginx buffering
    
    return response
```

**Sending Notifications** (from services):

```python
# immigration/services/notifications.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def send_notification_to_user(user_id: int, notification_data: dict):
    """Send notification via SSE to a specific user."""
    channel_layer = get_channel_layer()
    channel_name = f"sse_user_{user_id}"
    
    async_to_sync(channel_layer.group_send)(
        channel_name,
        {
            'type': 'notification',
            'data': notification_data
        }
    )

# Usage in a service
@transaction.atomic
def task_assign(*, task_id: int, assigned_user_id: int):
    task = Task.objects.get(id=task_id)
    task.assigned_to_id = assigned_user_id
    task.save()
    
    # Send notification
    transaction.on_commit(lambda: send_notification_to_user(
        assigned_user_id,
        {
            'type': 'task_assigned',
            'task_id': task.id,
            'task_title': task.title
        }
    ))
```

**Frontend Client** (JavaScript):

```javascript
const connectSSE = (token) => {
    // Note: EventSource doesn't support Authorization header directly
    // Use query param for JWT (simpler) or implement custom auth middleware
    const eventSource = new EventSource(
        `/api/v1/notifications/stream/?token=${token}`
    );
    
    eventSource.addEventListener('notification', (e) => {
        const data = JSON.parse(e.data);
        console.log('Notification received:', data);
        // Update UI
    });
    
    eventSource.addEventListener('connected', (e) => {
        console.log('SSE connected');
    });
    
    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // EventSource automatically reconnects
    };
    
    return eventSource;
};
```

### Nginx Configuration

**Critical Settings** for SSE (`deployment/nginx/nginx.conf`):

```nginx
location /api/v1/notifications/stream/ {
    proxy_pass http://unix:/home/ubuntu/leopard/daphne.sock;
    proxy_http_version 1.1;
    
    # Critical SSE settings
    proxy_set_header Connection '';
    proxy_buffering off;           # MUST disable buffering
    proxy_cache off;
    proxy_read_timeout 86400s;     # 24 hours (keep connection open)
    
    # Forward headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Authentication Approach

**Option 1: Query Parameter** (Recommended for SSE):

```python
# Manually validate JWT from query param
@api_view(['GET'])
def notifications_stream(request):
    token = request.GET.get('token')
    
    from rest_framework_simplejwt.backends import TokenBackend
    from django.conf import settings
    
    try:
        token_backend = TokenBackend(
            algorithm='RS256',
            verifying_key=settings.SIMPLE_JWT['VERIFYING_KEY']
        )
        valid_data = token_backend.decode(token, verify=True)
        user_id = valid_data['user_id']
        
        # Proceed with SSE stream
        return StreamingHttpResponse(...)
        
    except Exception:
        return HttpResponse('Unauthorized', status=401)
```

**Why query param?** EventSource API doesn't support custom headers natively. Query param is simplest for SSE.

### Performance Expectations

| Metric | Expected Value |
|--------|---------------|
| **Latency** (event trigger → delivery) | 50-500ms (avg ~200ms) |
| **Memory per connection** | 50-100KB |
| **100 concurrent connections** | ~5-10MB total memory |
| **Delivery guarantee** | <2 seconds: ✅ YES |
| **Max connections (single instance)** | 100-500 comfortably |
| **Scalability** | Add Redis channel layer for multi-instance |

### Channel Layer Configuration

**Development** (in-memory):

```python
# settings.py (current)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}
```

**Production** (if scaling beyond 1 instance):

```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}
```

### Migration from WebSockets

1. **Keep** daphne and channels (needed for async SSE views)
2. **Remove** WebSocket consumer code (`consumers.py`)
3. **Remove** ASGI routing for WebSockets
4. **Implement** SSE view as shown above
5. **Update** frontend from WebSocket to EventSource
6. **Configure** Nginx for SSE (disable buffering)

---

## 3. Custom DRF Permission Classes

### Decision

**Use Custom DRF `BasePermission` Classes** (not django-guardian)

Implement two-layer approach:
1. **Permission classes**: Check if user's role allows the action
2. **Selectors**: Filter querysets by tenant/branch/region scope

### Rationale

1. **Simple Role Hierarchy**: Our 6-tier hierarchy doesn't need object-level permissions library
2. **Performance**: Single filtered query (O(1)) vs N object permission checks (O(N))
3. **Scope-Based Not Object-Based**: We filter by branch/region, not individual records
4. **No Additional Dependencies**: django-guardian adds 2 DB tables + JOINs
5. **Tight Integration**: Scoping logic belongs in selectors (same place as query optimization)

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **django-guardian** | Over-engineered for role+scope filtering; adds DB overhead; designed for granular object permissions ("User A can edit Document #5"), not role-based filtering |
| **django-rules** | Better than guardian but still adds complexity; we can achieve same with simple custom permissions |
| **Django Groups/Permissions** | Built-in system too coarse-grained; doesn't handle scope (branch/region) filtering |
| **Check permissions in views** | Violates DRY; permission logic scattered across codebase |

### Implementation Structure

**Base Permission Class** (`immigration/api/v1/permissions.py`):

```python
from rest_framework.permissions import BasePermission

class RoleBasedPermission(BasePermission):
    """
    Base class for role-based permissions.
    
    Subclass and define:
    - allowed_roles: List of roles that can access this resource
    - required_scope: 'branch', 'region', or 'tenant'
    """
    allowed_roles = []  # Override in subclass
    required_scope = None  # Override if scope check needed
    
    def has_permission(self, request, view):
        user = request.user
        
        if not user or not user.is_authenticated:
            return False
        
        # Check role
        if not self.allowed_roles:
            return True  # No role restriction
        
        if user.role not in self.allowed_roles:
            return False
        
        # Additional scope check happens in selectors (via queryset filtering)
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user can access specific object based on scope.
        This is a fallback; prefer filtering at queryset level.
        """
        user = request.user
        
        # Tenant isolation (highest priority)
        if hasattr(obj, 'tenant'):
            if obj.tenant_id != user.tenant_id:
                return False
        
        # Branch-level access
        if user.role in ['CONSULTANT', 'BRANCH_ADMIN']:
            if hasattr(obj, 'branch'):
                return obj.branch_id == user.branch_id
        
        # Region-level access
        elif user.role == 'REGION_MANAGER':
            if hasattr(obj, 'branch'):
                return obj.branch.region_id == user.region_id
        
        # Tenant-wide access (Country Manager, Super Admin)
        return True


class CanManageClients(RoleBasedPermission):
    """Permission for client management."""
    allowed_roles = [
        'CONSULTANT', 'BRANCH_ADMIN', 'REGION_MANAGER',
        'COUNTRY_MANAGER', 'SUPER_ADMIN'
    ]


class CanCreateUsers(RoleBasedPermission):
    """Permission for user creation (hierarchical)."""
    
    def has_permission(self, request, view):
        user = request.user
        
        # Consultants cannot create users
        if user.role == 'CONSULTANT':
            return False
        
        # Check hierarchical creation rules in service layer
        # (permission class only checks if user can access endpoint)
        return user.role in [
            'SUPER_SUPER_ADMIN', 'SUPER_ADMIN', 'COUNTRY_MANAGER',
            'REGION_MANAGER', 'BRANCH_ADMIN'
        ]
```

**Using Permissions in ViewSets**:

```python
# immigration/api/v1/views/clients.py
from immigration.api.v1.permissions import CanManageClients
from immigration.selectors.clients import client_list

class ClientViewSet(ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [CanManageClients]
    
    def get_queryset(self):
        # Scope filtering happens HERE (not in permission class)
        return client_list(user=self.request.user)
```

### Scope Filtering in Selectors

**Critical**: Filtering must happen at queryset level, NOT per-object:

```python
# immigration/selectors/clients.py
def client_list(*, user: User) -> QuerySet[Client]:
    """
    Returns clients scoped to user's role and branch/region/tenant.
    
    This is where multi-tenant filtering happens (not in permission class).
    """
    qs = Client.objects.select_related('branch', 'branch__tenant')
    
    # Always filter by tenant (data isolation)
    qs = qs.filter(branch__tenant=user.tenant)
    
    # Additional scope filtering by role
    if user.role in ['CONSULTANT', 'BRANCH_ADMIN']:
        qs = qs.filter(branch=user.branch)
    elif user.role == 'REGION_MANAGER':
        qs = qs.filter(branch__region=user.region)
    # Country Manager / Super Admin see all (already filtered by tenant)
    
    return qs
```

### Performance Optimization

**N+1 Query Prevention**:

```python
# BAD: N+1 query problem
for client in Client.objects.all():
    if client.branch.tenant_id != user.tenant_id:  # N queries
        pass

# GOOD: Single filtered query
Client.objects.filter(branch__tenant=user.tenant)  # 1 query
```

**Caching User Role/Scope** (optional, if needed):

```python
# immigration/utils/cache.py
from django.core.cache import cache

def get_cached_user_scope(user_id):
    """Cache user's role and scope for 5 minutes."""
    cache_key = f"user_scope_{user_id}"
    scope_data = cache.get(cache_key)
    
    if not scope_data:
        user = User.objects.select_related('branch', 'tenant', 'region').get(id=user_id)
        scope_data = {
            'role': user.role,
            'tenant_id': user.tenant_id,
            'branch_id': user.branch_id,
            'region_id': user.region_id,
        }
        cache.set(cache_key, scope_data, timeout=300)  # 5 minutes
    
    return scope_data
```

### Database Indexing

**Required Indexes** for performance:

```python
# In models
class Client(models.Model):
    # ...
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['branch', 'active']),  # Common filter combo
        ]

class Branch(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_index=True)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant', 'region']),
        ]
```

### Testing Strategy (for reference)

**Test Coverage Needed** (future work, out of scope for refactor):

1. **Tenant Isolation**: User from Tenant A cannot see Tenant B data
2. **Role Hierarchy**: Consultant cannot create users, Branch Admin can only create Consultants
3. **Scope Filtering**: Branch Admin sees only their branch, Region Manager sees their region
4. **Permission Denial**: Proper 403 responses for unauthorized actions
5. **Edge Cases**: User with no branch assigned, multi-branch Region Managers

---

## 4. Soft Deletion Implementation

### Decision

**Create Custom `SoftDeletionModel` Abstract Base Class** (replace django-soft-delete library)

### Rationale

1. **Full Control**: Custom manager to filter deleted records automatically
2. **Simple Implementation**: Only requires `deleted_at` field + custom manager
3. **Integration**: Works seamlessly with existing `LifeCycleModel` base class
4. **Performance**: No external library overhead
5. **Compatibility**: django-soft-delete 1.0.13 is already installed but basic implementation

### Implementation

**Base Model** (`immigration/models/base.py`):

```python
from django.db import models
from django.utils import timezone

class SoftDeletionManager(models.Manager):
    """Manager that automatically filters out soft-deleted records."""
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class SoftDeletionAllManager(models.Manager):
    """Manager to access all records including soft-deleted."""
    pass


class SoftDeletionModel(models.Model):
    """
    Abstract base class for soft deletion.
    
    Usage:
        class MyModel(SoftDeletionModel):
            name = models.CharField(max_length=100)
        
        # Normal queries exclude deleted
        MyModel.objects.all()  # Only active records
        
        # Include deleted
        MyModel.all_objects.all()  # All records
        
        # Soft delete
        obj.delete()  # Sets deleted_at
        
        # Hard delete
        obj.hard_delete()
    """
    deleted_at = models.DateTimeField(null=True, blank=True, editable=False)
    
    objects = SoftDeletionManager()  # Default manager excludes deleted
    all_objects = SoftDeletionAllManager()  # Includes deleted
    
    class Meta:
        abstract = True
    
    def delete(self, using=None, keep_parents=False):
        """Soft delete: set deleted_at timestamp."""
        self.deleted_at = timezone.now()
        self.save(using=using)
    
    def hard_delete(self):
        """Permanently delete from database."""
        super().delete()
    
    def restore(self):
        """Restore a soft-deleted record."""
        self.deleted_at = None
        self.save()
    
    @property
    def is_deleted(self):
        return self.deleted_at is not None
```

**Usage in Models**:

```python
# immigration/models/client.py
from immigration.models.base import LifeCycleModel, SoftDeletionModel

class Client(LifeCycleModel, SoftDeletionModel):
    first_name = models.CharField(max_length=100)
    # ... other fields
```

**Querying**:

```python
# Only active clients
Client.objects.all()  # deleted_at__isnull=True automatically

# Include deleted clients
Client.all_objects.all()  # No automatic filtering

# Explicitly filter deleted
Client.all_objects.filter(deleted_at__isnull=False)

# Soft delete
client.delete()  # Sets deleted_at=timezone.now()

# Hard delete
client.hard_delete()  # Actually removes from DB

# Restore
client.restore()  # Sets deleted_at=None
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **Keep django-soft-delete 1.0.13** | Basic functionality similar to custom implementation; custom gives more control over manager behavior |
| **is_deleted Boolean field** | Doesn't track when deletion occurred; deleted_at timestamp more useful for audit/restore decisions |
| **Historical records (django-simple-history)** | Overkill for soft deletion; we don't need full audit trail (out of scope) |

---

## 5. Migration Squashing Strategy

### Decision

**Squash migrations incrementally, then create single `0001_initial.py`** after careful testing

### Rationale

1. **Reduce Complexity**: 35+ migration files → 1 file simplifies onboarding
2. **Maintainability**: Easier to understand schema from single migration
3. **Performance**: Faster `migrate` command on fresh databases
4. **Clean Slate**: Remove historical cruft and unused operations

### Implementation Strategy

**Critical Prerequisites**:
- ✅ Full database backup (PostgreSQL dump)
- ✅ Test on copy of production data
- ✅ Document current migration state
- ✅ Keep old migrations in separate branch for rollback

**Step-by-Step Process**:

1. **Backup Current State**:
   ```bash
   # Dump production database
   pg_dump leopard_db > backup_before_squash_$(date +%Y%m%d).sql
   
   # Document current migration state
   python manage.py showmigrations > migration_state_before_squash.txt
   ```

2. **Squash Incrementally** (safer than all-at-once):
   ```bash
   # Squash first 10 migrations
   python manage.py squashmigrations immigration 0001 0010
   
   # Test on dev database
   python manage.py migrate
   
   # Verify no data loss
   python manage.py shell
   >>> Client.objects.count()  # Check counts
   
   # Squash next batch
   python manage.py squashmigrations immigration 0011 0020
   
   # Repeat until all squashed
   ```

3. **Create Final `0001_initial.py`**:
   ```bash
   # After all squashes tested, create clean initial
   # Method 1: Use squashmigrations to combine all
   python manage.py squashmigrations immigration 0001 0035
   
   # Method 2: Delete migrations and recreate
   # (ONLY on dev environment first!)
   # rm immigration/migrations/0*.py
   # python manage.py makemigrations
   ```

4. **Verify Schema Matches Production**:
   ```bash
   # Use Django Extensions or manual comparison
   python manage.py sqlmigrate immigration 0001_initial > new_schema.sql
   pg_dump --schema-only leopard_db > production_schema.sql
   
   # Diff schemas (ignoring migration history table)
   diff new_schema.sql production_schema.sql
   ```

5. **Test Migration on Fresh Database**:
   ```bash
   # Create fresh DB
   createdb leopard_test_migration
   
   # Run squashed migrations
   python manage.py migrate --database=leopard_test_migration
   
   # Compare schema with production
   # If identical → safe to deploy
   ```

6. **Deployment Strategy**:
   - **Keep old migrations** until production verified (1 week)
   - **Document migration state** before squashing
   - **Test on staging** with production data copy
   - **Deploy during low-traffic window**
   - **Monitor for issues** post-deployment

### Rollback Plan

If squashing causes issues:

```bash
# 1. Restore from backup
psql leopard_db < backup_before_squash_YYYYMMDD.sql

# 2. Checkout old migrations branch
git checkout migration-backup

# 3. Fake migrations to current state
python manage.py migrate --fake immigration

# 4. Resume normal operations
```

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data loss during squash** | Critical | Full DB backup, test on copy first, incremental squashing |
| **Schema mismatch after squash** | High | Schema diff tools, test on fresh DB, compare with production |
| **Production deployment fails** | High | Test on staging with production data, deploy during low traffic, rollback plan ready |
| **Third-party code depends on specific migrations** | Medium | Audit dependencies, test thoroughly |

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **Keep 35+ migrations** | Technical debt, confusing for new developers, slow migration on fresh DBs |
| **Squash all at once** | Too risky, hard to debug if something breaks, incremental is safer |
| **Delete all migrations and start fresh** | Extremely risky, requires custom data migration scripts, production DB can't replay |

---

## 6. OpenAPI Specification Generation

### Decision

**Use `drf-spectacular` for OpenAPI 3.0 specification generation**

### Rationale

1. **Industry Standard**: Most popular OpenAPI generator for DRF (16k+ stars)
2. **OpenAPI 3.0**: Modern spec version (vs drf-yasg's OpenAPI 2.0/Swagger)
3. **Automatic Generation**: Introspects DRF views, serializers, permissions
4. **Customization**: Decorators for custom schema annotations
5. **Built-in UI**: Swagger UI and ReDoc integration
6. **Active Maintenance**: Actively developed, DRF 3.14+ compatible

### Implementation

**Installation**:

```bash
pip install drf-spectacular
```

**Settings** (`leopard/settings.py`):

```python
INSTALLED_APPS = [
    # ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    # ...
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Immigration CRM API',
    'DESCRIPTION': 'Multi-tenant CRM system for immigration agencies',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    
    # OAuth2/JWT configuration
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    },
    
    # URL configuration
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Development'},
        {'url': 'https://api.yourcrm.com', 'description': 'Production'},
    ],
    
    # Schema generation
    'COMPONENT_SPLIT_REQUEST': True,  # Separate request/response schemas
    'SORT_OPERATIONS': False,  # Keep endpoint order
}
```

**URLs** (`leopard/urls.py`):

```python
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # API schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # Swagger UI
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # ReDoc UI
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Your API endpoints
    path('api/v1/', include('immigration.api.v1.urls')),
]
```

**Custom Schema Annotations**:

```python
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from rest_framework.views import APIView

@extend_schema_view(
    get=extend_schema(
        summary="List all clients",
        description="Returns paginated list of clients filtered by user's role and scope.",
        parameters=[
            OpenApiParameter(
                name='email',
                type=str,
                description='Filter by email (partial match)',
                required=False,
            ),
            OpenApiParameter(
                name='visa_category',
                type=int,
                description='Filter by visa category ID',
                required=False,
            ),
        ],
        responses={
            200: ClientOutputSerializer(many=True),
        },
        tags=['clients'],
    ),
    post=extend_schema(
        summary="Create a new client",
        description="Creates a client within user's branch scope.",
        request=ClientCreateSerializer,
        responses={
            201: ClientOutputSerializer,
            400: OpenApiExample(
                'Validation Error',
                value={'email': ['This field is required.']},
            ),
            403: OpenApiExample(
                'Permission Denied',
                value={'detail': 'Cannot create client for different branch'},
            ),
        },
        tags=['clients'],
    ),
)
class ClientViewSet(ModelViewSet):
    # ...
```

**Generate Schema File**:

```bash
# Generate OpenAPI YAML
python manage.py spectacular --file specs/001-multi-tenant-crm-refactor/contracts/openapi.yaml

# Or JSON
python manage.py spectacular --format openapi-json --file specs/001-multi-tenant-crm-refactor/contracts/openapi.json
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| **drf-yasg** | Only supports OpenAPI 2.0 (Swagger); drf-spectacular is successor, supports OpenAPI 3.0 |
| **Manual OpenAPI spec** | Error-prone, gets out of sync with code, hard to maintain |
| **Postman collections** | Not standard OpenAPI format, doesn't integrate with code |
| **Django REST Swagger** | Deprecated, no longer maintained |

### Generated Spec Structure

`specs/001-multi-tenant-crm-refactor/contracts/openapi.yaml`:

```yaml
openapi: 3.0.3
info:
  title: Immigration CRM API
  version: 1.0.0
  description: Multi-tenant CRM system for immigration agencies

servers:
  - url: http://localhost:8000
    description: Development
  - url: https://api.yourcrm.com
    description: Production

paths:
  /api/v1/clients/:
    get:
      summary: List all clients
      description: Returns paginated list of clients filtered by user's role and scope.
      tags:
        - clients
      security:
        - Bearer: []
      parameters:
        - name: email
          in: query
          required: false
          schema:
            type: string
        - name: visa_category
          in: query
          required: false
          schema:
            type: integer
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ClientOutput'
    
    post:
      summary: Create a new client
      tags:
        - clients
      security:
        - Bearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ClientCreate'
      responses:
        '201':
          description: Client created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ClientOutput'
        '400':
          description: Validation error
        '403':
          description: Permission denied

components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    ClientOutput:
      type: object
      properties:
        id:
          type: integer
        email:
          type: string
          format: email
        name:
          type: string
        # ... other fields
```

---

## Summary of Key Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| **Architecture** | Service/Selector pattern with Pydantic | Separation of concerns, testability, multi-tenant scoping |
| **Notifications** | Custom SSE (not django-eventstream) | Simplicity, no extra infrastructure, <2s delivery |
| **Permissions** | Custom DRF permissions (not guardian) | Performance, role+scope filtering, no N+1 queries |
| **Soft Deletion** | Custom SoftDeletionModel base class | Full control, simple, integrates with LifeCycleModel |
| **Migrations** | Incremental squashing → single 0001_initial.py | Reduced complexity, maintainability |
| **OpenAPI** | drf-spectacular | Industry standard, OpenAPI 3.0, auto-generation |

---

## Next Steps

1. ✅ Research complete
2. ⏳ Proceed to Phase 1: Design & Contracts
   - Create `data-model.md` with entity definitions
   - Generate API contracts in `contracts/openapi.yaml`
   - Write `quickstart.md` for development setup
   - Update agent context

**Ready for Phase 1**: Yes
