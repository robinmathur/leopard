# Data Model: Align Views & Cleanup

## Entities

### TaskViewSchema
- **Purpose**: Centralized schema/serializer definition for task endpoints.
- **Key fields**: id, title, description, status, priority, due_date, assignee, timestamps.
- **Validation**: status constrained to constants enum; required fields title/status; date parsing/format validation.
- **Relationships**: references user/agent; may link to client or application.

### NotificationViewSchema
- **Purpose**: Centralized schema/serializer definition for notification endpoints.
- **Key fields**: id, message, channel, recipient, metadata/payload, read_at, created_at.
- **Validation**: channel constrained to constants enum; payload metadata validated per channel type; message required.
- **Relationships**: references user/agent; may reference task/client identifiers for context.

### DomainConstants
- **Purpose**: Single-source enums/constants for statuses, types, priorities, channels, roles, queue names.
- **Attributes**: value, label/description, optional mapping to external codes.
- **Constraints**: No duplicate values; stable identifiers for API compatibility.

### EnvironmentConfig
- **Purpose**: Environment-specific settings and toggles.
- **Key fields**: base_domain, notification_channel_defaults, feature flags (e.g., centralized_schema_enabled), integration endpoints.
- **Validation**: All required env vars validated at startup; defaults provided for non-critical optional fields.
- **Relationships**: Consumed by Django settings and downstream modules.
