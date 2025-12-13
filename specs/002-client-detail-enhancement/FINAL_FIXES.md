# Final Fixes - Task API and Form Alignment

## Issues Fixed

### 1. ✅ Task List API Parameters Exposed
**Issue**: `content_type` and `object_id` query parameters were not exposed in the OpenAPI documentation for GET /api/v1/tasks/

**Fix**: Updated the `@extend_schema` decorator for the `list` method in `TaskViewSet` to include:
- `content_type` (integer) - Filter by ContentType ID
- `object_id` (integer) - Filter by object ID (use with content_type)
- `client` (integer) - Legacy filter by client ID

**File**: `backend/immigration/api/v1/views/tasks.py`

**Changes**:
```python
@extend_schema(
    summary="List tasks",
    description="Get all tasks for the authenticated user. Can filter by status, priority, content_type, object_id, and overdue.",
    parameters=[
        # ... existing parameters ...
        OpenApiParameter(
            name='content_type',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Filter by ContentType ID (for generic foreign key queries)',
            required=False,
        ),
        OpenApiParameter(
            name='object_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Filter by object ID (for generic foreign key queries, use with content_type)',
            required=False,
        ),
        OpenApiParameter(
            name='client',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='Filter by client ID (legacy, prefer using content_type + object_id)',
            required=False,
        ),
        # ... other parameters ...
    ],
    # ...
)
def list(self, request, *args, **kwargs):
    """List all tasks for the authenticated user."""
    return super().list(request, *args, **kwargs)
```

**API Usage**:
```javascript
// Now properly documented and visible in API schema
GET /api/v1/tasks/?content_type=10&object_id=5
GET /api/v1/tasks/?client=5  // Legacy support
```

---

### 2. ✅ Task Form Field Alignment Fixed
**Issue**: Priority and Due Date fields in the task creation form were misaligned and shifted to the right relative to other fields.

**Root Cause**: Using Material-UI `Grid` component with `spacing={2}` created extra margins/padding that caused misalignment.

**Fix**: Replaced `Grid` layout with `Box` using flexbox for better control and consistent alignment.

**File**: `frontend/src/components/shared/TaskList/TaskForm.tsx`

**Changes**:

**Before**:
```tsx
{/* Priority and Due Date */}
<Grid container spacing={2}>
  <Grid item xs={12} sm={6}>
    <TextField
      select
      label="Priority"
      // ...
    />
  </Grid>
  <Grid item xs={12} sm={6}>
    <TextField
      label="Due Date & Time"
      type="datetime-local"
      // ...
    />
  </Grid>
</Grid>
```

**After**:
```tsx
{/* Priority and Due Date */}
<Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
  <TextField
    select
    label="Priority"
    fullWidth
    // ...
  />
  <TextField
    label="Due Date & Time"
    type="datetime-local"
    fullWidth
    // ...
  />
</Box>
```

**Benefits**:
- ✅ Perfect alignment with Title, Description, and other fields
- ✅ Consistent spacing using `gap: 2` (16px)
- ✅ Responsive: column layout on mobile, row on desktop
- ✅ Both fields have equal width (fullWidth)
- ✅ Removed unused `Grid` import

---

## Testing

### Test 1: API Parameters ✅

**Request**:
```bash
GET /api/v1/tasks/?content_type=10&object_id=5
```

**Expected**: 
- Returns tasks linked to Client with ID 5
- Parameters are documented in OpenAPI/Swagger UI

**Verification**:
```bash
cd backend
python manage.py spectacular --file schema.yml
# Check schema for content_type and object_id parameters in /api/v1/tasks/
```

---

### Test 2: Form Alignment ✅

**Visual Check**:
1. Open task creation form
2. All fields (Title, Description, Priority, Due Date, Assign To, Tags) should be perfectly aligned
3. No horizontal shifts between fields
4. Priority and Due Date fields should:
   - Be side-by-side on desktop (sm and above)
   - Stack vertically on mobile
   - Align with the left edge of other fields

**Before Fix**:
```
Title:          [________________________]
Description:    [________________________]
                [________________________]
Priority:          [__________]  Due Date:  [__________]  <- Shifted right!
Assign To:      [________________________]
Tags:           [________________________]
```

**After Fix**:
```
Title:          [________________________]
Description:    [________________________]
                [________________________]
Priority:       [__________]  Due Date:   [__________]  <- Properly aligned!
Assign To:      [________________________]
Tags:           [________________________]
```

---

## Files Modified

1. **Backend**:
   - `backend/immigration/api/v1/views/tasks.py` - Added API parameters to OpenAPI schema

2. **Frontend**:
   - `frontend/src/components/shared/TaskList/TaskForm.tsx` - Fixed form field alignment

---

## Summary

| Issue | Status | Impact |
|-------|--------|--------|
| API parameters not documented | ✅ Fixed | `content_type` and `object_id` now exposed in API docs |
| Form fields misaligned | ✅ Fixed | All fields perfectly aligned using flexbox |

Both issues are now resolved:
1. ✅ Task list API properly documents `content_type` and `object_id` query parameters
2. ✅ Task form fields are perfectly aligned with no horizontal shifts

---

## API Documentation Update

The task list endpoint now supports these filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by task status (PENDING, IN_PROGRESS, COMPLETED, etc.) |
| `priority` | string | Filter by priority (LOW, MEDIUM, HIGH, URGENT) |
| `content_type` | integer | Filter by ContentType ID (for generic FK queries) |
| `object_id` | integer | Filter by object ID (use with content_type) |
| `client` | integer | Filter by client ID (legacy, prefer content_type + object_id) |
| `include_overdue` | boolean | Include overdue tasks (default: true) |

**Example Queries**:
```bash
# Get all tasks for client 5 (using generic FK)
GET /api/v1/tasks/?content_type=10&object_id=5

# Get high priority tasks
GET /api/v1/tasks/?priority=HIGH

# Get in-progress tasks for client 5
GET /api/v1/tasks/?status=IN_PROGRESS&content_type=10&object_id=5

# Legacy client filter
GET /api/v1/tasks/?client=5
```
