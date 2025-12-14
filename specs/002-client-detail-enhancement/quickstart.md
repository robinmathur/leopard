# Quick Start: Enhanced Client Detail Page

**Feature Branch**: `002-client-detail-enhancement`  
**Date**: 2025-12-13

## Overview

This guide provides a quick start for implementing the enhanced client detail page feature. It covers the essential steps to get started with development.

## Prerequisites

- Backend: Django 4.2.6, Python 3.8+
- Frontend: Node.js, TypeScript 5.3, React 18.2
- Database: PostgreSQL (configured)
- OpenAPI spec: Located at `frontend/dev/openapi-spec.yaml`

## Implementation Order

### Phase 1: Backend Models & APIs

1. **Create new models** (in `backend/immigration/models/`):
   - `note.py` - Note model
   - `client_activity.py` - ClientActivity model
   - `profile_picture.py` - ProfilePicture model

2. **Create migrations**:
   ```bash
   cd backend
   python manage.py makemigrations immigration
   python manage.py migrate
   ```

3. **Create serializers** (in `backend/immigration/api/v1/serializers/`):
   - `note.py` - Note serializers
   - `client_activity.py` - ClientActivity serializers
   - `profile_picture.py` - ProfilePicture serializers

4. **Create views** (in `backend/immigration/api/v1/views/`):
   - `notes.py` - NoteViewSet
   - `timeline.py` - Timeline view (custom action on ClientViewSet)
   - `profile_picture.py` - ProfilePicture view (custom action on ClientViewSet)

5. **Register routes** (in `backend/immigration/api/v1/routers.py`):
   ```python
   router.register(r'notes', NoteViewSet, basename='note')
   ```

6. **Enhance existing models**:
   - Add `assigned_by` to Task model
   - Add generic FK to Task model
   - Add `reminder_time` and `notification_created` to Reminder model

7. **Update OpenAPI spec**:
   - Add new endpoints to `frontend/dev/openapi-spec.yaml`
   - Reference contracts in `specs/002-client-detail-enhancement/contracts/openapi.yaml`

### Phase 2: Frontend Components

1. **Create reusable components** (in `frontend/src/components/shared/`):
   - `Timeline/` - Generic timeline component
   - `Notes/` - Generic notes component
   - `TaskList/` - Generic task list component

2. **Create client-specific components** (in `frontend/src/components/clients/`):
   - `ClientOverview.tsx` - Overview section
   - `ClientTimeline.tsx` - Timeline section (uses shared Timeline)
   - `ClientNotes.tsx` - Notes section (uses shared Notes)
   - `ClientPassport.tsx` - Passport section
   - `ClientProficiency.tsx` - Language proficiency section
   - `ClientQualifications.tsx` - Qualifications section
   - `ClientVisaApplications.tsx` - Visa applications section
   - `ClientCollegeApplications.tsx` - College applications section
   - `ClientTasks.tsx` - Tasks section (uses shared TaskList)
   - `ClientReminders.tsx` - Reminders section
   - `ProfilePictureUpload.tsx` - Profile picture upload component

3. **Create API clients** (in `frontend/src/services/api/`):
   - `noteApi.ts` - Note API client
   - `timelineApi.ts` - Timeline API client
   - `profilePictureApi.ts` - Profile picture API client
   - `reminderApi.ts` - Reminder API client (if not exists)

4. **Create Zustand stores** (in `frontend/src/store/`):
   - `noteStore.ts` - Note state management
   - `timelineStore.ts` - Timeline state management
   - `clientDetailStore.ts` - Client detail page state

5. **Update ClientDetailPage** (in `frontend/src/pages/Clients/ClientDetailPage.tsx`):
   - **Implement tabbed interface** using Material-UI Tabs
   - **Overview tab**: Load immediately with essential client data
   - **All other tabs**: Load data on-demand when tab is clicked
   - Implement loading states (skeleton loaders) for each section
   - Implement error handling for failed API calls
   - Cache loaded section data in Zustand store
   - Tab structure:
     - Overview (loads immediately)
     - Timeline (lazy load)
     - Notes (lazy load)
     - Documents (lazy load - passport, proficiency, qualifications)
     - Applications (lazy load - visa, college)
     - Tasks (lazy load)
     - Reminders (lazy load)

### Phase 3: Testing

1. **Component tests** (in `frontend/dev/tests/`):
   - Test reusable components (Timeline, Notes, TaskList)
   - Test client-specific components

2. **Integration tests**:
   - Test complete client detail page workflows
   - Test API integrations with MSW

3. **RBAC tests**:
   - Test permission-based UI elements
   - Test data isolation across roles

## Key Files to Create/Modify

### Backend

```
backend/immigration/
├── models/
│   ├── note.py                    # NEW
│   ├── client_activity.py         # NEW
│   └── profile_picture.py         # NEW
├── api/v1/
│   ├── serializers/
│   │   ├── note.py                # NEW
│   │   ├── client_activity.py     # NEW
│   │   └── profile_picture.py     # NEW
│   └── views/
│       ├── notes.py               # NEW
│       ├── timeline.py            # NEW
│       └── profile_picture.py     # NEW
└── services/
    ├── notes.py                   # NEW
    └── timeline.py                # NEW
```

### Frontend

```
frontend/src/
├── components/
│   ├── shared/
│   │   ├── Timeline/              # NEW
│   │   ├── Notes/                 # NEW
│   │   └── TaskList/              # NEW
│   └── clients/
│       ├── ClientOverview.tsx     # NEW
│       ├── ClientTimeline.tsx     # NEW
│       ├── ClientNotes.tsx        # NEW
│       ├── ClientPassport.tsx     # NEW
│       ├── ClientProficiency.tsx  # NEW
│       ├── ClientQualifications.tsx # NEW
│       ├── ClientVisaApplications.tsx # NEW
│       ├── ClientCollegeApplications.tsx # NEW
│       ├── ClientTasks.tsx        # NEW
│       ├── ClientReminders.tsx    # NEW
│       ├── ProfilePictureUpload.tsx # NEW
│       └── ClientDetailPage.tsx   # MODIFY
├── services/api/
│   ├── noteApi.ts                 # NEW
│   ├── timelineApi.ts             # NEW
│   └── profilePictureApi.ts       # NEW
└── store/
    ├── noteStore.ts               # NEW
    ├── timelineStore.ts           # NEW
    └── clientDetailStore.ts       # NEW
```

## Development Workflow

1. **Start backend**:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run tests**:
   ```bash
   # Backend
   cd backend
   pytest

   # Frontend
   cd frontend
   npm test
   ```

4. **Update OpenAPI spec**:
   - After creating new endpoints, regenerate OpenAPI spec:
   ```bash
   cd backend
   python manage.py spectacular --file openapi-schema.yaml
   ```
   - Copy relevant sections to `frontend/dev/openapi-spec.yaml`

## Key Implementation Notes

### Backend

- **Permissions**: Use Django's permission system:
  - `immigration.add_note` - Can add notes
  - `immigration.change_note` - Can edit notes
  - `immigration.delete_note` - Can delete notes
  - `immigration.view_clientactivity` - Can view timeline

- **Soft Deletion**: Notes use soft deletion (`deleted_at` field)

- **Activity Tracking**: Create ClientActivity records via signals or service layer when:
  - Note is added/edited/deleted
  - Client stage changes
  - Client is assigned
  - Profile picture is uploaded
  - Documents are updated

- **File Storage**: Profile pictures stored via Django FileField (configure storage backend)

### Frontend

- **Lazy Loading Implementation** (CRITICAL):
  - **Overview Section**: Load immediately when ClientDetailPage mounts
    - Fetch only essential client data: name, photo, stage, assigned consultant, last activity
    - Use existing `/api/v1/clients/{id}/` endpoint
  - **All Other Sections**: Load on-demand when user clicks tab
    - Use Material-UI Tabs component for tabbed interface
    - Implement tab change handler that:
      1. Checks if section data is already loaded (check Zustand store)
      2. If not loaded, fetch data from API
      3. Show loading skeleton/spinner while fetching
      4. Cache data in Zustand store to avoid re-fetching
    - Sections to implement lazy loading:
      - Timeline: `/api/v1/clients/{id}/timeline/`
      - Notes: `/api/v1/notes/?client={id}`
      - Passport: `/api/v1/passports/?client={id}` (if exists)
      - Proficiency: `/api/v1/proficiencies/?client={id}`
      - Qualifications: `/api/v1/qualifications/?client={id}`
      - Visa Applications: `/api/v1/visa-applications/?client={id}`
      - College Applications: `/api/v1/applications/?client={id}`
      - Tasks: `/api/v1/tasks/?client={id}`
      - Reminders: `/api/v1/reminders/?content_type=client&object_id={id}`
  - **State Management for Lazy Loading**:
    - Add `loadedSections` to `clientDetailStore.ts` to track which sections have been loaded
    - Add `loadingSections` to track sections currently being fetched
    - Use Zustand selectors to check if section is loaded before making API call

- **Component Reusability**: Create generic Timeline, Notes, and TaskList components first

- **State Management**: Use Zustand stores with selectors to prevent unnecessary re-renders

- **Performance**:
  - Use React.memo for list components
  - Implement pagination for timeline (25 items per page)
  - **Lazy loading is the primary performance optimization** - reduces initial load time significantly

- **RBAC**: Use `usePermission` hook to check permissions before showing UI elements

- **OpenAPI Types**: Generate TypeScript types from OpenAPI spec (if using openapi-typescript or similar)

## Testing Checklist

- [ ] Component tests for reusable components
- [ ] Integration tests for client detail page
- [ ] RBAC tests for permission enforcement
- [ ] API contract tests (validate against OpenAPI spec)
- [ ] Accessibility tests (keyboard navigation, ARIA labels)
- [ ] Performance tests (page load time, large dataset handling)

## Next Steps

1. Review the [data-model.md](./data-model.md) for detailed model specifications
2. Review the [contracts/openapi.yaml](./contracts/openapi.yaml) for API endpoint details
3. Review the [research.md](./research.md) for technical decisions
4. Start with backend models and migrations
5. Create API endpoints and update OpenAPI spec
6. Build frontend components following the constitution principles
7. Add tests and verify RBAC enforcement

## Resources

- [Constitution](../.specify/memory/constitution.md) - Development principles
- [OpenAPI Spec](../../frontend/dev/openapi-spec.yaml) - API specification
- [Feature Spec](./spec.md) - Complete feature requirements
