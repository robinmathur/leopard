# Event framework multi-tenant adjustment
_Exported on 19/12/2025 at 18:14:07 GMT+5:30 from Cursor (2.2.20)_

---

**User**

Check Plan.md for for event driven framework and MultiTenant.md for how i would implemne multi tenant.  Now how thies event framwrork would work in multi tenant.

Just explain me  how it would adjust, (no implementation required at this moment)

---

**Cursor**


Reviewing PLAN.md and MultiTenant.md to understand the event framework and multi-tenant architecture, then explaining how they work together.



Explaining how the event-driven framework would work in a multi-tenant architecture:



How the event-driven framework would work in a multi-tenant (schema-per-tenant) architecture:

## Event Framework in Multi-Tenant Architecture

### 1. Event storage location

Events should be stored in tenant schemas, not the public schema.

- Events are tenant-specific: they track changes to tenant-scoped entities (Client, Task, Note, etc.).
- Handlers access tenant data: handlers query Client, User, Task, etc., which live in tenant schemas.
- Isolation: each tenant's events are isolated in its schema.

Model adjustment:
```python
class Event(models.Model):
    # ... existing fields ...
    
    # Add tenant reference (if using FK-based multi-tenancy)
    # OR rely on schema isolation (if using schema-per-tenant)
    
    # For schema-per-tenant: No tenant FK needed - schema provides isolation
    # For FK-based: Add tenant = ForeignKey(Tenant, ...)
```

### 2. Event creation (request thread)

When an entity changes in a tenant context:

```
User in Tenant A updates Client
    ↓
TenantMainMiddleware sets schema to 'tenant_a'
    ↓
Model.save() triggers signal
    ↓
Event created in 'tenant_a' schema (same transaction)
    ↓
Event status = PENDING
```

- Events are created in the current tenant's schema automatically.
- No cross-tenant leakage: the middleware ensures the correct schema.

### 3. Event processing (async worker)

The processor must switch to the correct tenant schema before processing:

```
Async Worker picks up PENDING event
    ↓
Event has entity_type='Client', entity_id=123
    ↓
Determine tenant from event context:
  - Option A: Store tenant_id in Event model
  - Option B: Infer from entity (Client → Branch → Tenant)
    ↓
Switch to tenant schema: schema_context(tenant_schema_name)
    ↓
Execute handlers in tenant context:
  - ClientActivityHandler queries Client (tenant-scoped)
  - NotificationHandler queries User (tenant-scoped)
  - TaskHandler creates Task (tenant-scoped)
    ↓
All operations isolated to that tenant
```

Processor adjustment:
```python
# processor.py
from django_tenants.utils import schema_context

def process_event(event: Event):
    # Determine tenant schema from event
    tenant_schema = get_tenant_schema_for_event(event)
    
    # Switch to tenant context
    with schema_context(tenant_schema):
        # All queries now scoped to this tenant
        handlers = get_handlers_for_event(event)
        for handler in handlers:
            handler.handle(event, ...)
```

### 4. Tenant identification strategies

Option A: Store tenant in Event (recommended)
```python
class Event(models.Model):
    # ... existing fields ...
    tenant_schema = models.CharField(max_length=100)  # e.g., 'tenant_acme'
    # OR
    tenant_id = models.PositiveIntegerField()  # If using FK-based
```

Option B: Infer from entity
```python
def get_tenant_schema_for_event(event: Event) -> str:
    """Infer tenant schema from entity."""
    if event.entity_type == 'Client':
        # Query Client in all schemas? No - need to know which schema
        # Better: Store tenant info in event
        pass
```

Recommendation: Store `tenant_schema` in the Event model for reliable processing.

### 5. Handler execution in tenant context

All handlers must run within the tenant's schema context:

```python
# client_activity_handler.py
def handle(event: Event, handler_config: dict) -> HandlerResult:
    # Already in tenant schema context (from processor)
    # This query is automatically scoped to current tenant
    client = Client.objects.get(id=event.entity_id)  # ✅ Tenant-scoped
    
    # Create activity in same tenant
    activity = ClientActivity.objects.create(...)  # ✅ Tenant-scoped
    
    # Notification recipients are tenant-scoped
    recipients = resolve_recipients(event, ...)  # ✅ Only users in this tenant
```

### 6. Notification and SSE delivery

Notifications are tenant-scoped:

```python
# notification_handler.py
def handle(event: Event, handler_config: dict):
    recipients = resolve_recipients(event, config)
    
    for user in recipients:
        # User is already tenant-scoped (queried in tenant schema)
        notification_create(
            assigned_to=user,  # ✅ User belongs to current tenant
            ...
        )
        # SSE delivery automatically scoped to user's tenant
```

SSE channels should be tenant-aware:
- Channel name: `tenant_{schema}_user_{user_id}` or `user_{user_id}` (if user ID is globally unique per tenant)

### 7. Event processing control (pause/resume)

Options:

Option A: Global control (simpler)
- Single `EventProcessingControl` in the public schema.
- Pauses/resumes processing for all tenants.

Option B: Per-tenant control (more flexible)
- `EventProcessingControl` in each tenant schema.
- Each tenant can pause/resume independently.

Recommendation: Start with global control; add per-tenant later if needed.

### 8. Startup recovery

On server start, process unprocessed events across all tenants:

```python
# apps.py - startup hook
def process_pending_events_on_startup():
    # Get all tenant schemas
    from tenants.models import Tenant
    
    for tenant in Tenant.objects.all():
        schema_name = tenant.schema_name
        
        with schema_context(schema_name):
            # Process pending events in this tenant
            pending_events = Event.objects.filter(status='PENDING')
            for event in pending_events[:100]:  # Batch
                process_event(event)
```

### 9. Cross-tenant considerations

- No cross-tenant events: events only affect entities within the same tenant.
- Recipient resolution: `resolve_role_recipients()` should only return users from the current tenant schema.
- Task assignment: tasks are created in the same tenant as the triggering entity.

### 10. Configuration per tenant

The `EVENT_HANDLERS` config can be:
- Global: same handlers for all tenants (simpler).
- Per-tenant: allow tenant-specific event behavior (more flexible, stored in `Tenant.settings`).

Recommendation: Start global; add per-tenant configuration later if needed.

### 11. Event cleanup

Cleanup runs per tenant:

```python
# cleanup.py
def cleanup_old_events():
    from tenants.models import Tenant
    
    for tenant in Tenant.objects.all():
        with schema_context(tenant.schema_name):
            # Delete completed events older than 7 days
            cutoff = timezone.now() - timedelta(days=7)
            Event.objects.filter(
                status='COMPLETED',
                processed_at__lt=cutoff
            ).delete()
```

### 12. Summary of adjustments

| Component | Adjustment | Reason |
|-----------|-----------|--------|
| Event model | Add `tenant_schema` field | Identify tenant during processing |
| Processor | Wrap in `schema_context()` | Execute handlers in correct tenant |
| Handlers | No changes needed | Already tenant-scoped via schema context |
| Notification | No changes needed | Users are tenant-scoped |
| SSE | Ensure channel names are tenant-aware | Deliver to correct tenant users |
| Processing control | Store in public or per-tenant | Control processing state |
| Startup recovery | Iterate all tenant schemas | Process events for all tenants |
| Cleanup | Run per tenant schema | Clean up each tenant's events |

### 13. Key principles

1. Events are tenant-scoped: stored and processed within tenant schemas.
2. Schema context switching: processor switches to the tenant schema before executing handlers.
3. Automatic isolation: handlers operate in the tenant context, preventing cross-tenant access.
4. Tenant identification: store tenant info in the Event model for reliable processing.
5. Global configuration: start with a shared handler config; add per-tenant config later if needed.

The framework remains the same; the main change is ensuring events are created and processed within the correct tenant schema context.

```python
class Event(models.Model):
    # ... existing fields ...
    
    # Add tenant reference (if using FK-based multi-tenancy)
    # OR rely on schema isolation (if using schema-per-tenant)
    
    # For schema-per-tenant: No tenant FK needed - schema provides isolation
    # For FK-based: Add tenant = ForeignKey(Tenant, ...)
```

```plaintext
User in Tenant A updates Client
    ↓
TenantMainMiddleware sets schema to 'tenant_a'
    ↓
Model.save() triggers signal
    ↓
Event created in 'tenant_a' schema (same transaction)
    ↓
Event status = PENDING
```

```plaintext
Async Worker picks up PENDING event
    ↓
Event has entity_type='Client', entity_id=123
    ↓
Determine tenant from event context:
  - Option A: Store tenant_id in Event model
  - Option B: Infer from entity (Client → Branch → Tenant)
    ↓
Switch to tenant schema: schema_context(tenant_schema_name)
    ↓
Execute handlers in tenant context:
  - ClientActivityHandler queries Client (tenant-scoped)
  - NotificationHandler queries User (tenant-scoped)
  - TaskHandler creates Task (tenant-scoped)
    ↓
All operations isolated to that tenant
```

```python
# processor.py
from django_tenants.utils import schema_context

def process_event(event: Event):
    # Determine tenant schema from event
    tenant_schema = get_tenant_schema_for_event(event)
    
    # Switch to tenant context
    with schema_context(tenant_schema):
        # All queries now scoped to this tenant
        handlers = get_handlers_for_event(event)
        for handler in handlers:
            handler.handle(event, ...)
```

```python
class Event(models.Model):
    # ... existing fields ...
    tenant_schema = models.CharField(max_length=100)  # e.g., 'tenant_acme'
    # OR
    tenant_id = models.PositiveIntegerField()  # If using FK-based
```

```python
def get_tenant_schema_for_event(event: Event) -> str:
    """Infer tenant schema from entity."""
    if event.entity_type == 'Client':
        # Query Client in all schemas? No - need to know which schema
        # Better: Store tenant info in event
        pass
```

```python
# client_activity_handler.py
def handle(event: Event, handler_config: dict) -> HandlerResult:
    # Already in tenant schema context (from processor)
    # This query is automatically scoped to current tenant
    client = Client.objects.get(id=event.entity_id)  # ✅ Tenant-scoped
    
    # Create activity in same tenant
    activity = ClientActivity.objects.create(...)  # ✅ Tenant-scoped
    
    # Notification recipients are tenant-scoped
    recipients = resolve_recipients(event, ...)  # ✅ Only users in this tenant
```

```python
# notification_handler.py
def handle(event: Event, handler_config: dict):
    recipients = resolve_recipients(event, config)
    
    for user in recipients:
        # User is already tenant-scoped (queried in tenant schema)
        notification_create(
            assigned_to=user,  # ✅ User belongs to current tenant
            ...
        )
        # SSE delivery automatically scoped to user's tenant
```

```python
# apps.py - startup hook
def process_pending_events_on_startup():
    # Get all tenant schemas
    from tenants.models import Tenant
    
    for tenant in Tenant.objects.all():
        schema_name = tenant.schema_name
        
        with schema_context(schema_name):
            # Process pending events in this tenant
            pending_events = Event.objects.filter(status='PENDING')
            for event in pending_events[:100]:  # Batch
                process_event(event)
```

```python
# cleanup.py
def cleanup_old_events():
    from tenants.models import Tenant
    
    for tenant in Tenant.objects.all():
        with schema_context(tenant.schema_name):
            # Delete completed events older than 7 days
            cutoff = timezone.now() - timedelta(days=7)
            Event.objects.filter(
                status='COMPLETED',
                processed_at__lt=cutoff
            ).delete()
```

