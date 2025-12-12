# Tasks: Enhanced Client Detail Page

**Input**: Design documents from `/specs/002-client-detail-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Feature Branch**: `002-client-detail-enhancement`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and OpenAPI spec updates

- [X] T001 Merge API contracts from `specs/002-client-detail-enhancement/contracts/openapi.yaml` into `frontend/dev/openapi-spec.yaml`
- [X] T002 [P] Update backend OpenAPI schema generation to include new endpoints in `backend/openapi-schema.yaml`
- [X] T003 [P] Create permissions for new models: `immigration.add_note`, `immigration.change_note`, `immigration.view_clientactivity` in `backend/immigration/management/commands/setup_role_permissions.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create Note model in `backend/immigration/models/note.py` with fields: client (ForeignKey), author (ForeignKey), content (TextField), created_at, updated_at
- [X] T005 Create ClientActivity model in `backend/immigration/models/client_activity.py` with fields: client (ForeignKey), activity_type (CharField), performed_by (ForeignKey), description (TextField), metadata (JSONField), created_at
- [X] T006 Create ProfilePicture model in `backend/immigration/models/profile_picture.py` with fields: client (OneToOneField), file (ImageField), file_size (IntegerField), file_type (CharField), uploaded_by (ForeignKey), created_at, updated_at
- [X] T007 Create database migrations for Note, ClientActivity, ProfilePicture models in `backend/immigration/migrations/`
- [X] T008 Run migrations: `python manage.py migrate` to create new tables
- [X] T009 [P] Create Note serializer in `backend/immigration/api/v1/serializers/note.py` with NoteCreateRequest, NoteUpdateRequest, NoteOutput serializers
- [X] T010 [P] Create ClientActivity serializer in `backend/immigration/api/v1/serializers/client_activity.py` with ClientActivityOutput serializer
- [X] T011 [P] Create ProfilePicture serializer in `backend/immigration/api/v1/serializers/profile_picture.py` with ProfilePictureOutput serializer
- [X] T012 Create note service in `backend/immigration/services/notes.py` with note_list, note_create, note_update, note_delete functions
- [X] T013 Create timeline service in `backend/immigration/services/timeline.py` with timeline_list function for ClientActivity queries

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Complete Client Overview (Priority: P1) 🎯 MVP

**Goal**: Display comprehensive client overview with essential information (name, photo placeholder, stage, assigned consultant, last activity) that loads immediately when client detail page opens.

**Independent Test**: Navigate to a client detail page and verify all summary information (personal details, contact info, stage, assigned consultant, key dates) is visible in the Overview tab.

### Implementation for User Story 1

- [X] T014 [US1] Create ClientOverview component in `frontend/src/components/clients/ClientOverview.tsx` to display client summary information
- [X] T015 [US1] Create clientDetailStore in `frontend/src/store/clientDetailStore.ts` with state for client data, loaded sections tracking, and loading states
- [X] T016 [US1] Update ClientDetailPage in `frontend/src/pages/Clients/ClientDetailPage.tsx` to implement tabbed interface using Material-UI Tabs component
- [X] T017 [US1] Implement Overview tab in ClientDetailPage that loads immediately on mount using existing `/api/v1/clients/{id}/` endpoint
- [X] T018 [US1] Add loading skeleton component for Overview section in `frontend/src/components/clients/ClientOverview.tsx`
- [X] T019 [US1] Add error handling for client data fetch failures in ClientDetailPage
- [X] T020 [US1] Display client name, stage badge, assigned consultant name, and last activity date in Overview section
- [X] T021 [US1] Add profile picture placeholder in Overview section (actual upload in US10)

**Checkpoint**: At this point, User Story 1 should be fully functional - Overview tab loads immediately with essential client information

---

## Phase 4: User Story 2 - Manage Client Notes (Priority: P1)

**Goal**: Allow users to add, view, edit, and delete notes on a client's profile with proper permission enforcement.

**Independent Test**: Create, read, update, and delete notes for a client. Verify notes display in reverse chronological order with author and timestamp.

### Implementation for User Story 2

- [X] T022 [US2] Create NoteViewSet in `backend/immigration/api/v1/views/notes.py` with list, create, retrieve, update, partial_update, destroy actions
- [X] T023 [US2] Add permission checks to NoteViewSet: `add_note` for create, `change_note` for update, `delete_note` for delete
- [X] T024 [US2] Register NoteViewSet route in `backend/immigration/api/v1/routers.py` as `router.register(r'notes', NoteViewSet, basename='note')`
- [X] T025 [US2] Create noteApi client in `frontend/src/services/api/noteApi.ts` with functions: listNotes, getNote, createNote, updateNote, deleteNote
- [X] T026 [US2] Create noteStore in `frontend/src/store/noteStore.ts` with state for notes list, loading, error, and actions for CRUD operations
- [X] T027 [US2] Create shared Notes component in `frontend/src/components/shared/Notes/Notes.tsx` with Notes.tsx, NoteItem.tsx, NoteForm.tsx, types.ts
- [X] T028 [US2] Create ClientNotes component in `frontend/src/components/clients/ClientNotes.tsx` that uses shared Notes component
- [X] T029 [US2] Add Notes tab to ClientDetailPage with lazy loading - fetch notes only when tab is clicked
- [X] T030 [US2] Implement note creation form in ClientNotes with validation (max 10,000 characters)
- [X] T031 [US2] Display notes in reverse chronological order (newest first) with author name and timestamp
- [X] T032 [US2] Add delete confirmation dialog for note deletion in ClientNotes
- [X] T033 [US2] Implement permission-based UI: hide delete button if user lacks `delete_note` permission using `usePermission` hook

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - Overview and Notes tabs functional

---

## Phase 5: User Story 3 - View Client Timeline (Priority: P2)

**Goal**: Display chronological timeline of all client activities with pagination support.

**Independent Test**: Perform various actions on a client and verify they appear in the timeline with correct timestamps and details.

### Implementation for User Story 3

- [X] T035 [US3] Create timeline custom action on ClientViewSet in `backend/immigration/api/v1/views/clients.py` for `/api/v1/clients/{id}/timeline/` endpoint
- [X] T036 [US3] Implement timeline_list function in timeline service with pagination (25 items per page) and activity_type filtering
- [X] T037 [US3] Create timelineApi client in `frontend/src/services/api/timelineApi.ts` with getTimeline function
- [X] T038 [US3] Create timelineStore in `frontend/src/store/timelineStore.ts` with state for timeline activities, pagination, loading
- [X] T039 [US3] Create shared Timeline component in `frontend/src/components/shared/Timeline/Timeline.tsx` with Timeline.tsx, TimelineItem.tsx, TimelineFilters.tsx, types.ts
- [X] T040 [US3] Create ClientTimeline component in `frontend/src/components/clients/ClientTimeline.tsx` that uses shared Timeline component
- [X] T041 [US3] Add Timeline tab to ClientDetailPage with lazy loading - fetch timeline only when tab is clicked
- [X] T042 [US3] Implement pagination controls in ClientTimeline (25 items per page)
- [X] T043 [US3] Display activities in chronological order (newest first) with activity type indicators and performer information
- [X] T044 [US3] Add activity type filter dropdown in Timeline component (optional enhancement)

**Checkpoint**: Timeline tab functional with pagination and activity display

---

## Phase 6: User Story 4 - View and Manage Passport Details (Priority: P2)

**Goal**: Display and update client passport information with expiry warning indicator.

**Independent Test**: View/edit passport details for a client. Verify expiry warning appears when passport expires within 6 months.

### Implementation for User Story 4

- [X] T045 [US4] Create ClientPassport component in `frontend/src/components/clients/ClientPassport.tsx` to display passport information
- [X] T046 [US4] Use existing passport API endpoint `/api/v1/passports/` to fetch passport data for client
- [X] T047 [US4] Add Passport section to Documents tab in ClientDetailPage with lazy loading
- [X] T048 [US4] Display passport number, country, nationality, issue date, and expiry date in ClientPassport
- [X] T049 [US4] Implement expiry warning indicator (visual warning) when passport expires within 6 months
- [X] T050 [US4] Add "Add Passport" option when no passport exists for client
- [X] T051 [US4] Create ClientActivity record when passport is updated via signals

**Checkpoint**: Passport section functional in Documents tab

---

## Phase 7: User Story 5 - View and Manage Language Proficiency (Priority: P2)

**Goal**: Display and manage client language test scores with CRUD operations.

**Independent Test**: Add/view/edit language test results. Verify results sorted by test date with most recent first.

### Implementation for User Story 5

- [X] T052 [US5] Create ClientProficiency component in `frontend/src/components/clients/ClientProficiency.tsx` to display language proficiency
- [X] T053 [US5] Use existing proficiency API endpoint `/api/v1/proficiencies/?client={id}` to fetch proficiency data
- [X] T054 [US5] Add Proficiency section to Documents tab in ClientDetailPage with lazy loading
- [X] T055 [US5] Display test name, overall score, and component scores (reading, writing, speaking, listening) in ClientProficiency
- [X] T056 [US5] Implement "Add Test Result" form in ClientProficiency
- [X] T057 [US5] Sort proficiency results by test date with most recent first
- [X] T058 [US5] Create ClientActivity record when proficiency is added via signals

**Checkpoint**: Language Proficiency section functional in Documents tab

---

## Phase 8: User Story 6 - View and Manage Qualifications (Priority: P2)

**Goal**: Display and manage client educational qualifications with CRUD operations.

**Independent Test**: Add/view/edit qualifications. Verify "In Progress" status displays correctly for incomplete qualifications.

### Implementation for User Story 6

- [X] T059 [US6] Create ClientQualifications component in `frontend/src/components/clients/ClientQualifications.tsx` to display qualifications
- [X] T060 [US6] Use existing qualification API endpoint `/api/v1/qualifications/?client={id}` to fetch qualification data
- [X] T061 [US6] Add Qualifications section to Documents tab in ClientDetailPage with lazy loading
- [X] T062 [US6] Display institution, degree, field of study, start date, and completion date in ClientQualifications
- [X] T063 [US6] Implement "In Progress" status display when completion_date is null
- [X] T064 [US6] Implement "Add Qualification" form in ClientQualifications
- [X] T065 [US6] Create ClientActivity record when qualification is added via signals

**Checkpoint**: Qualifications section functional in Documents tab

---

## Phase 9: User Story 7 - Manage Visa Applications from Client Detail (Priority: P2)

**Goal**: View and manage all visa applications for a client from their detail page.

**Independent Test**: Create/view/edit visa applications from client detail page. Verify applications list with visa type, status, and key dates.

### Implementation for User Story 7

- [X] T066 [US7] Create ClientVisaApplications component in `frontend/src/components/clients/ClientVisaApplications.tsx` to display visa applications
- [X] T067 [US7] Use existing visa application API endpoint `/api/v1/visa-applications/?client={id}` to fetch visa data
- [X] T068 [US7] Add Visa Applications section to Applications tab in ClientDetailPage with lazy loading
- [X] T069 [US7] Display all visa applications with visa type, status, and key dates in ClientVisaApplications
- [X] T070 [US7] Implement "New Visa Application" button and form in ClientVisaApplications
- [X] T071 [US7] Link visa application detail view to shared component (same as main Visa Application section)
- [X] T072 [US7] Ensure visa application status updates reflect immediately in ClientVisaApplications
- [X] T073 [US7] Create ClientActivity record when visa application is created via signals

**Checkpoint**: Visa Applications section functional in Applications tab

---

## Phase 10: User Story 8 - Manage College/Institute Applications from Client Detail (Priority: P2)

**Goal**: View and manage all college/institute applications for a client from their detail page.

**Independent Test**: Create/view/edit college applications from client detail page. Verify applications list with institute, course, status, and intake date.

### Implementation for User Story 8

- [X] T074 [US8] Create ClientCollegeApplications component in `frontend/src/components/clients/ClientCollegeApplications.tsx` to display college applications
- [X] T075 [US8] Use existing application API endpoint `/api/v1/applications/?client={id}` to fetch application data
- [X] T076 [US8] Add College Applications section to Applications tab in ClientDetailPage with lazy loading
- [X] T077 [US8] Display all college applications with institute, course, status, and intake date in ClientCollegeApplications
- [X] T078 [US8] Implement "New Application" button and form in ClientCollegeApplications
- [X] T079 [US8] Display visual indication when application stage changes
- [X] T080 [US8] Create ClientActivity record when college application is created via signals

**Checkpoint**: College Applications section functional in Applications tab

---

## Phase 11: User Story 9 - View Client-Linked Tasks (Priority: P2)

**Goal**: Display all tasks associated with a client with status grouping and filtering.

**Independent Test**: Create tasks linked to a client and verify they appear on the client detail page with title, status, priority, due date, and assignee.

### Implementation for User Story 9

- [X] T081 [US9] Create shared TaskList component in `frontend/src/components/shared/TaskList/TaskList.tsx` with TaskList.tsx, TaskItem.tsx, TaskFilters.tsx, types.ts
- [X] T082 [US9] Create ClientTasks component in `frontend/src/components/clients/ClientTasks.tsx` that uses shared TaskList component
- [X] T083 [US9] Use existing task API endpoint `/api/v1/tasks/?client={id}` to fetch task data
- [X] T084 [US9] Add Tasks tab to ClientDetailPage with lazy loading - fetch tasks only when tab is clicked
- [X] T085 [US9] Display tasks with title, status, priority, due date, and assignee in ClientTasks
- [X] T086 [US9] Implement task status grouping/filtering (pending, in progress, completed) in TaskList component
- [X] T087 [US9] Add click handler to open task detail view when task is clicked
- [X] T088 [US9] Create ClientActivity record when task is created/completed via signals

**Checkpoint**: Tasks tab functional with task display and filtering

---

## Phase 12: User Story 10 - Upload and View Client Profile Picture (Priority: P3)

**Goal**: Upload and display client profile pictures with file validation.

**Independent Test**: Upload an image and verify it displays on the client profile. Verify error handling for invalid file types and sizes.

### Implementation for User Story 10

- [X] T089 [US10] Create ProfilePictureViewSet custom actions in `backend/immigration/api/v1/views/profile_picture.py` for `/api/v1/clients/{id}/profile-picture/` endpoint
- [X] T090 [US10] Implement file validation in ProfilePictureViewSet: JPEG, PNG, WebP only, max 5MB
- [X] T091 [US10] Add profile picture retrieve, upload, and delete actions to ClientViewSet or create separate viewset
- [X] T092 [US10] Create profilePictureApi client in `frontend/src/services/api/profilePictureApi.ts` with getProfilePicture, uploadProfilePicture, deleteProfilePicture functions
- [X] T093 [US10] Create ProfilePictureUpload component in `frontend/src/components/clients/ProfilePictureUpload.tsx` with file upload UI
- [X] T094 [US10] Integrate ProfilePictureUpload into ClientOverview component to display and upload profile picture
- [X] T095 [US10] Display profile picture in Overview section when available, show placeholder when not
- [X] T096 [US10] Implement file size validation error message (max 5MB) in ProfilePictureUpload
- [X] T097 [US10] Implement file type validation error message (JPEG, PNG, WebP only) in ProfilePictureUpload
- [X] T098 [US10] Create ClientActivity record when profile picture is uploaded via signals

**Checkpoint**: Profile picture upload and display functional in Overview section

---

## Phase 13: User Story 11 - Manage Reminders for Client (Priority: P3)

**Goal**: Set reminders for specific clients with notification integration.

**Independent Test**: Create a reminder and verify notification is received at the specified time.

### Implementation for User Story 11

- [ ] T099 [US11] Enhance Reminder model in `backend/immigration/reminder/reminder.py` with reminder_time (TimeField) and notification_created (BooleanField) fields
- [ ] T100 [US11] Create migration for Reminder model enhancements in `backend/immigration/migrations/`
- [ ] T101 [US11] Create reminderApi client in `frontend/src/services/api/reminderApi.ts` with listReminders, createReminder, updateReminder, deleteReminder functions
- [ ] T102 [US11] Create ClientReminders component in `frontend/src/components/clients/ClientReminders.tsx` to display and manage reminders
- [ ] T103 [US11] Use existing reminder API endpoint `/api/v1/reminders/?content_type=client&object_id={id}` to fetch reminder data
- [ ] T104 [US11] Add Reminders tab to ClientDetailPage with lazy loading - fetch reminders only when tab is clicked
- [ ] T105 [US11] Implement "Add Reminder" form in ClientReminders with date, time, and message fields
- [ ] T106 [US11] Display upcoming and past reminders in ClientReminders with visual distinction
- [ ] T107 [US11] Create reminder notification service in `backend/immigration/services/reminders.py` to create notifications when reminder date/time arrives
- [ ] T108 [US11] Create scheduled task/celery job to process reminders and create notifications (or use Django management command)

**Checkpoint**: Reminders tab functional with reminder creation and notification integration

---

## Phase 14: User Story 12 - Enhanced Task Management (Priority: P3)

**Goal**: Extend Task model to support generic entity linking and assignment tracking.

**Independent Test**: Create tasks linked to different entities and verify assignment/status features work.

### Implementation for User Story 12

- [ ] T109 [US12] Enhance Task model in `backend/immigration/models/task.py` with assigned_by (ForeignKey), content_type (ForeignKey), object_id (PositiveIntegerField), linked_entity (GenericForeignKey)
- [ ] T110 [US12] Create migration for Task model enhancements (nullable initially) in `backend/immigration/migrations/`
- [ ] T111 [US12] Migrate existing Task.client_id data to generic FK (content_type, object_id) in migration or data migration
- [ ] T112 [US12] Update Task serializer in `backend/immigration/api/v1/serializers/task.py` to include assigned_by and linked_entity fields
- [ ] T113 [US12] Update TaskViewSet in `backend/immigration/api/v1/views/tasks.py` to support generic entity linking in create/update
- [ ] T114 [US12] Update task creation UI to allow selecting entity type (client, visa application, college application) in TaskList component
- [ ] T115 [US12] Display assigned_by and assigned_to information in TaskItem component
- [ ] T116 [US12] Create ClientActivity record when task status changes via signals

**Checkpoint**: Enhanced task management with generic entity linking functional

---

## Phase 15: User Story 13 - Unified Notification System (Priority: P3)

**Goal**: Extend notification system to handle various event types with proper notification creation.

**Independent Test**: Trigger various events and verify appropriate notifications are created.

### Implementation for User Story 13

- [ ] T117 [US13] Add new notification types to Notification model choices in `backend/immigration/models/notification.py`: NOTE_ADDED, PROFILE_PICTURE_UPLOADED, REMINDER_DUE
- [ ] T118 [US13] Create migration for new notification types in `backend/immigration/migrations/`
- [ ] T119 [US13] Update notification service in `backend/immigration/services/notifications.py` to create notifications for task assignments
- [ ] T120 [US13] Update notification service to create notifications for client assignments
- [ ] T121 [US13] Create signals in `backend/immigration/signals/listener.py` to trigger notifications when:
  - Task is assigned (TASK_ASSIGNED notification)
  - Client is assigned (CLIENT_ASSIGNED notification)
  - Note is added (NOTE_ADDED notification)
  - Profile picture is uploaded (PROFILE_PICTURE_UPLOADED notification)
  - Reminder date arrives (REMINDER_DUE notification)
- [ ] T122 [US13] Verify existing bulk mark as read functionality works with new notification types

**Checkpoint**: Unified notification system functional with all event types

---

## Phase 16: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T123 [P] Add React.memo to list components (Timeline, Notes, TaskList) for performance optimization
- [ ] T124 [P] Implement Zustand selectors in all stores to prevent unnecessary re-renders
- [ ] T125 [P] Add JSDoc documentation to all reusable components (Timeline, Notes, TaskList)
- [ ] T126 [P] Add keyboard navigation support to all interactive elements in client detail sections
- [ ] T127 [P] Add ARIA labels to timeline, notes, and form sections for accessibility
- [ ] T128 [P] Verify compact UI theme compliance (13px base font, reduced padding) across all components
- [ ] T129 [P] Add error boundaries for each tab section in ClientDetailPage
- [ ] T130 [P] Implement section data caching in clientDetailStore to avoid re-fetching when switching tabs
- [ ] T131 [P] Add loading skeleton components for all lazy-loaded sections
- [ ] T132 [P] Run ESLint and fix all warnings in frontend code
- [ ] T133 [P] Run TypeScript strict mode checks and fix all type errors
- [ ] T134 [P] Update OpenAPI spec in `frontend/dev/openapi-spec.yaml` with all new endpoints
- [ ] T135 [P] Create integration tests for client detail page workflows in `frontend/dev/tests/integration/client-detail.test.ts`
- [ ] T136 [P] Create RBAC tests for permission-based UI elements in `frontend/dev/tests/rbac/client-detail-permissions.test.ts`
- [ ] T137 [P] Add unit tests for reusable components (Timeline, Notes, TaskList) in `frontend/dev/tests/`
- [ ] T138 [P] Verify lazy loading performance: Overview loads < 1.5s, sections load < 2s when clicked
- [ ] T139 [P] Documentation: Update README with client detail page features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-15)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3)
  - P1 stories (US1, US2) should complete before P2 stories
  - P2 stories can proceed in parallel after P1 completion
  - P3 stories can proceed in parallel after P2 completion
- **Polish (Phase 16)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Requires Note model from Foundational
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Requires ClientActivity model from Foundational, benefits from US2 (notes create activities)
- **User Story 4-6 (P2)**: Can start after Foundational (Phase 2) - Use existing APIs, independent
- **User Story 7-8 (P2)**: Can start after Foundational (Phase 2) - Use existing APIs, independent
- **User Story 9 (P2)**: Can start after Foundational (Phase 2) - Uses existing Task API, independent
- **User Story 10 (P3)**: Can start after Foundational (Phase 2) - Requires ProfilePicture model from Foundational
- **User Story 11 (P3)**: Can start after Foundational (Phase 2) - Uses existing Reminder API, independent
- **User Story 12 (P3)**: Can start after Foundational (Phase 2) - Enhances existing Task model
- **User Story 13 (P3)**: Can start after Foundational (Phase 2) - Enhances existing Notification model, benefits from other stories

### Within Each User Story

- Backend models/serializers before views
- Backend views before frontend API clients
- Frontend API clients before stores
- Stores before components
- Shared components before client-specific components
- Components before integration into ClientDetailPage

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, P1 stories (US1, US2) can start
- After P1 completion, all P2 stories (US3-US9) can run in parallel
- After P2 completion, all P3 stories (US10-US13) can run in parallel
- All tasks marked [P] within a user story can run in parallel
- Different user stories can be worked on in parallel by different team members (after dependencies met)

---

## Parallel Example: User Story 2

```bash
# Launch all backend tasks for User Story 2 in parallel:
Task: "Create NoteViewSet in backend/immigration/api/v1/views/notes.py"
Task: "Create noteApi client in frontend/src/services/api/noteApi.ts"
Task: "Create noteStore in frontend/src/store/noteStore.ts"
Task: "Create shared Notes component in frontend/src/components/shared/Notes/Notes.tsx"

# Then integrate:
Task: "Create ClientNotes component in frontend/src/components/clients/ClientNotes.tsx"
Task: "Add Notes tab to ClientDetailPage with lazy loading"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Overview)
4. Complete Phase 4: User Story 2 (Notes)
5. **STOP and VALIDATE**: Test User Stories 1 & 2 independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Overview MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Notes MVP!)
4. Add P2 stories (US3-US9) → Test independently → Deploy/Demo
5. Add P3 stories (US10-US13) → Test independently → Deploy/Demo
6. Polish phase → Final deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Overview)
   - Developer B: User Story 2 (Notes)
3. After P1 completion:
   - Developer A: User Story 3 (Timeline)
   - Developer B: User Story 4 (Passport)
   - Developer C: User Story 5 (Proficiency)
   - Developer D: User Story 6 (Qualifications)
4. Continue with remaining P2 and P3 stories in parallel
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Lazy loading: Only Overview loads immediately, all other sections load on-demand
- Tabbed interface: Use Material-UI Tabs for section organization
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Performance: Overview < 1.5s load, sections < 2s when clicked
- RBAC: Use `usePermission` hook for frontend permission checks

---

## Summary

- **Total Tasks**: 139
- **Tasks per User Story**:
  - US1 (Overview): 8 tasks
  - US2 (Notes): 13 tasks
  - US3 (Timeline): 10 tasks
  - US4 (Passport): 7 tasks
  - US5 (Proficiency): 7 tasks
  - US6 (Qualifications): 7 tasks
  - US7 (Visa Apps): 8 tasks
  - US8 (College Apps): 7 tasks
  - US9 (Tasks): 8 tasks
  - US10 (Profile Picture): 10 tasks
  - US11 (Reminders): 10 tasks
  - US12 (Enhanced Tasks): 8 tasks
  - US13 (Notifications): 6 tasks
  - Setup: 3 tasks
  - Foundational: 10 tasks
  - Polish: 17 tasks

- **Parallel Opportunities**: Many tasks marked [P] can run in parallel
- **Independent Test Criteria**: Each user story has clear test criteria
- **Suggested MVP Scope**: User Stories 1 & 2 (Overview + Notes)
- **Format Validation**: ✅ All tasks follow checklist format with checkbox, ID, labels, and file paths
