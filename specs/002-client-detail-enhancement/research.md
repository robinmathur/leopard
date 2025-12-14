# Research: Enhanced Client Detail Page

**Feature Branch**: `002-client-detail-enhancement`  
**Date**: 2025-12-13  
**Phase**: 0 - Research & Clarification

## Overview

This document consolidates research findings and decisions for implementing the enhanced client detail page. All "NEEDS CLARIFICATION" items from the Technical Context have been resolved.

## Technology Stack Decisions

### Frontend Testing Framework

**Decision**: Use Vitest (recommended for Vite projects) with React Testing Library

**Rationale**: 
- Vite is the build tool, and Vitest is the recommended testing framework for Vite projects
- Better performance than Jest for Vite-based projects
- Seamless integration with Vite configuration
- React Testing Library is the standard for React component testing

**Alternatives considered**:
- Jest: More established but requires additional configuration for Vite
- Playwright: Better for E2E tests, but overkill for component/integration tests

### Backend API Endpoints

**Decision**: Create new endpoints for Notes, Timeline/Activity, and Profile Picture

**Rationale**:
- Notes: New entity required for client-specific notes (distinct from client.description)
- Timeline/Activity: New entity for audit trail and chronological activity display
- Profile Picture: New entity for client profile images with file storage

**Existing endpoints verified**:
- `/api/v1/clients/` - Client CRUD (exists)
- `/api/v1/tasks/` - Task management (exists, needs enhancement for generic entity linking)
- `/api/v1/notifications/` - Notification system (exists, needs enhancement for new types)
- `/api/v1/reminders/` - Reminder management (exists via ReminderViewSet)
- Passport, Proficiency, Qualification endpoints exist via ViewSets

**Missing endpoints to create**:
- `/api/v1/notes/` - Notes CRUD
- `/api/v1/clients/{id}/timeline/` - Client activity timeline
- `/api/v1/clients/{id}/profile-picture/` - Profile picture upload/retrieve

## Component Reusability Decisions

### Timeline Component

**Decision**: Create generic `Timeline` component in `src/components/shared/Timeline/`

**Rationale**:
- Timeline pattern can be reused for visa applications, college applications, and other entities
- Follows atomic design principles (organism-level component)
- Prop-driven configuration allows different activity types

**Structure**:
```
Timeline/
├── Timeline.tsx          # Main component
├── TimelineItem.tsx      # Individual activity item
├── TimelineFilters.tsx   # Filter controls (optional)
└── types.ts              # TypeScript types
```

### Notes Component

**Decision**: Create generic `Notes` component in `src/components/shared/Notes/`

**Rationale**:
- Notes pattern can be reused for visa applications, tasks, and other entities
- Single responsibility: display and manage notes for any entity
- Composable with Timeline (notes appear in timeline)

**Structure**:
```
Notes/
├── Notes.tsx             # Main component
├── NoteItem.tsx          # Individual note
├── NoteForm.tsx          # Add/edit note form
└── types.ts              # TypeScript types
```

### TaskList Component

**Decision**: Create generic `TaskList` component in `src/components/shared/TaskList/`

**Rationale**:
- Tasks are linkable to multiple entity types (client, visa, application)
- Reusable across different contexts
- Supports filtering and grouping by status

**Structure**:
```
TaskList/
├── TaskList.tsx          # Main component
├── TaskItem.tsx          # Individual task
├── TaskFilters.tsx       # Filter controls
└── types.ts              # TypeScript types
```

## Data Model Decisions

### Note Model

**Decision**: Create new `Note` model with soft deletion

**Rationale**:
- Separate from client.description field
- Supports audit trail (soft delete maintains history)
- Links to client via foreign key
- Tracks author and timestamp

**Fields**:
- `client` (ForeignKey to Client)
- `author` (ForeignKey to User)
- `content` (TextField)
- `created_at`, `updated_at` (LifeCycleModel)
- `deleted_at` (SoftDeletionModel)

### ClientActivity Model

**Decision**: Create new `ClientActivity` model for timeline

**Rationale**:
- Captures all significant client actions for audit trail
- Supports different activity types (note_added, stage_change, document_upload, assignment)
- Enables chronological timeline display
- Can be extended for other entity types in future

**Fields**:
- `client` (ForeignKey to Client)
- `activity_type` (CharField with choices)
- `performed_by` (ForeignKey to User)
- `description` (TextField)
- `metadata` (JSONField for flexible data)
- `created_at` (LifeCycleModel)

### ProfilePicture Model

**Decision**: Create new `ProfilePicture` model with file reference

**Rationale**:
- One-to-one relationship with Client
- Stores file metadata (size, type, upload date)
- Supports file validation and storage abstraction
- Can be extended for other entity types in future

**Fields**:
- `client` (OneToOneField to Client)
- `file` (FileField or ImageField)
- `file_size` (IntegerField)
- `file_type` (CharField)
- `uploaded_by` (ForeignKey to User)
- `created_at`, `updated_at` (LifeCycleModel)

### Task Model Enhancements

**Decision**: Enhance existing `Task` model with:
- `assigned_by` (ForeignKey to User) - track who assigned the task
- Generic foreign key for entity linking (replacing client_id, visa_application_id)

**Rationale**:
- Generic foreign key allows linking to any entity type
- assigned_by field enables notification system for task assignments
- Maintains backward compatibility with existing client_id field during migration

**Migration Strategy**:
- Add new fields as nullable initially
- Migrate existing data
- Make fields required after migration
- Deprecate old client_id, visa_application_id fields

### Notification Model Enhancements

**Decision**: Extend existing `Notification` model to support new notification types

**Rationale**:
- Model already supports multiple notification types via `notification_type` field
- Add new types: NOTE_ADDED, PROFILE_PICTURE_UPLOADED, REMINDER_DUE
- Existing structure is flexible enough

**New Notification Types**:
- `NOTE_ADDED` - When a note is added to a client
- `PROFILE_PICTURE_UPLOADED` - When profile picture is uploaded
- `REMINDER_DUE` - When a reminder date arrives

### Reminder Model Enhancements

**Decision**: Enhance existing `Reminder` model with notification integration

**Rationale**:
- Model already uses generic foreign key (supports client linking)
- Add notification trigger when reminder_date arrives
- Add `reminder_time` field for time-specific reminders

**Enhancements**:
- Add `reminder_time` (TimeField) for time-specific reminders
- Add signal/service to create notifications when reminder date/time arrives
- Add `notification_created` (BooleanField) to track notification status

## File Storage Decision

**Decision**: Use Django's default file storage (FileField) with cloud storage configuration

**Rationale**:
- Django FileField provides abstraction for storage backends
- Can be configured to use S3, Azure Blob, or local storage
- Profile pictures are small files (< 5MB), no need for specialized CDN initially
- Future enhancement: Add image optimization and CDN integration

**Storage Configuration**:
- Use `django-storages` for cloud storage (if needed)
- Validate file types: JPEG, PNG, WebP
- Validate file size: Max 5MB
- Generate thumbnails for performance (future enhancement)

## Performance Optimization Decisions

### Lazy Loading / On-Demand Loading Strategy

**Decision**: Implement lazy loading for all non-essential sections on Client Detail page

**Rationale**:
- Client Detail page is one of the most important views in the application
- Loading all sections (timeline, notes, passport, proficiency, qualifications, visa apps, college apps, tasks, reminders) on page open creates:
  - Slow initial page load (multiple API calls)
  - High server load
  - Cluttered UI with too much information at once
  - Poor user experience
- On-demand loading ensures:
  - Fast initial page load (only essential overview data)
  - Reduced server load (data fetched only when needed)
  - Clean, uncluttered interface
  - Better user experience (user controls what they see)

**Implementation Pattern**:
- **Overview Section**: Loads immediately with essential client info (name, photo, stage, assigned consultant, last activity)
- **All Other Sections**: Load on-demand when user:
  - Clicks on a tab (if using tabbed interface)
  - Expands an accordion section (if using accordion interface)
  - Scrolls to a section (if using scroll-triggered loading)
- **Loading States**: Show skeleton loaders or spinners while data is being fetched
- **Caching**: Cache loaded section data in Zustand store to avoid re-fetching if user navigates away and returns

**Recommended UX Pattern**: Tabbed Interface
- Use Material-UI Tabs component
- Overview tab: Always visible, loads immediately
- Other tabs: Load data only when tab is clicked for the first time
- Show loading indicator in tab content while fetching
- Cache data per tab to avoid re-fetching on tab switch

**Alternative Patterns Considered**:
- Accordion: Good for mobile, but tabs better for desktop with many sections
- Infinite scroll: Not suitable for distinct data types (notes vs timeline vs passport)
- Modal dialogs: Too disruptive for frequently accessed information

### Timeline Pagination

**Decision**: Implement pagination for timeline with 25 items per page

**Rationale**:
- Timeline can exceed 100 entries per client
- Pagination prevents performance issues with large datasets
- 25 items per page balances UX and performance
- Use cursor-based pagination for better performance (future enhancement)
- **Note**: Timeline data only loads when user clicks Timeline tab

### Component Memoization

**Decision**: Use React.memo for list components (Timeline, Notes, TaskList)

**Rationale**:
- Prevents unnecessary re-renders when parent state changes
- Improves performance for large lists
- Use selective memoization (not all components)

### State Management

**Decision**: Use Zustand stores with selectors for client detail state

**Rationale**:
- Zustand is already in use in the project
- Selectors prevent unnecessary component updates
- Separate stores for notes, timeline, and client detail
- Avoid storing derived data in state
- **Lazy Loading Integration**: Store tracks which sections have been loaded to avoid duplicate API calls

## RBAC Integration Decisions

### Permission Requirements

**Decision**: Use existing permission system with new permissions

**Rationale**:
- System already has granular permissions (delete_note, delete_comment, edit_client)
- Add new permissions: `add_note`, `change_note`, `view_clientactivity`
- Permission checks in API views and frontend components

**New Permissions**:
- `immigration.add_note` - Can add notes
- `immigration.change_note` - Can edit notes
- `immigration.delete_note` - Can delete notes (exists)
- `immigration.view_clientactivity` - Can view timeline

### Permission Enforcement

**Decision**: Enforce permissions at both API and UI levels

**Rationale**:
- API-level enforcement prevents unauthorized access
- UI-level enforcement improves UX (hide disabled actions)
- Use `usePermission` hook for frontend checks

## Testing Strategy Decisions

### Component Testing

**Decision**: Unit tests for all reusable components (Timeline, Notes, TaskList)

**Rationale**:
- Reusable components must be thoroughly tested
- Test props, states, and user interactions
- Use React Testing Library best practices

### Integration Testing

**Decision**: Integration tests for client detail page workflows

**Rationale**:
- Test complete user flows (add note, view timeline, upload picture)
- Use MSW for API mocking
- Test RBAC enforcement across different roles

### RBAC Testing

**Decision**: Test permission-based UI elements across all roles

**Rationale**:
- Multi-tenant RBAC has complex permission interactions
- Test Super Admin, Branch Manager, Agent, Intern roles
- Verify data isolation and access control

## OpenAPI Spec Alignment

**Decision**: Update `dev/openapi-spec.yaml` with new endpoints before implementation

**Rationale**:
- OpenAPI spec is the contract between frontend and backend
- Type generation from OpenAPI ensures type safety
- Missing endpoints must be flagged before implementation

**Action Items**:
1. Add Note endpoints to OpenAPI spec
2. Add Timeline/Activity endpoints to OpenAPI spec
3. Add Profile Picture endpoints to OpenAPI spec
4. Update Task endpoints to reflect generic entity linking
5. Update Notification endpoints to include new types

## Summary

All technical clarifications have been resolved. Key decisions:
- Vitest + React Testing Library for frontend testing
- New models: Note, ClientActivity, ProfilePicture
- Enhanced models: Task (generic FK), Notification (new types), Reminder (notification integration)
- Reusable components: Timeline, Notes, TaskList
- File storage via Django FileField with cloud storage support
- **Lazy loading strategy**: Overview loads immediately, all other sections load on-demand (tabbed interface)
- Pagination for timeline (25 items per page)
- Zustand stores with selectors for state management (with lazy loading tracking)
- RBAC integration with new permissions
- OpenAPI spec updates required before implementation

**Status**: ✅ All clarifications resolved, ready for Phase 1 design
