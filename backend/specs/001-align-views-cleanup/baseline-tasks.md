# Regression Baseline: Task Endpoints

**Date**: 2025-12-09
**Purpose**: Document current behavior of task endpoints to ensure backward compatibility during refactor
**Endpoints**: GET/POST /api/v1/tasks/

## Current Implementation

### Source Files
- **View**: `immigration/api/v1/views/tasks.py` (TaskViewSet)
- **Serializers**: `immigration/api/v1/serializers/task.py`
  - TaskOutputSerializer (for GET responses)
  - TaskCreateSerializer (for POST requests)
  - TaskUpdateSerializer (for PUT/PATCH requests)
- **Service**: `immigration/services/tasks.py`
- **Model**: `immigration/models/task.py`

### GET /api/v1/tasks/ - List Tasks

**Functionality**: List all tasks for authenticated user with optional filters

**Query Parameters**:
- `status` (optional): Filter by task status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `include_overdue` (optional, default: true): Include overdue tasks in results

**Response Schema** (TaskOutputSerializer):
```json
{
  "id": "integer",
  "title": "string",
  "detail": "string",
  "priority": "string (LOW|MEDIUM|HIGH|URGENT)",
  "status": "string (PENDING|IN_PROGRESS|COMPLETED|CANCELLED|OVERDUE)",
  "due_date": "datetime (ISO 8601)",
  "assigned_to": "integer (user ID)",
  "assigned_to_name": "string (username)",
  "tags": ["string"],
  "comments": [{"user_id": "int", "username": "str", "text": "str", "created_at": "datetime"}],
  "client_id": "integer|null",
  "visa_application_id": "integer|null",
  "completed_at": "datetime|null",
  "created_at": "datetime (ISO 8601)",
  "updated_at": "datetime (ISO 8601)"
}
```

**Status Codes**:
- 200: Success (returns paginated list)
- 401: Unauthorized (not authenticated)

**Pagination**: Uses StandardResultsSetPagination (25 items per page)

**Behavior**:
- Returns only tasks assigned to the authenticated user
- Filters are applied via service layer (task_list function)
- Results ordered by `-due_date` (most urgent first)
- Includes read-only computed field: `assigned_to_name`

### POST /api/v1/tasks/ - Create Task

**Functionality**: Create a new task and send assignment notification

**Request Schema** (TaskCreateSerializer):
```json
{
  "title": "string (required, max 200 chars)",
  "detail": "string (required)",
  "priority": "string (optional, default: MEDIUM)",
  "due_date": "datetime (required, ISO 8601)",
  "assigned_to": "integer (required, user ID)",
  "tags": ["string"] (optional),
  "client_id": "integer|null (optional)",
  "visa_application_id": "integer|null (optional)"
}
```

**Response Schema**: Same as TaskOutputSerializer (GET response)

**Status Codes**:
- 201: Created (returns created task)
- 400: Bad Request (validation errors)
- 401: Unauthorized (not authenticated)

**Side Effects**:
- Creates Task record in database
- Sets `created_by` to authenticated user
- Sends TASK_ASSIGNED notification to assigned_to user
- Notification includes: task title, priority, due_date, task_id

**Validation**:
- title: Required, max 200 characters
- detail: Required
- priority: Must be valid enum value (LOW, MEDIUM, HIGH, URGENT)
- due_date: Required, must be valid datetime
- assigned_to: Required, must be valid user ID

### Additional Endpoints (Custom Actions)

**GET /api/v1/tasks/{id}/** - Retrieve Task
- Returns single task by ID
- 200: Success, 404: Not found or access denied

**PUT/PATCH /api/v1/tasks/{id}/** - Update Task
- Full update (PUT) or partial update (PATCH)
- 200: Success, 400: Validation error, 404: Not found

**DELETE /api/v1/tasks/{id}/** - Delete Task
- Soft delete
- 204: No content, 404: Not found

**POST /api/v1/tasks/{id}/complete/** - Mark Complete
- Sets status to COMPLETED
- 200: Success, 404: Not found

**POST /api/v1/tasks/{id}/cancel/** - Mark Cancelled
- Sets status to CANCELLED
- 200: Success, 404: Not found

**POST /api/v1/tasks/{id}/add_comment/** - Add Comment
- Request: `{"comment": "string"}`
- 200: Success, 400: Missing comment, 404: Not found

**GET /api/v1/tasks/overdue/** - Get Overdue Tasks
- Returns tasks with status PENDING or IN_PROGRESS and due_date < now
- 200: Success (list)

**GET /api/v1/tasks/due_soon/** - Get Tasks Due Soon
- Query param: `days` (optional, default: 3)
- Returns tasks due within specified days
- 200: Success (list)

## Expected Behavior After Refactor

✅ **Backward Compatibility Requirements**:
1. All request/response schemas MUST remain identical
2. All HTTP status codes MUST remain unchanged
3. All query parameters MUST work as before
4. All side effects (notifications) MUST still occur
5. Pagination MUST remain at 25 items per page
6. Filtering logic MUST produce identical results
7. Field names and types MUST not change
8. Validation rules MUST remain the same

✅ **Acceptable Changes** (internal only):
- Serializer class names/locations can change
- Import paths can be reorganized
- Internal method names can be refactored
- Code organization can be improved

## Test Validation

To verify backward compatibility after refactor:
1. Test GET /api/v1/tasks/ returns correct schema
2. Test GET /api/v1/tasks/ filters work (status, priority, include_overdue)
3. Test POST /api/v1/tasks/ creates task with correct fields
4. Test POST /api/v1/tasks/ sends notification to assigned user
5. Test POST /api/v1/tasks/ validation errors return 400
6. Test all custom actions still work
7. Verify pagination returns 25 items
8. Verify response ordering by due_date

## Current Schema Pattern Issues

⚠️ **Scattered Schema Definitions**:
- TaskOutputSerializer defined in serializers/task.py
- TaskCreateSerializer defined in serializers/task.py  
- TaskUpdateSerializer defined in serializers/task.py
- Each serializer defines its own Meta.fields list

✅ **Target Pattern** (like client/branch/visa):
- Centralized schema definition in single location
- Views import schema from centralized module
- Single source of truth for field definitions
- Easier to maintain and update

## Notes

- Current implementation already uses service layer correctly (thin views)
- Current implementation already uses enums (TaskStatus, TaskPriority)
- Current implementation properly separates concerns (view/serializer/service)
- Refactor should focus ONLY on centralizing schema definitions

