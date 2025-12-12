# Tasks: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`
**Input**: Design documents from `/specs/001-client-auth-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md

**Tests**: OPTIONAL - not explicitly requested in spec. Test tasks included for critical flows only.

**Organization**: Tasks grouped by user story priority (P1 → P2 → P3) for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (US1-US9)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and project structure for the feature

- [x] T001 [P] Add axios dependency: `npm install axios`
- [x] T002 [P] Add msw dev dependency: `npm install -D msw`
- [x] T003 [P] Create directory structure: `src/services/api/`, `src/types/`, `src/components/clients/`, `dev/mock-server/handlers/`, `dev/mock-server/data/`
- [x] T004 [P] Create `src/types/client.ts` with Client, ClientStage, Gender types from data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: HTTP client with token refresh and auth store updates - MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `src/services/api/httpClient.ts` - Axios instance with:
  - Base URL configuration
  - Request interceptor to add Authorization header from authStore
  - Response interceptor for 401 handling with token refresh
  - Error transformation to consistent format
- [x] T006 Create `src/services/api/authApi.ts` - Auth API service with:
  - `login(username, password)` → POST /api/token/
  - `refreshToken(refresh)` → POST /api/token/refresh/
  - `getPermissions()` → GET /api/v1/users/me/permissions/
- [x] T007 Update `src/auth/types.ts` - Add AuthTokens, UserPermission, PermissionsResponse interfaces from data-model.md
- [x] T008 Update `src/store/authStore.ts` - Add:
  - `tokens: AuthTokens | null` state
  - `setTokens()` action
  - `refreshToken()` action using authApi
  - Update `login()` to call authApi and fetch permissions
  - Update `logout()` to clear tokens and permissions

**Checkpoint**: HTTP client and auth infrastructure ready - user story implementation can begin

---

## Phase 3: User Story 9 - Mock Server for Development (Priority: P3 but FOUNDATIONAL)

**Goal**: Enable frontend development without backend - IMPLEMENTED FIRST despite P3 priority

**Independent Test**: Run `npm run dev`, make API requests, verify mock responses

**Note**: This is P3 in spec but must be implemented early to enable development of all other stories

### Implementation for User Story 9

- [x] T009 [P] [US9] Create `dev/mock-server/data/mockData.ts` with:
  - Mock users with different roles (SUPER_ADMIN, CONSULTANT, etc.)
  - 15-20 mock clients across all stages (LE, FU, CT, CL)
  - Mock permissions arrays for each role
  - Mock JWT-like token strings
- [x] T010 [P] [US9] Create `dev/mock-server/handlers/auth.ts` with MSW handlers for:
  - POST /api/token/ - Return mock tokens on valid credentials
  - POST /api/token/refresh/ - Return new mock tokens
  - GET /api/v1/users/me/permissions/ - Return permissions based on mock user
- [x] T011 [P] [US9] Create `dev/mock-server/handlers/clients.ts` with MSW handlers for:
  - GET /api/v1/clients/ - Paginated list with filtering
  - POST /api/v1/clients/ - Create client, return with ID
  - GET /api/v1/clients/:id/ - Single client
  - PATCH /api/v1/clients/:id/ - Update client (including stage)
  - DELETE /api/v1/clients/:id/ - Soft delete (204 response)
- [x] T012 [US9] Create `dev/mock-server/index.ts` - MSW browser setup:
  - Import all handlers
  - Export `worker` instance
  - Export `startMockServer()` function
- [x] T013 [US9] Update `src/main.tsx` - Conditionally start mock server in development:
  - Import startMockServer
  - Call before React render in dev mode only

**Checkpoint**: Mock server responds to all endpoints - remaining stories can be developed

---

## Phase 4: User Story 1 - User Login and Permission Loading (Priority: P1) 🎯 MVP

**Goal**: Users can log in and have permissions loaded for RBAC throughout session

**Independent Test**: Enter valid credentials, verify dashboard access, check permissions control UI elements

### Implementation for User Story 1

- [x] T014 [US1] Update `src/pages/Login/LoginPage.tsx`:
  - Connect form to authStore.login()
  - Show loading state during login
  - Display error message on invalid credentials (without security details)
  - Redirect to dashboard on success
- [x] T015 [US1] Update httpClient.ts response interceptor:
  - On 401, attempt token refresh via authStore.refreshToken()
  - Retry original request with new token
  - On refresh failure, call logout() and redirect to /login
- [x] T016 [US1] Verify permission-based UI in `src/components/layout/Sidebar.tsx`:
  - Navigation items show/hide based on permissions
  - Use existing usePermission hook

**Checkpoint**: Login flow complete - users authenticated with permissions loaded

---

## Phase 5: User Story 2 - User Logout with Permission Flush (Priority: P1)

**Goal**: Secure logout clears all session data and forces fresh permission fetch on re-login

**Independent Test**: Logout, verify protected routes redirect to login, re-login fetches fresh permissions

### Implementation for User Story 2

- [x] T017 [US2] Update `src/components/layout/AppBar.tsx`:
  - Add Logout button/icon
  - Connect to authStore.logout()
  - Show confirmation or immediate logout based on UX preference
- [x] T018 [US2] Update `src/store/authStore.ts` logout():
  - Clear tokens from state
  - Clear tokens from localStorage
  - Clear permissions array
  - Clear user data
  - Navigate to /login
- [x] T019 [US2] Verify protected route redirect in existing ProtectedRoute or App.tsx:
  - Unauthenticated users redirected to /login
  - After logout, protected routes inaccessible

**Checkpoint**: Complete auth cycle - login/logout with permission management working

---

## Phase 6: User Story 3 - View All Clients List (Priority: P2)

**Goal**: Display paginated client list with action buttons for users with view permission

**Independent Test**: Navigate to Clients tab, verify list displays with pagination and 4 action icons per row

### Implementation for User Story 3

- [x] T020 [US3] Create `src/services/api/clientApi.ts` with:
  - `list(params?: ClientListParams)` → GET /api/v1/clients/
  - `getById(id: number)` → GET /api/v1/clients/:id/
  - `create(data: ClientCreateRequest)` → POST /api/v1/clients/
  - `update(id: number, data: ClientUpdateRequest)` → PATCH /api/v1/clients/:id/
  - `delete(id: number)` → DELETE /api/v1/clients/:id/
- [x] T021 [US3] Create `src/store/clientStore.ts` with Zustand:
  - `clients: Client[]` state
  - `loading: boolean` state
  - `pagination: { count, page, pageSize }` state
  - `fetchClients(params)` action
  - `addClient(client)` action
  - `updateClient(id, data)` action
  - `deleteClient(id)` action
- [x] T022 [P] [US3] Create `src/components/clients/ClientActions.tsx`:
  - Edit icon button (pencil)
  - Delete icon button (trash)
  - View icon button (eye)
  - Move icon button (arrow-right or forward)
  - Each button with tooltip
  - Props: client, onEdit, onDelete, onView, onMove
  - Disable Move for CL stage clients
- [x] T023 [US3] Create `src/components/clients/ClientTable.tsx`:
  - MUI Table with columns: Name, Email, Phone, Stage, Country, Actions
  - Use ClientActions component in actions column
  - TablePagination component
  - Stage displayed as chip with color coding
  - Connect to clientStore for data
- [x] T024 [US3] Update `src/pages/Clients/ClientsPage.tsx`:
  - Rename "Active" tab to "All Clients" (FR-010)
  - Integrate ClientTable component
  - Fetch clients on mount via clientStore.fetchClients()
  - Handle pagination changes

**Checkpoint**: Client list displays with all action buttons - ready for CRUD operations

---

## Phase 7: User Story 4 - Add New Client (Priority: P2)

**Goal**: Users can create new clients via form with validation, defaults to Lead stage

**Independent Test**: Click Add Client, fill form, submit, verify client appears in list

### Implementation for User Story 4

- [x] T025 [P] [US4] Create `src/components/clients/ClientForm.tsx`:
  - Form fields matching ClientCreateRequest/ClientUpdateRequest
  - Required fields: first_name, gender, country (with validation)
  - Optional fields: middle_name, last_name, email, phone_number, dob, address fields, description
  - Stage selector (defaulting to LE for new clients)
  - Country dropdown with ISO codes
  - Gender radio/select (MALE, FEMALE, OTHER)
  - Save and Cancel buttons
  - Props: mode ('add' | 'edit'), initialData?, onSave, onCancel
- [x] T026 [US4] Update `src/pages/Clients/ClientsPage.tsx`:
  - Add "Add Client" button (visible with create_client permission)
  - Open ClientForm in Dialog on click
  - On form save: call clientStore.addClient() → close dialog → show success snackbar
  - On validation error: display field errors
  - Refresh list after successful add

**Checkpoint**: Add Client complete - new clients can be created with Lead stage default

---

## Phase 8: User Story 5 - Edit Client Details (Priority: P2)

**Goal**: Users can edit existing client information via pre-filled form

**Independent Test**: Click Edit on client row, modify fields, save, verify changes persist

### Implementation for User Story 5

- [x] T027 [US5] Update `src/pages/Clients/ClientsPage.tsx`:
  - Handle Edit action from ClientActions
  - Open ClientForm in Dialog with mode='edit' and initialData
  - On form save: call clientStore.updateClient() → close dialog → show success snackbar
  - Handle cancel: close dialog without changes

**Checkpoint**: Edit Client complete - existing client data can be modified

---

## Phase 9: User Story 6 - Delete Client (Priority: P2)

**Goal**: Users can delete clients with confirmation dialog preventing accidental deletions

**Independent Test**: Click Delete, confirm in dialog, verify client removed from list

### Implementation for User Story 6

- [x] T028 [P] [US6] Create `src/components/clients/DeleteConfirmDialog.tsx`:
  - MUI Dialog with warning message
  - Display client name being deleted
  - Confirm and Cancel buttons
  - Props: open, client, onConfirm, onCancel
- [x] T029 [US6] Update `src/pages/Clients/ClientsPage.tsx`:
  - Handle Delete action from ClientActions
  - Open DeleteConfirmDialog
  - On confirm: call clientStore.deleteClient() → close dialog → show success snackbar
  - On cancel: close dialog
  - Remove client from local list on success

**Checkpoint**: Delete Client complete with confirmation - CRUD operations all functional

---

## Phase 10: User Story 7 - View Client Full Details (Priority: P3)

**Goal**: Dedicated read-only page showing all client information

**Independent Test**: Click View on client row, verify full-page detail view displays all fields

### Implementation for User Story 7

- [x] T030 [US7] Create `src/pages/Clients/ClientDetailPage.tsx`:
  - Route: /clients/:id
  - Fetch client by ID on mount via clientApi.getById()
  - Display all client fields in read-only format
  - Stage displayed with label and color
  - Back button to return to /clients
  - Loading and error states
- [x] T031 [US7] Update routing in `src/App.tsx`:
  - Add route: /clients/:id → ClientDetailPage
- [x] T032 [US7] Update ClientActions View button:
  - Navigate to /clients/:id on click

**Checkpoint**: View Client detail page complete - full client information accessible

---

## Phase 11: User Story 8 - Move Client Through State Workflow (Priority: P3)

**Goal**: Linear stage progression Lead → Follow Up → Client → Close with UI feedback

**Independent Test**: Click Move on Lead client, verify stage changes to Follow Up, repeat through workflow

### Implementation for User Story 8

- [x] T033 [P] [US8] Create `src/components/clients/MoveStageDialog.tsx`:
  - MUI Dialog showing current stage and next stage
  - Display stage labels (Lead → Follow Up, etc.)
  - Confirm and Cancel buttons
  - Props: open, client, onConfirm, onCancel
- [x] T034 [US8] Add `moveToNextStage(id)` to `src/store/clientStore.ts`:
  - Calculate next stage using NEXT_STAGE map from types
  - Call clientApi.update(id, { stage: nextStage })
  - Update local client state on success
- [x] T035 [US8] Update `src/pages/Clients/ClientsPage.tsx`:
  - Handle Move action from ClientActions
  - Open MoveStageDialog
  - On confirm: call clientStore.moveToNextStage() → close dialog → show success snackbar
  - Verify Move button disabled/hidden for CL stage (already handled in ClientActions)

**Checkpoint**: Stage workflow complete - clients can progress through all stages

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, and final verification

- [x] T036 [P] Add network error handling in httpClient.ts:
  - Connection lost → show retry option
  - Timeout handling
- [x] T037 [P] Add loading states to all async operations:
  - Login form submit button
  - Client list loading skeleton
  - CRUD operation buttons
- [x] T038 Add session expired handling:
  - On refresh token failure → redirect to login with "Session expired" message
- [x] T039 [P] Update navigation.config.ts if needed:
  - Ensure Clients navigation uses correct permissions
- [x] T040 Run quickstart.md validation:
  - Follow quickstart steps from scratch
  - Verify all functionality works

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phase 3 (US9 Mock Server) ← Enables development of all other stories
    ↓
┌───────────────────────────────────────────────────────┐
│ Phase 4-11 (User Stories) - Can run in priority order │
│                                                       │
│ P1: Phase 4 (US1 Login) → Phase 5 (US2 Logout)        │
│       ↓                                               │
│ P2: Phase 6 (US3 List) → Phase 7 (US4 Add) →          │
│     Phase 8 (US5 Edit) → Phase 9 (US6 Delete)         │
│       ↓                                               │
│ P3: Phase 10 (US7 View) → Phase 11 (US8 Move)         │
└───────────────────────────────────────────────────────┘
    ↓
Phase 12 (Polish)
```

### Parallel Opportunities

**Setup (Phase 1)**: All T001-T004 can run in parallel

**User Story 9 (Phase 3)**: T009, T010, T011 can run in parallel (different files)

**User Story 3 (Phase 6)**: T022 (ClientActions) can run parallel to T020-T021

**User Story 4 (Phase 7)**: T025 (ClientForm) can start while Phase 6 completes

**User Story 6 (Phase 9)**: T028 (DeleteConfirmDialog) can run parallel to T027

**User Story 8 (Phase 11)**: T033 (MoveStageDialog) can run parallel to T034

---

## Summary

| Phase | User Story | Priority | Tasks | Parallel Tasks |
|-------|-----------|----------|-------|----------------|
| 1 | Setup | - | T001-T004 | 4 |
| 2 | Foundational | - | T005-T008 | 0 |
| 3 | US9: Mock Server | P3* | T009-T013 | 3 |
| 4 | US1: Login | P1 | T014-T016 | 0 |
| 5 | US2: Logout | P1 | T017-T019 | 0 |
| 6 | US3: View List | P2 | T020-T024 | 1 |
| 7 | US4: Add Client | P2 | T025-T026 | 1 |
| 8 | US5: Edit Client | P2 | T027 | 0 |
| 9 | US6: Delete Client | P2 | T028-T029 | 1 |
| 10 | US7: View Details | P3 | T030-T032 | 0 |
| 11 | US8: Move Stage | P3 | T033-T035 | 1 |
| 12 | Polish | - | T036-T040 | 3 |

**Total Tasks**: 40
**Total Parallel Opportunities**: 14 tasks can run in parallel within their phases

*US9 is P3 in spec but implemented early as development infrastructure
