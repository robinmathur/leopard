# Data Model: Enhanced Client Detail Page

**Feature Branch**: `002-client-detail-enhancement`  
**Date**: 2025-12-13  
**Phase**: 1 - Design & Contracts

## Overview

This document defines the data models for the enhanced client detail page feature, including new models and enhancements to existing models.

## New Models

### Note

**Purpose**: Store client-specific notes separate from the client description field.

**Table**: `immigration_note`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Unique identifier |
| `client` | ForeignKey(Client) | Required, CASCADE | Client this note belongs to |
| `author` | ForeignKey(User) | Required, SET_NULL | User who created the note |
| `content` | TextField | Required | Note content/text |
| `created_at` | DateTime | Auto, Required | Creation timestamp |
| `updated_at` | DateTime | Auto, Required | Last update timestamp |

**Indexes**:
- `(client, created_at)` - For chronological ordering
- `(author, created_at)` - For user activity tracking

**Relationships**:
- Many-to-One with Client (client.notes)
- Many-to-One with User (author.notes_created)

**Validation Rules**:
- `content` must not be empty
- `content` max length: 10,000 characters
- Soft deletion: Do hard delete, soft delete not required

**State Transitions**:
- no state transition required

---

### ClientActivity

**Purpose**: Track all significant client activities for timeline and audit trail.

**Table**: `immigration_clientactivity`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Unique identifier |
| `client` | ForeignKey(Client) | Required, CASCADE | Client this activity relates to |
| `activity_type` | CharField(30) | Required, Choices | Type of activity |
| `performed_by` | ForeignKey(User) | Required, SET_NULL | User who performed the activity |
| `description` | TextField | Required | Human-readable description |
| `metadata` | JSONField | Default: {} | Flexible data for activity-specific info |
| `created_at` | DateTime | Auto, Required | Activity timestamp |

**Activity Types** (choices):
- `NOTE_ADDED` - Note was added
- `NOTE_EDITED` - Note was edited
- `NOTE_DELETED` - Note was deleted
- `STAGE_CHANGED` - Client stage changed
- `ASSIGNED` - Client assigned to consultant
- `PROFILE_PICTURE_UPLOADED` - Profile picture uploaded
- `PASSPORT_UPDATED` - Passport information updated
- `PROFICIENCY_ADDED` - Language proficiency added
- `QUALIFICATION_ADDED` - Qualification added
- `VISA_APPLICATION_CREATED` - Visa application created
- `COLLEGE_APPLICATION_CREATED` - College application created
- `TASK_CREATED` - Task created
- `TASK_COMPLETED` - Task completed

**Indexes**:
- `(client, created_at)` - For chronological timeline queries
- `(client, activity_type)` - For filtering by activity type
- `(performed_by, created_at)` - For user activity tracking

**Relationships**:
- Many-to-One with Client (client.activities)
- Many-to-One with User (performed_by.activities_performed)

**Validation Rules**:
- `activity_type` must be one of the defined choices
- `description` must not be empty
- `metadata` must be valid JSON

**State Transitions**:
- Created (immutable, no state changes)

---

### ProfilePicture

**Purpose**: Store client profile pictures with file metadata.

**Table**: `immigration_profilepicture`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto | Unique identifier |
| `client` | OneToOneField(Client) | Required, CASCADE | Client this picture belongs to |
| `file` | ImageField | Required | Image file (JPEG, PNG, WebP) |
| `file_size` | Integer | Required | File size in bytes |
| `file_type` | CharField(10) | Required | MIME type (image/jpeg, image/png, image/webp) |
| `uploaded_by` | ForeignKey(User) | Required, SET_NULL | User who uploaded the picture |
| `created_at` | DateTime | Auto, Required | Upload timestamp |
| `updated_at` | DateTime | Auto, Required | Last update timestamp |

**Indexes**:
- `(client)` - Unique constraint via OneToOneField

**Relationships**:
- One-to-One with Client (client.profile_picture)

**Validation Rules**:
- `file` must be valid image format (JPEG, PNG, WebP)
- `file_size` must be <= 5MB (5,242,880 bytes)
- `file_type` must match file extension
- Only one profile picture per client (OneToOne constraint)

**State Transitions**:
- Created → Active (default)
- Active → Replaced (new upload replaces existing)

---

## Enhanced Models

### Task (Enhanced)

**Purpose**: Extend existing Task model to support generic entity linking and assignment tracking.

**Existing Table**: `immigration_task`

**New Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `assigned_by` | ForeignKey(User) | Nullable, SET_NULL | User who assigned the task |
| `content_type` | ForeignKey(ContentType) | Nullable | Generic FK: entity type |
| `object_id` | PositiveIntegerField | Nullable | Generic FK: entity ID |
| `linked_entity` | GenericForeignKey | - | Generic relationship to any entity |

**Deprecated Fields** (to be removed in future migration):
- `client_id` (replaced by generic FK)
- `visa_application_id` (replaced by generic FK)

**New Indexes**:
- `(content_type, object_id)` - For generic FK queries
- `(assigned_by, created_at)` - For assignment tracking

**Validation Rules**:
- Either `client_id` (legacy) or `content_type`/`object_id` (new) must be set
- `assigned_by` should be set when task is assigned

**State Transitions** (existing):
- PENDING → IN_PROGRESS → COMPLETED
- PENDING → CANCELLED
- IN_PROGRESS → CANCELLED

---

### Notification (Enhanced)

**Purpose**: Extend existing Notification model to support new notification types.

**Existing Table**: `immigration_notification`

**New Notification Types** (added to existing choices):
- `NOTE_ADDED` - A note was added to a client
- `PROFILE_PICTURE_UPLOADED` - Profile picture was uploaded
- `REMINDER_DUE` - A reminder date has arrived

**Existing Fields** (no changes):
- All existing fields remain unchanged
- `notification_type` field already supports multiple types
- `meta_info` JSONField can store entity references

**Validation Rules**:
- `notification_type` must be one of the defined choices (including new types)
- `meta_info` should include `client_id` for client-related notifications

---

### Reminder (Enhanced)

**Purpose**: Extend existing Reminder model with notification integration and time support.

**Existing Table**: `immigration_reminder` (via reminder app)

**New Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `reminder_time` | TimeField | Nullable | Time of day for reminder (optional) |
| `notification_created` | BooleanField | Default: False | Whether notification has been created |

**Existing Fields** (already supports client linking):
- `content_type`, `object_id`, `content_object` - Generic FK (already exists)
- `reminder_date` - Date for reminder (already exists)
- `title`, `meta_info`, `created_by`, `created_at` - Already exist

**New Indexes**:
- `(reminder_date, reminder_time, notification_created)` - For reminder processing queries

**Validation Rules**:
- `reminder_date` must be in the future (or allow past for historical reminders)
- `reminder_time` is optional (date-only reminders)
- `notification_created` prevents duplicate notifications

**State Transitions**:
- Created → Pending (default)
- Pending → Notification Sent (`notification_created` = True)
- Pending → Completed (`is_completed` = True)

---

## Existing Models (No Changes)

### Client

**Table**: `immigration_client`

**Usage**: 
- Referenced by Note, ClientActivity, ProfilePicture
- Existing fields used: `id`, `first_name`, `last_name`, `stage`, `assigned_to`, `branch`

**No schema changes required** (relationship fields added via foreign keys in new models)

---

### Passport

**Table**: `immigration_passport`

**Usage**: Displayed in client detail page passport section

**No schema changes required**

---

### Proficiency

**Table**: `immigration_proficiency`

**Usage**: Displayed in client detail page language proficiency section

**No schema changes required**

---

### Qualification

**Table**: `immigration_qualification`

**Usage**: Displayed in client detail page qualifications section

**No schema changes required**

---

### VisaApplication

**Table**: `immigration_visaapplication`

**Usage**: Displayed in client detail page visa applications section

**No schema changes required**

---

### Application (College/Institute)

**Table**: `immigration_application`

**Usage**: Displayed in client detail page college applications section

**No schema changes required**

---

## Relationships Summary

```
Client (1) ──< (N) Note
Client (1) ──< (N) ClientActivity
Client (1) ── (1) ProfilePicture
Client (1) ── (1) Passport
Client (1) ──< (N) Proficiency
Client (1) ──< (N) Qualification
Client (1) ──< (N) VisaApplication
Client (1) ──< (N) Application
Client (1) ──< (N) Task (via generic FK)
Client (1) ──< (N) Reminder (via generic FK)

User (1) ──< (N) Note (author)
User (1) ──< (N) ClientActivity (performed_by)
User (1) ──< (N) ProfilePicture (uploaded_by)
User (1) ──< (N) Task (assigned_to, assigned_by)
User (1) ──< (N) Reminder (created_by)
```

## Data Integrity Rules

1. **Note**: Soft deletion only (maintains audit trail)
2. **ClientActivity**: Immutable (no updates/deletes after creation)
3. **ProfilePicture**: One per client (OneToOne constraint)
4. **Task**: Generic FK must reference valid entity
5. **Reminder**: Generic FK must reference valid entity (typically Client)

## Migration Strategy

1. **Phase 1**: Create new models (Note, ClientActivity, ProfilePicture)
2. **Phase 2**: Add new fields to Task (assigned_by, generic FK) - nullable initially
3. **Phase 3**: Migrate existing Task.client_id to generic FK
4. **Phase 4**: Make Task generic FK fields required, deprecate client_id
5. **Phase 5**: Add new fields to Reminder (reminder_time, notification_created)
6. **Phase 6**: Add new notification types to Notification model choices

## Performance Considerations

1. **Timeline Pagination**: ClientActivity queries use `(client, created_at)` index for efficient pagination
2. **Note Filtering**: Notes use `(client, deleted_at)` index for active note queries
3. **Profile Picture**: OneToOne relationship ensures single query for client picture
4. **Task Generic FK**: Index on `(content_type, object_id)` for efficient entity queries
