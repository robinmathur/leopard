# Implementation Plan: Enhanced Client Detail Page

**Branch**: `002-client-detail-enhancement` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-client-detail-enhancement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the Client Detail page with comprehensive client management features including overview, timeline, passport, language proficiency, qualifications, visa applications, college applications, notes, tasks, profile picture, and reminders. Redesign Task and Notification systems for broader use cases. This feature integrates existing backend APIs (passport, proficiency, qualification, visa, tasks) with new frontend components following the LeopardUI Modern constitution principles.

**Key UX Design**: Implement lazy loading/on-demand loading for all non-essential sections. Only the Overview section loads immediately with essential client information. All other sections (timeline, notes, passport, proficiency, qualifications, visa apps, college apps, tasks, reminders) load on-demand when the user clicks on the respective tab. This ensures fast initial page load, reduced server load, and a clean, uncluttered interface for this critical view.

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 5.3, React 18.2, Node.js (for mock server)
- Backend: Python 3.8+ with Django 4.2.6

**Primary Dependencies**: 
- Frontend: Material UI 5.15, Zustand 4.5, react-router-dom 6.22, Vite 5.1, MSW 2.12.4
- Backend: Django REST Framework, django-countries

**Storage**: PostgreSQL (via Django ORM)  
**Testing**: 
- Frontend: Vitest, React Testing Library, MSW for API mocking
- Backend: pytest, Django test framework

**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: 
- Client detail page Overview section loads within 1 second (only essential data)
- Individual section data loads within 2 seconds when user clicks tab
- Profile picture upload completes within 5 seconds for images up to 5MB
- First Contentful Paint: < 1.5s on 4G (Overview only)
- Time to Interactive: < 2s on 4G (Overview only)
- **Lazy Loading**: All non-essential sections load on-demand to reduce initial page load time and server load

**Constraints**: 
- Bundle size budget: < 500KB initial JS (gzipped)
- Compact UI theme compliance (small sizes, reduced padding, 13px base font)
- RBAC enforcement for all operations
- Multi-tenant data isolation

**Scale/Scope**: 
- Multi-tenant SaaS with role-based access (Super Admin, Branch Manager, Agent, Intern)
- Clients list can exceed 10K records
- Timeline entries can exceed 100 per client
- Support for concurrent edits by multiple users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Based on `.specify/memory/constitution.md` v1.0.0:**

- [x] **Reusability**: Identified reusable component opportunities
  - Timeline component (reusable for any entity with activity history) - ✅ Defined in research.md
  - Notes component (reusable for any entity requiring notes) - ✅ Defined in research.md
  - Document section components (passport, proficiency, qualification patterns) - ✅ Pattern identified
  - Task list component (reusable across entity types) - ✅ Defined in research.md
  - Profile picture upload component - ✅ Defined in quickstart.md
- [x] **OpenAPI**: Verified required endpoints exist in `dev/openapi-spec.yaml`
  - ✅ Contracts defined in `contracts/openapi.yaml` for notes, timeline, profile picture
  - ✅ Existing endpoints verified: passport, proficiency, qualification, visa, tasks, notifications, reminders
  - ⚠️ Action required: Merge contracts into `frontend/dev/openapi-spec.yaml` before implementation
- [x] **UX**: Accessibility and compact UI requirements considered
  - ✅ Compact theme compliance (13px base font, reduced padding) - Documented in research.md
  - ✅ Keyboard navigation for all interactive elements - Planned in research.md
  - ✅ ARIA labels for timeline, notes, and form sections - Planned in research.md
  - ✅ Loading states for async operations - Planned in research.md
  - ✅ Error feedback for validation failures - Planned in research.md
- [x] **Performance**: Data volume and render optimization planned
  - ✅ **Lazy loading strategy**: Overview loads immediately, all other sections load on-demand (tabbed interface) - Defined in research.md
  - ✅ Pagination for timeline (25 items per page) - Defined in research.md
  - ✅ React.memo for list components - Planned in research.md
  - ✅ Zustand selectors to prevent unnecessary re-renders - Planned in research.md
  - ✅ Section data caching to avoid re-fetching - Planned in research.md
- [x] **Testing**: Test strategy defined (component, integration, RBAC)
  - ✅ Component tests for reusable components (Timeline, Notes, TaskList) - Defined in research.md
  - ✅ Integration tests for client detail page workflows - Defined in research.md
  - ✅ RBAC tests for permission-based UI elements - Defined in research.md
  - ✅ Contract tests for API integrations - Defined in research.md
- [x] **Code Quality**: TypeScript types and ESLint compliance planned
  - ✅ Types derived from OpenAPI spec - Planned in research.md
  - ✅ Strict TypeScript mode compliance - Enforced by project config
  - ✅ ESLint rules enforcement - Enforced by project config
  - ✅ Component documentation with JSDoc - Planned in research.md

**Status**: ✅ All checks passed. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── immigration/
│   ├── models/
│   │   ├── client.py          # Client model (exists)
│   │   ├── task.py            # Task model (exists, needs enhancement)
│   │   ├── notification.py    # Notification model (exists)
│   │   └── [new models]
│   │       ├── note.py        # Note model (NEW)
│   │       └── profile_picture.py  # ProfilePicture model (NEW)
│   ├── client/
│   │   ├── passport.py         # Passport model (exists)
│   │   ├── proficiency.py     # Proficiency model (exists)
│   │   └── qualification.py   # Qualification model (exists)
│   ├── reminder/
│   │   └── reminder.py        # Reminder model (exists, needs enhancement)
│   ├── api/v1/
│   │   ├── serializers/
│   │   │   ├── note.py        # Note serializer (NEW)
│   │   │   └── profile_picture.py  # ProfilePicture serializer (NEW)
│   │   └── views/
│   │       ├── notes.py       # Note views (NEW)
│   │       ├── timeline.py    # Timeline/activity views (NEW)
│   │       └── profile_picture.py  # ProfilePicture views (NEW)
│   └── services/
│       ├── notes.py           # Note service (NEW)
│       └── timeline.py        # Timeline service (NEW)

frontend/
├── src/
│   ├── components/
│   │   ├── clients/
│   │   │   ├── ClientDetailPage.tsx  # Main page (enhance existing - tabbed interface with lazy loading)
│   │   │   ├── ClientOverview.tsx     # Overview section (NEW - loads immediately)
│   │   │   ├── ClientTimeline.tsx     # Timeline section (NEW - lazy load)
│   │   │   ├── ClientNotes.tsx       # Notes section (NEW - lazy load)
│   │   │   ├── ClientPassport.tsx    # Passport section (NEW - lazy load)
│   │   │   ├── ClientProficiency.tsx # Language proficiency (NEW - lazy load)
│   │   │   ├── ClientQualifications.tsx  # Qualifications (NEW - lazy load)
│   │   │   ├── ClientVisaApplications.tsx  # Visa apps (NEW - lazy load)
│   │   │   ├── ClientCollegeApplications.tsx  # College apps (NEW - lazy load)
│   │   │   ├── ClientTasks.tsx       # Tasks section (NEW - lazy load)
│   │   │   ├── ClientReminders.tsx   # Reminders section (NEW - lazy load)
│   │   │   └── ProfilePictureUpload.tsx  # Profile picture (NEW)
│   │   ├── shared/
│   │   │   ├── Timeline/              # Reusable timeline (NEW)
│   │   │   ├── Notes/                # Reusable notes (NEW)
│   │   │   └── TaskList/             # Reusable task list (NEW)
│   │   └── layout/
│   ├── services/api/
│   │   ├── noteApi.ts         # Note API client (NEW)
│   │   ├── timelineApi.ts     # Timeline API client (NEW)
│   │   ├── profilePictureApi.ts  # Profile picture API (NEW)
│   │   └── reminderApi.ts     # Reminder API client (NEW)
│   └── store/
│       ├── noteStore.ts       # Note state (NEW)
│       ├── timelineStore.ts   # Timeline state (NEW)
│       └── clientDetailStore.ts  # Client detail state (NEW - tracks loaded sections for lazy loading)
└── dev/
    ├── openapi-spec.yaml      # OpenAPI spec reference
    └── tests/
        ├── integration/
        │   └── client-detail.test.ts  # Integration tests (NEW)
        └── rbac/
            └── client-detail-permissions.test.ts  # RBAC tests (NEW)
```

**Structure Decision**: Web application structure with separate frontend and backend. Frontend uses React/TypeScript with component-based architecture. Backend uses Django REST Framework. Reusable components (Timeline, Notes, TaskList) are placed in `shared/` directory for use across different entity types.

**Lazy Loading Architecture**: ClientDetailPage uses a tabbed interface (Material-UI Tabs). Overview section loads immediately with essential client data. All other sections (Timeline, Notes, Documents, Applications, Tasks, Reminders) load on-demand when user clicks the respective tab. Section data is cached in Zustand store (`clientDetailStore`) to avoid re-fetching when switching tabs.

## Complexity Tracking

> **No violations identified** - All constitution principles are satisfied with standard patterns and existing architecture.
