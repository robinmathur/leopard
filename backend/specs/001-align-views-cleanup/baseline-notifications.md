# Regression Baseline: Notification Endpoints

**Date**: 2025-12-09
**Purpose**: Document current behavior of notification endpoints to ensure backward compatibility during refactor
**Endpoints**: GET /api/v1/notifications/ and related actions

## Current Implementation

### Source Files
- **View**: `immigration/api/v1/views/notifications.py` (NotificationViewSet)
- **Serializers**: `immigration/api/v1/serializers/notification.py`
  - NotificationOutputSerializer (for GET responses)
  - NotificationCreateSerializer (for POST requests - used by services)
  - NotificationUpdateSerializer (for PUT/PATCH requests)
- **Service**: `immigration/services/notifications.py`
- **Model**: `immigration/models/notification.py`

### GET /api/v1/notifications/ - List Notifications

**Functionality**: List all notifications for authenticated user with optional filters

**Query Parameters**:
- `include_read` (optional, default: true): Include read notifications in results
- `type` (optional): Filter by notification type (TASK_ASSIGNED, TASK_DUE_SOON, TASK_OVERDUE, VISA_APPROVED, VISA_REJECTED, VISA_STATUS_UPDATE, CLIENT_ASSIGNED, SYSTEM_ALERT, LEAD_ASSIGNED, APPLICATION_ASSIGNED, VISA_APPLICATION_ASSIGNED, REMINDER)

**Response Schema** (NotificationOutputSerializer):
```json
{
  "id": "integer",
  "notification_type": "string (enum)",
  "assigned_to": "integer (user ID)",
  "title": "string (max 200 chars)",
  "message": "string",
  "due_date": "datetime|null (ISO 8601)",
  "meta_info": "object (JSON)",
  "read": "boolean",
  "read_at": "datetime|null (ISO 8601)",
  "is_completed": "boolean",
  "created_at": "datetime (ISO 8601)",
  "updated_at": "datetime (ISO 8601)"
}
```

**Status Codes**:
- 200: Success (returns paginated list)
- 401: Unauthorized (not authenticated)

**Pagination**: Uses StandardResultsSetPagination (25 items per page)

**Behavior**:
- Returns only notifications for the authenticated user (assigned_to)
- Filters are applied via service layer (notification_list function)
- Results ordered by `-created_at` (newest first)
- ReadOnly viewset (no POST/PUT/DELETE via standard REST endpoints)

### POST /api/v1/notifications/ - Create Notification

**Note**: This endpoint is NOT exposed via the viewset (ReadOnlyModelViewSet).
Notifications are created programmatically via service layer only.

**Programmatic Creation** (via NotificationCreateSerializer):
```json
{
  "type": "string (required, notification type)",
  "assigned_to": "integer (required, user ID)",
  "title": "string (auto-generated from type)",
  "message": "string (auto-generated from type)",
  "due_date": "datetime|null (optional)",
  "meta_info": "object (optional, JSON)",
  "created_by": "object (write-only, user info)"
}
```

**Auto-Generated Messages by Type**:
- LEAD_ASSIGNED: "New Lead Assigned", "A new lead has been assigned to you."
- TASK_ASSIGNED: "Task Assigned", "A new task has been assigned to you."
- APPLICATION_ASSIGNED: "Application Assigned", "A new application has been assigned to you."
- VISA_APPLICATION_ASSIGNED: "Visa Application Assigned", "A new visa application has been assigned to you."
- REMINDER: "Reminder", "You have a reminder."
- TASK_DUE_SOON: "Task Due Soon", "A task is approaching its due date."
- TASK_OVERDUE: "Task Overdue", "A task is overdue."
- CLIENT_ASSIGNED: "Client Assigned", "A client has been assigned to you."
- SYSTEM_ALERT: "System Alert", "There is a system alert."

### GET /api/v1/notifications/{id}/ - Retrieve Notification

**Functionality**: Retrieve a specific notification by ID

**Response Schema**: Same as NotificationOutputSerializer

**Status Codes**:
- 200: Success
- 404: Not found or access denied

### Additional Endpoints (Custom Actions)

**PUT/PATCH /api/v1/notifications/{id}/update_notification/** - Update Notification
- Update notification fields (read, is_completed)
- Request: `{"read": true, "is_completed": false}`
- 200: Success, 400: Validation error, 404: Not found

**POST /api/v1/notifications/{id}/mark_read/** - Mark as Read
- Sets read=True and read_at=now
- 200: Success, 404: Not found

**POST /api/v1/notifications/bulk_mark_read/** - Bulk Mark Read
- Request: `{"notification_ids": [1, 2, 3]}`
- Response: `{"marked_read_count": 3}`
- 200: Success, 400: Missing notification_ids

**GET /api/v1/notifications/unread_count/** - Get Unread Count
- Response: `{"unread_count": 5}`
- 200: Success

**GET /api/v1/notifications/overdue/** - Get Overdue Notifications
- Returns notifications with due_date < now
- 200: Success (list)

**GET /api/v1/notifications/stream/** - SSE Stream (Real-time)
- Server-Sent Events endpoint for real-time notifications
- Authentication: Bearer token via query param or header
- Uses Django Channels for real-time delivery
- Sends heartbeats every 30 seconds
- Special function: `notification_sse_view` (not part of viewset)

## Expected Behavior After Refactor

✅ **Backward Compatibility Requirements**:
1. All request/response schemas MUST remain identical
2. All HTTP status codes MUST remain unchanged
3. All query parameters MUST work as before
4. ReadOnly nature of viewset MUST be preserved
5. Pagination MUST remain at 25 items per page
6. Filtering logic MUST produce identical results
7. Field names and types MUST not change
8. Custom action endpoints MUST continue to work
9. SSE stream endpoint MUST remain functional
10. Auto-generated messages MUST remain the same

✅ **Acceptable Changes** (internal only):
- Serializer class names/locations can change
- Import paths can be reorganized
- Internal method names can be refactored
- Code organization can be improved

## Test Validation

To verify backward compatibility after refactor:
1. Test GET /api/v1/notifications/ returns correct schema
2. Test GET /api/v1/notifications/ filters work (include_read, type)
3. Test GET /api/v1/notifications/{id}/ retrieves notification
4. Test POST /api/v1/notifications/{id}/mark_read/ works
5. Test POST /api/v1/notifications/bulk_mark_read/ works
6. Test GET /api/v1/notifications/unread_count/ returns count
7. Test GET /api/v1/notifications/overdue/ returns overdue notifications
8. Test SSE stream endpoint connects and receives messages
9. Verify pagination returns 25 items
10. Verify response ordering by created_at (newest first)

## Current Schema Pattern Issues

⚠️ **Scattered Schema Definitions**:
- NotificationOutputSerializer defined in serializers/notification.py
- NotificationCreateSerializer defined in serializers/notification.py
- NotificationUpdateSerializer defined in serializers/notification.py
- Each serializer defines its own Meta.fields list
- Auto-message generation logic in NotificationCreateSerializer.create()

✅ **Target Pattern** (like client/branch/visa):
- Centralized schema definition in single location
- Views import schema from centralized module
- Single source of truth for field definitions
- Message generation logic could be extracted to service layer
- Easier to maintain and update

## SSE (Server-Sent Events) Implementation

**Special Considerations**:
- SSE endpoint uses separate view function (`notification_sse_view`)
- Uses Django Channels + async generator
- Requires channel layer configuration
- Authentication via JWTQueryParamAuthentication (supports query param)
- Sends heartbeats every 30 seconds to keep connection alive
- Messages formatted as JSON in SSE data field
- Access-Control headers configurable via NOTIFICATION_STREAM_ALLOWED_ORIGIN setting

**Must Preserve**:
- SSE endpoint URL pattern
- Authentication mechanism (both header and query param)
- Message format (data: {json}\n\n)
- Heartbeat mechanism
- Channel layer integration
- CORS headers configuration

## Notes

- Current implementation uses ReadOnlyModelViewSet (no standard create/update/delete)
- Notifications created only via service layer (notification_create function)
- Current implementation already uses service layer correctly (thin views)
- Current implementation already uses enums (NotificationType)
- Current implementation properly separates concerns (view/serializer/service)
- Refactor should focus ONLY on centralizing schema definitions
- SSE implementation is complex - handle with extra care during refactor

