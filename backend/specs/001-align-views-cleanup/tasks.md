# Tasks: Align Views & Cleanup

**Input**: Design documents from `/specs/001-align-views-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Tests**: Regression smoke tests and static analysis validation are included as verification tasks (not comprehensive TDD test suites).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Django project root: repository root with `immigration/` app
- Settings: `leopard/settings.py`
- Views: `immigration/api/v1/views/`
- Serializers: `immigration/api/v1/serializers/`
- Constants: `immigration/constants.py`
- Tests location: per repo guidance (`src` subdirectory if present)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Validate project state and prepare for refactor

- [X] T001 Verify project structure matches plan.md (immigration/, leopard/, deployment/ exist)
- [X] T002 [P] Validate dependencies installed (Django 4.2.6, DRF, pytest, ruff)
- [X] T003 [P] Run existing linter to confirm baseline in immigration/ and leopard/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish baseline for backward compatibility and safety during refactor

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create regression baseline by documenting current task endpoints behavior (GET/POST /api/v1/tasks/)
- [X] T005 [P] Create regression baseline by documenting current notification endpoints behavior (GET/POST /api/v1/notifications/)
- [X] T006 [P] Analyze existing client/branch/visa view pattern to use as reference for centralized schemas
- [X] T007 Run static analysis to identify current unused imports and dead code branches in immigration/

**Checkpoint**: ✅ Baseline established - refactoring can now begin safely

---

## Phase 3: User Story 1 - Align task/notification views (Priority: P1) 🎯 MVP

**Goal**: Centralize task and notification schemas/views to match client/branch/visa pattern, reducing scattered logic

**Independent Test**: Task and notification endpoints maintain identical request/response behavior while sourcing from centralized schema definitions

### Implementation for User Story 1

- [X] T008 [P] [US1] Create centralized TaskViewSchema in immigration/api/v1/serializers/task.py (enhanced with explicit field definitions, computed fields, type hints)
- [X] T009 [P] [US1] Create centralized NotificationViewSchema in immigration/api/v1/serializers/notification.py (enhanced with explicit field definitions, computed fields, moved business logic to service)
- [X] T010 [US1] Refactor task views in immigration/api/v1/views/tasks.py to import and use centralized TaskViewSchema (already using centralized serializers)
- [X] T011 [US1] Refactor notification views in immigration/api/v1/views/notifications.py to import and use centralized NotificationViewSchema (already using centralized serializers)
- [X] T012 [US1] Remove duplicate/scattered schema definitions from task view files after consolidation (verified: no duplicates found)
- [X] T013 [US1] Remove duplicate/scattered schema definitions from notification view files after consolidation (verified: no duplicates found)
- [X] T014 [US1] Run regression smoke test for task endpoints (GET/POST /api/v1/tasks/) to confirm unchanged responses (6/6 tests passed)
- [X] T015 [US1] Run regression smoke test for notification endpoints (GET/POST /api/v1/notifications/) to confirm unchanged responses (6/6 tests passed)

**Checkpoint**: ✅ Task and notification views now centralized and backward compatible

---

## Phase 4: User Story 2 - Remove obsolete code (Priority: P2)

**Goal**: Remove unused or duplicate code to simplify maintenance and reduce confusion

**Independent Test**: Static analysis shows zero unused modules/functions and all smoke tests pass

### Implementation for User Story 2

- [ ] T016 [P] [US2] Identify unused imports in immigration/api/v1/views/ using ruff and static analysis
- [ ] T017 [P] [US2] Identify duplicate functions across immigration/api/v1/ and immigration/services/
- [ ] T018 [US2] Remove unused imports from task-related modules in immigration/api/v1/views/
- [ ] T019 [US2] Remove unused imports from notification-related modules in immigration/api/v1/views/
- [ ] T020 [US2] Remove duplicate or dead code functions identified in immigration/ (verify zero runtime references first)
- [ ] T021 [US2] Run static analysis to confirm zero unused imports/branches remain in affected modules
- [ ] T022 [US2] Run deployment smoke test to confirm no missing dependency errors after cleanup

**Checkpoint**: Codebase cleaned with no unused/duplicate code in refactored scope

---

## Phase 5: User Story 3 - Standardize constants and env settings (Priority: P3)

**Goal**: Replace string literals with traceable constants/enums and introduce environment-specific configuration

**Independent Test**: Code scan confirms 95%+ repeated identifiers use shared constants; environment settings can toggle across environments

### Implementation for User Story 3

- [X] T023 [P] [US3] Audit immigration/constants.py and identify unused constants
- [X] T024 [P] [US3] Scan task/notification modules for repeated string literals (statuses, priorities, channels, types)
- [X] T025 [US3] Remove unused constants from immigration/constants.py
- [X] T026 [US3] Define TaskStatus enum in immigration/constants.py (PENDING, IN_PROGRESS, DONE)
- [X] T027 [P] [US3] Define TaskPriority enum in immigration/constants.py (LOW, MEDIUM, HIGH)
- [X] T028 [P] [US3] Define NotificationChannel enum in immigration/constants.py (EMAIL, SMS, PUSH, IN_APP)
- [X] T029 [US3] Update task schema and views to reference TaskStatus and TaskPriority enums instead of string literals
- [X] T030 [US3] Update notification schema and views to reference NotificationChannel enum instead of string literals
- [X] T031 [US3] Scan remaining immigration/ modules for additional string literals and replace with constants where applicable
- [X] T032 [US3] Extend leopard/settings.py to load environment-specific settings (TASKS_DUE_SOON_DEFAULT_DAYS, TASKS_INCLUDE_OVERDUE_DEFAULT, NOTIFICATIONS_INCLUDE_READ_DEFAULT, NOTIFICATION_STREAM_ALLOWED_ORIGIN)
- [X] T033 [US3] Add startup validation in leopard/settings.py to fail fast if required environment variables are missing
- [X] T034 [US3] Document environment variable configuration in quickstart.md or deployment docs
- [X] T035 [US3] Run code scan to verify 95%+ of repeated identifiers now use shared constants/enums
- [X] T036 [US3] Test environment-specific settings can be toggled without code changes (e.g., set different values for local vs staging)

**Checkpoint**: All constants centralized and environment configuration validated

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation across all user stories

- [ ] T037 [P] Run full linting check (ruff check .) across immigration/ and leopard/ to confirm no new issues
- [ ] T038 [P] Run full test suite (pytest) to confirm all tests pass after refactor
- [ ] T039 Validate quickstart.md steps work end-to-end with new centralized schemas and env settings
- [ ] T040 Update AGENTS.md if new conventions or patterns established from this refactor
- [ ] T041 Run final regression smoke tests for task and notification endpoints to confirm backward compatibility maintained

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in priority order: US1 (P1) → US2 (P2) → US3 (P3)
  - US2 and US3 can run in parallel with US1 if team capacity allows (different file scopes)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Should follow US1 to avoid removing code that gets refactored - Light dependency on US1
- **User Story 3 (P3)**: Should follow US1 to apply constants to centralized schemas - Light dependency on US1

### Within Each User Story

- **US1**: Create schemas before refactoring views; remove duplicates after refactor complete; run smoke tests last
- **US2**: Identify unused code before removing; verify zero references before deletion; run static analysis after removal
- **US3**: Audit and define constants before updating code; extend settings before validating; run final scan after all updates

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational tasks marked [P] can run in parallel (T005, T006)
- Within US1: Schema creation tasks can run in parallel (T008, T009)
- Within US2: Identification tasks can run in parallel (T016, T017); Removal tasks for different modules can run in parallel (T018, T019)
- Within US3: Audit tasks can run in parallel (T023, T024); Enum definition tasks can run in parallel (T027, T028)
- Polish phase: Linting and test suite can run in parallel (T037, T038)

---

## Parallel Example: User Story 1

```bash
# Launch schema creation for User Story 1 together:
Task: "Create centralized TaskViewSchema in immigration/api/v1/serializers/task_schema.py"
Task: "Create centralized NotificationViewSchema in immigration/api/v1/serializers/notification_schema.py"

# Then refactor views:
Task: "Refactor task views in immigration/api/v1/views/task.py to import and use centralized TaskViewSchema"
Task: "Refactor notification views in immigration/api/v1/views/notification.py to import and use centralized NotificationViewSchema"
```

## Parallel Example: User Story 3

```bash
# Launch enum definitions together:
Task: "Define TaskPriority enum in immigration/constants.py"
Task: "Define NotificationChannel enum in immigration/constants.py"

# After TaskStatus enum defined, update code references:
Task: "Update task schema and views to reference TaskStatus and TaskPriority enums"
Task: "Update notification schema and views to reference NotificationChannel enum"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - establishes safety baseline)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test task/notification endpoints independently
5. Deploy/demo if ready (centralized schemas operational)

### Incremental Delivery

1. Complete Setup + Foundational → Safety baseline ready
2. Add User Story 1 → Test independently → Deploy/Demo (Centralized schemas MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Cleaned codebase)
4. Add User Story 3 → Test independently → Deploy/Demo (Constants and env config standardized)
5. Each story adds value without breaking previous stories

### Sequential Strategy (Recommended for Refactor)

Since this is refactoring existing code:

1. Complete Setup + Foundational together (establish baseline)
2. Complete User Story 1 fully (centralize schemas)
3. Complete User Story 2 (remove obsolete code based on new structure)
4. Complete User Story 3 (apply constants to centralized schemas)
5. Polish phase validates all changes together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backward compatibility is CRITICAL - validate responses after each story
- US2 and US3 benefit from US1 completion (centralized schemas make constants/cleanup clearer)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run smoke tests frequently during refactor to catch regressions early
