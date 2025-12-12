# Reference Pattern Analysis: Client/Visa Views

**Date**: 2025-12-09
**Purpose**: Document the centralized schema pattern used by client and visa views as reference for task/notification refactoring
**Pattern Source**: immigration/api/v1/views/clients.py, immigration/api/v1/views/visa.py

## Pattern Summary

Client and Visa views follow a **centralized schema pattern** where all serializers for a resource are defined in a single dedicated serializer file, and views import from that central location.

## File Organization Pattern

### Structure
```
immigration/api/v1/
├── views/
│   ├── clients.py           # ClientViewSet
│   └── visa.py              # VisaApplicationViewSet
├── serializers/
│   ├── clients.py           # All client serializers in one file
│   └── visa.py              # All visa serializers in one file
```

### Key Characteristics

**✅ Centralized**: All serializers for one resource in one file
- Client: `ClientOutputSerializer`, `ClientCreateSerializer`, `ClientUpdateSerializer` all in `serializers/clients.py`
- Visa: `VisaApplicationOutputSerializer`, `VisaApplicationCreateSerializer`, `VisaApplicationUpdateSerializer` all in `serializers/visa.py`

**✅ Single Import**: Views import all serializers from one location
```python
# In views/clients.py
from immigration.api.v1.serializers.clients import (
    ClientOutputSerializer,
    ClientCreateSerializer,
    ClientUpdateSerializer
)
```

**✅ Separation of Concerns**: 
- Views handle HTTP logic only
- Serializers handle JSON serialization/validation only
- Services handle business logic
- Selectors handle query logic

## Serializer Pattern

### Three Standard Serializers Per Resource

**1. OutputSerializer** (for GET responses):
- Extends `serializers.ModelSerializer`
- Defines complete field list in `Meta.fields`
- Includes computed/related fields using `SerializerMethodField`
- Read-only fields explicitly listed
- Example:
```python
class ClientOutputSerializer(serializers.ModelSerializer):
    visa_category_name = serializers.CharField(source='visa_category.name', read_only=True)
    agent_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = ['id', 'first_name', 'last_name', 'visa_category_name', 'agent_name', ...]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_agent_name(self, obj):
        return str(obj.agent) if obj.agent else None
```

**2. CreateSerializer** (for POST requests):
- Extends `serializers.Serializer` (not ModelSerializer)
- Defines explicit validation for each field
- Uses explicit field types and constraints
- All fields explicitly required or optional
- Example:
```python
class ClientCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False, allow_blank=True)
    visa_category_id = serializers.IntegerField(required=False, allow_null=True)
```

**3. UpdateSerializer** (for PUT/PATCH requests):
- Extends `serializers.Serializer`
- All fields optional (for PATCH support)
- Similar structure to CreateSerializer but with `required=False`
- Example:
```python
class ClientUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
```

## View Pattern

### ViewSet Structure

**Uses ViewSet base class** (not ModelViewSet):
```python
class ClientViewSet(ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [CanManageClients]
    pagination_class = StandardResultsSetPagination
```

**Dynamic Serializer Selection**:
Views explicitly choose which serializer to use based on action:
```python
def list(self, request):
    clients = client_list(...)  # Selector returns queryset
    serializer = ClientOutputSerializer(clients, many=True)
    return Response(serializer.data)

def create(self, request):
    serializer = ClientCreateSerializer(data=request.data)
    if serializer.is_valid():
        client = client_create(**serializer.validated_data, created_by=request.user)
        output = ClientOutputSerializer(client)
        return Response(output.data, status=status.HTTP_201_CREATED)
```

**Service Layer Integration**:
- Views call service functions (not model.objects directly)
- Services return model instances
- Views wrap returned instances in OutputSerializer
- Clean separation: view → service → model

## Documentation Pattern

**Uses drf-spectacular decorators**:
```python
@extend_schema_view(
    list=extend_schema(
        summary="List all clients",
        description="...",
        parameters=[...],
        responses={200: ClientOutputSerializer(many=True)},
        tags=['clients'],
    ),
    create=extend_schema(
        summary="Create a new client",
        request=ClientCreateSerializer,
        responses={201: ClientOutputSerializer},
        tags=['clients'],
    ),
)
class ClientViewSet(ViewSet):
    ...
```

## Current Task/Notification Pattern (Non-Centralized)

### Current Issues

**❌ Scattered Schema Definitions**:
- Task serializers: All in `serializers/task.py` but less explicit validation
- Notification serializers: All in `serializers/notification.py` but includes business logic
- Views use ModelSerializer default behaviors instead of explicit fields

**❌ Mixed Concerns**:
- NotificationCreateSerializer has message generation logic in `.create()` method
- Should be in service layer instead

**✅ Already Good**:
- Uses service layer correctly
- Has separate serializers for Output/Create/Update
- Files are already organized (one serializer file per resource)

### Task Structure (Current)
```
immigration/api/v1/
├── views/
│   └── tasks.py             # TaskViewSet
├── serializers/
│   └── task.py              # TaskOutputSerializer, TaskCreateSerializer, TaskUpdateSerializer
```

**Current**: TaskViewSet uses ModelViewSet (includes default create/update methods)
**Target**: TaskViewSet should use ViewSet and explicitly define actions

## Migration Path: Task/Notification → Client/Visa Pattern

### What to Change

**1. Keep File Structure** (already matches):
- `serializers/task.py` → Keep (centralized ✓)
- `serializers/notification.py` → Keep (centralized ✓)

**2. Refactor Serializers**:
- Make field lists explicit (not relying on ModelSerializer defaults)
- Use `serializers.Serializer` for Create/Update (more explicit validation)
- Move business logic out of serializers (e.g., notification message generation)

**3. Optionally Refactor Views**:
- Consider changing from ModelViewSet to ViewSet
- Make serializer selection explicit
- Ensure service layer calls are clear

### What to Keep

**✅ Keep**:
- Existing file names and locations
- Service layer integration
- Separation of concerns
- drf-spectacular documentation
- All existing field names and types (backward compatibility)

**✅ Optional Enhancements**:
- Can add more computed fields (like `assigned_to_name`)
- Can improve validation messages
- Can add OpenAPI examples

## Summary: Key Takeaways

1. **Centralization**: All serializers for one resource in one file ✓ (Task/Notification already follow this)
2. **Explicitness**: Explicit field definitions, validation, and serializer selection
3. **Separation**: Views → Services → Models, no business logic in serializers
4. **Three Serializers**: Output (ModelSerializer), Create (Serializer), Update (Serializer)
5. **Documentation**: Full OpenAPI/Spectacular documentation at class level

## Recommendation

For task/notification refactor:
- **Keep current file structure** (already centralized)
- **Focus on**:
  - Making field lists more explicit
  - Moving any business logic to services
  - Ensuring backward compatibility
  - Adding better documentation
- **Don't change**:
  - API contracts (field names, types, status codes)
  - Service layer patterns
  - Permission patterns

The main difference between current task/notification and target pattern is level of **explicitness and documentation**, not fundamental organization.

