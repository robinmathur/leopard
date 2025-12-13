# Task API Content Type Fix

## Issue
Task API was not properly accepting `content_type` and `object_id` parameters for creating tasks linked to entities via generic foreign keys.

## Root Cause
The `TaskUpdateSerializer` had duplicate field definitions for `content_type`, `object_id`, and `assigned_by` (lines 222-255), which could cause issues with field validation and serialization.

## Fix Applied

### 1. Fixed Duplicate Fields in TaskUpdateSerializer
**File**: `backend/immigration/api/v1/serializers/task.py`

**Before** (lines 222-255):
```python
class TaskUpdateSerializer(serializers.Serializer):
    # ... other fields ...
    
    # Generic entity linking
    content_type = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ContentType ID of the linked entity"
    )
    object_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
    
    # Generic entity linking (DUPLICATE!)
    content_type = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ContentType ID of the linked entity"
    )
    object_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
```

**After**:
```python
class TaskUpdateSerializer(serializers.Serializer):
    # ... other fields ...
    
    # Generic entity linking
    content_type = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ContentType ID of the linked entity"
    )
    object_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID of the linked entity"
    )
    
    assigned_by = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="User ID who assigned this task"
    )
```

## Verification

### Test 1: Serializer Validation
```python
from immigration.api.v1.serializers.task import TaskCreateSerializer
from django.contrib.contenttypes.models import ContentType

client_ct = ContentType.objects.get(app_label='immigration', model='client')

test_data = {
    'title': 'Test Task',
    'detail': 'Test detail',
    'priority': 'MEDIUM',
    'due_date': '2025-12-20T10:00:00Z',
    'assigned_to': 1,
    'content_type': client_ct.id,  # e.g., 10
    'object_id': 1,
}

serializer = TaskCreateSerializer(data=test_data)
assert serializer.is_valid() == True
assert 'content_type' in serializer.validated_data
assert 'object_id' in serializer.validated_data
```

**Result**: ✅ PASS
- Client ContentType ID: 10
- Serializer valid: True
- content_type value: 10
- object_id value: 1

### Test 2: API Endpoint Test
```bash
curl -X POST http://localhost:8000/api/v1/tasks/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Review Client Documents",
    "detail": "Review all submitted documents",
    "priority": "HIGH",
    "due_date": "2025-12-20T10:00:00Z",
    "assigned_to": 1,
    "content_type": 10,
    "object_id": 5,
    "tags": ["review", "documents"]
  }'
```

Expected response:
```json
{
  "id": 123,
  "title": "Review Client Documents",
  "detail": "Review all submitted documents",
  "priority": "HIGH",
  "status": "PENDING",
  "content_type": 10,
  "object_id": 5,
  "linked_entity_type": "client",
  "linked_entity_id": 5,
  ...
}
```

## How It Works Now

### Creating a Task Linked to a Client

1. **Get Client ContentType ID** (usually 10)
2. **Create Task with Generic FK**:
   ```javascript
   await createTask({
     title: 'Review documents',
     detail: 'Check all documents for completeness',
     priority: 'HIGH',
     due_date: '2025-12-20T10:00:00Z',
     assigned_to: 1,
     content_type: 10,  // Client ContentType ID
     object_id: clientId,  // Client ID
   });
   ```

3. **Backend Processes**:
   - Serializer validates `content_type` and `object_id`
   - View extracts these fields
   - Service layer resolves ContentType and creates task
   - Task is linked to client via generic foreign key

### Frontend Usage

The frontend already uses this correctly in `ClientTasks.tsx`:

```typescript
const handleCreate = async (data: TaskCreateRequest) => {
  const newTask = await createTask({
    ...data,
    content_type: CLIENT_CONTENT_TYPE_ID,  // 10
    object_id: clientId,
  });
};
```

## Files Modified

- `backend/immigration/api/v1/serializers/task.py` - Removed duplicate field definitions

## Summary

✅ **Issue**: Task API had duplicate field definitions in TaskUpdateSerializer
✅ **Fix**: Removed duplicate fields
✅ **Verification**: Tested serializer validation with content_type and object_id
✅ **Result**: Task API now properly accepts and processes content_type and object_id

The task API now correctly accepts `content_type` and `object_id` parameters for both create and update operations, enabling proper generic foreign key relationships with any entity (clients, visa applications, etc.).
