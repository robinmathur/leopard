# Tasks: Multi-Tenant CRM Refactoring and Standardization

**Feature**: 001-multi-tenant-crm-refactor  
**Date**: Sat Dec 06 2025  
**Input**: Design documents from `/specs/001-multi-tenant-crm-refactor/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, research.md, quickstart.md

**Tests**: Test implementation is explicitly OUT OF SCOPE per requirements. No test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- All tasks include exact file paths from repository root

## Path Conventions

This Django monolith project uses:
- **immigration/**: Main Django app directory
- **leopard/**: Django project settings directory
- **manage.py**: Django management script at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and basic structure setup

- [X] T001 Install drf-spectacular for OpenAPI generation in requirements.txt
- [X] T002 Install pydantic for service layer input validation in requirements.txt
- [X] T003 [P] Create immigration/models/ directory structure with __init__.py
- [X] T004 [P] Create immigration/selectors/ directory structure with __init__.py
- [X] T005 [P] Create immigration/services/ directory structure with __init__.py
- [X] T006 [P] Create immigration/api/v1/ directory structure with __init__.py
- [X] T007 [P] Create immigration/api/v1/views/ directory with __init__.py
- [X] T008 [P] Create immigration/api/v1/serializers/ directory with __init__.py
- [X] T009 [P] Create immigration/management/commands/ directory for seed_data command
- [X] T010 Configure drf-spectacular in leopard/settings.py INSTALLED_APPS and REST_FRAMEWORK settings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Base Models and Abstract Classes

- [X] T011 Create SoftDeletionManager in immigration/models/base.py
- [X] T012 Create SoftDeletionModel abstract base class in immigration/models/base.py
- [X] T013 Create LifeCycleModel abstract base class in immigration/models/base.py
- [X] T014 [P] Create Tenant model in immigration/models/tenant.py with fields: name, domain, is_active, subscription_status, settings, created_at, updated_at
- [X] T015 [P] Create Region model in immigration/models/region.py with fields: tenant FK, name, description, created_at, updated_at
- [X] T016 Update Branch model in immigration/models/branch.py to add tenant FK and region FK fields
- [X] T017 Create constants.py with ROLE_CHOICES enum for role hierarchy in immigration/constants.py
- [X] T018 Update User model to extend with fields: role, tenant FK, branch FK, region FK in immigration/models/user.py

### Database Migrations

- [X] T019 Create migration for Tenant model in immigration/migrations/
- [X] T020 Create migration for Region model in immigration/migrations/
- [X] T021 Create migration for updated Branch model with tenant and region FKs in immigration/migrations/
- [X] T022 Create migration for extended User model with role and scope fields in immigration/migrations/
- [X] T023 Apply all foundational migrations using python manage.py migrate

### Core Permission Infrastructure

- [X] T024 Create RoleBasedPermission base class in immigration/api/v1/permissions.py
- [X] T025 [P] Create CanManageClients permission class in immigration/api/v1/permissions.py
- [X] T026 [P] Create CanCreateUsers permission class in immigration/api/v1/permissions.py
- [X] T027 [P] Create CanManageApplications permission class in immigration/api/v1/permissions.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Role-Based Data Access and Filtering (Priority: P1) 🎯 MVP

**Goal**: Implement role-based data scoping so users can only access data within their organizational scope (branch/region/tenant)

**Independent Test**: Create users with different roles (Consultant, Branch Admin, Region Manager, Country Manager) and verify each can only view/edit data within their assigned scope

### Models for User Story 1

- [X] T028 [P] [US1] Update Client model to inherit from LifeCycleModel and SoftDeletionModel in immigration/models/client.py
- [X] T029 [P] [US1] Ensure Client model has tenant FK (via branch) and branch FK fields in immigration/models/client.py
- [X] T030 [P] [US1] Add indexes for branch and tenant filtering on Client model in immigration/models/client.py
- [X] T031 [P] [US1] Create VisaCategory model in immigration/models/visa.py with fields: name, code, description
- [X] T032 [P] [US1] Create VisaType model in immigration/models/visa.py with fields: visa_category FK, name, code, description, checklist JSONField
- [X] T033 [P] [US1] Create VisaApplication model in immigration/models/visa.py with fields: client FK, visa_type FK, status, dates, fees, assigned_to FK
- [X] T034 [P] [US1] Update VisaApplication to inherit from LifeCycleModel in immigration/models/visa.py
- [X] T035 [US1] Create migrations for Client, VisaCategory, VisaType, VisaApplication models in immigration/migrations/

### Selectors for User Story 1

- [X] T036 [P] [US1] Implement client_list selector with role-based filtering (Consultant/Branch Admin → branch, Region Manager → region, Country Manager → tenant) in immigration/selectors/clients.py
- [X] T037 [P] [US1] Implement client_get selector with scope validation in immigration/selectors/clients.py
- [X] T038 [P] [US1] Implement visa_application_list selector with role-based filtering in immigration/selectors/applications.py
- [X] T039 [P] [US1] Implement visa_application_get selector with scope validation in immigration/selectors/applications.py

### Services for User Story 1

- [X] T040 [P] [US1] Create ClientCreateInput Pydantic model in immigration/services/clients.py
- [X] T041 [P] [US1] Implement client_create service with tenant/branch scope validation and atomic transaction in immigration/services/clients.py
- [X] T042 [P] [US1] Create ClientUpdateInput Pydantic model in immigration/services/clients.py
- [X] T043 [P] [US1] Implement client_update service with scope validation in immigration/services/clients.py
- [X] T044 [P] [US1] Implement client_delete service (soft deletion) in immigration/services/clients.py
- [X] T045 [P] [US1] Create VisaApplicationCreateInput Pydantic model in immigration/services/applications.py
- [X] T046 [P] [US1] Implement visa_application_create service with scope validation in immigration/services/applications.py
- [X] T047 [P] [US1] Implement visa_application_update service in immigration/services/applications.py

### API Layer for User Story 1

- [X] T048 [P] [US1] Create ClientOutputSerializer in immigration/api/v1/serializers/client.py
- [X] T049 [P] [US1] Create ClientCreateSerializer in immigration/api/v1/serializers/client.py
- [X] T050 [P] [US1] Create ClientUpdateSerializer in immigration/api/v1/serializers/client.py
- [X] T051 [US1] Create ClientViewSet using client_list selector and client_create/update services in immigration/api/v1/views/clients.py
- [X] T052 [US1] Apply CanManageClients permission to ClientViewSet in immigration/api/v1/views/clients.py
- [X] T053 [US1] Add @extend_schema decorators to ClientViewSet for OpenAPI documentation in immigration/api/v1/views/clients.py
- [X] T054 [P] [US1] Create VisaApplicationOutputSerializer in immigration/api/v1/serializers/visa.py
- [X] T055 [P] [US1] Create VisaApplicationCreateSerializer in immigration/api/v1/serializers/visa.py
- [X] T056 [US1] Create VisaApplicationViewSet using visa_application selectors and services in immigration/api/v1/views/visa.py
- [X] T057 [US1] Apply CanManageApplications permission to VisaApplicationViewSet in immigration/api/v1/views/visa.py
- [X] T058 [US1] Register ClientViewSet and VisaApplicationViewSet in immigration/api/v1/urls.py with /api/v1/clients/ and /api/v1/visa-applications/ patterns

**Checkpoint**: At this point, User Story 1 should be fully functional - role-based data filtering works for clients and visa applications

---

## Phase 4: User Story 2 - Hierarchical User Creation and Management (Priority: P1)

**Goal**: Implement strict role hierarchy for user creation (Super Super Admin → Super Admin → Country Manager → Region Manager → Branch Admin → Consultant)

**Independent Test**: Create users at each role level and verify they can only create users at the next level down (e.g., Branch Admin creates Consultant, cannot create Branch Admin or higher)

### Selectors for User Story 2

- [X] T059 [P] [US2] Implement user_list selector with role-based filtering in immigration/selectors/users.py
- [X] T060 [P] [US2] Implement user_get selector with scope validation in immigration/selectors/users.py

### Services for User Story 2

- [X] T061 [P] [US2] Create UserCreateInput Pydantic model in immigration/services/users.py
- [X] T062 [US2] Implement validate_user_creation_hierarchy function to enforce role hierarchy rules in immigration/services/users.py
- [X] T063 [US2] Implement user_create service with hierarchical validation (Super Super Admin → Super Admin, Super Admin → Country Manager, etc.) in immigration/services/users.py
- [X] T064 [US2] Add branch/region assignment validation based on creator role in user_create service in immigration/services/users.py
- [X] T065 [P] [US2] Create UserUpdateInput Pydantic model in immigration/services/users.py
- [X] T066 [US2] Implement user_update service with role change validation in immigration/services/users.py

### API Layer for User Story 2

- [X] T067 [P] [US2] Create UserOutputSerializer in immigration/api/v1/serializers/user.py
- [X] T068 [P] [US2] Create UserCreateSerializer in immigration/api/v1/serializers/user.py
- [X] T069 [P] [US2] Create UserUpdateSerializer in immigration/api/v1/serializers/user.py
- [X] T070 [US2] Create UserViewSet using user_list selector and user_create/update services in immigration/api/v1/views/users.py
- [X] T071 [US2] Apply CanCreateUsers permission to UserViewSet create action in immigration/api/v1/views/users.py
- [X] T072 [US2] Add @extend_schema decorators to UserViewSet with role hierarchy documentation in immigration/api/v1/views/users.py
- [X] T073 [US2] Register UserViewSet in immigration/api/v1/urls.py with /api/v1/users/ pattern

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can be created following strict hierarchy

---

## Phase 5: User Story 3 - Real-Time Notification Delivery (Priority: P2)

**Goal**: Replace WebSocket implementation with Server-Sent Events (SSE) for real-time notifications about tasks, visa expiry, and application updates

**Independent Test**: Trigger notification events (assign task, update visa status) and verify affected users receive notifications in real-time through SSE connection within 2 seconds

### Models for User Story 3

- [X] T074 [P] [US3] Create Notification model in immigration/models/notification.py with fields: type, assigned_to FK, due_date, meta_info JSONField, read, is_completed, created_by FK
- [X] T075 [P] [US3] Add indexes for assigned_to and read status on Notification model in immigration/models/notification.py
- [X] T076 [P] [US3] Create Task model in immigration/models/task.py with fields: title, detail, priority, due_date, assigned_to FK, tags JSONField, status, comments JSONField
- [X] T077 [P] [US3] Update Task model to inherit from LifeCycleModel in immigration/models/task.py
- [X] T078 [US3] Create migrations for Notification and Task models in immigration/migrations/

### Services for User Story 3

- [X] T079 [P] [US3] Implement send_notification_to_user function using channel layer in immigration/services/notifications.py
- [X] T080 [P] [US3] Create NotificationCreateInput Pydantic model in immigration/services/notifications.py
- [X] T081 [P] [US3] Implement notification_create service with scope-based delivery in immigration/services/notifications.py
- [X] T082 [US3] Create TaskCreateInput Pydantic model in immigration/services/tasks.py
- [X] T083 [US3] Implement task_create service that triggers notification on assignment in immigration/services/tasks.py
- [X] T084 [US3] Implement task_assign service that sends TASK_ASSIGNED notification via send_notification_to_user in immigration/services/tasks.py

### SSE Implementation for User Story 3

- [X] T085 [US3] Create async sse_event_stream generator function using channel layer in immigration/api/v1/views/notification_stream.py
- [X] T086 [US3] Implement notifications_stream view with JWT query parameter authentication in immigration/api/v1/views/notification_stream.py
- [X] T087 [US3] Add SSE-specific headers (Cache-Control: no-cache, X-Accel-Buffering: no) to stream response in immigration/api/v1/views/notification_stream.py
- [X] T088 [US3] Configure channel layer in leopard/settings.py with InMemoryChannelLayer for development
- [X] T089 [US3] Add /api/v1/notifications/stream/ URL pattern to immigration/api/v1/urls.py

### API Layer for User Story 3

- [X] T090 [P] [US3] Create NotificationOutputSerializer in immigration/api/v1/serializers/notification.py
- [X] T091 [P] [US3] Implement notification_list selector filtering by assigned_to user in immigration/selectors/notifications.py
- [X] T092 [US3] Create NotificationViewSet for listing and marking notifications as read in immigration/api/v1/views/notifications.py (✨ Enhanced with router pattern and @extend_schema decorators)
- [X] T093 [US3] Register NotificationViewSet in immigration/api/v1/urls.py with /api/v1/notifications/ pattern (✨ Aligned with router pattern)
- [X] T094 [P] [US3] Create TaskOutputSerializer in immigration/api/v1/serializers/task.py
- [X] T095 [P] [US3] Implement task_list selector with role-based filtering in immigration/selectors/tasks.py
- [X] T096 [US3] Create TaskViewSet using task selectors and services in immigration/api/v1/views/tasks.py (✨ Enhanced with router pattern and @extend_schema decorators)
- [X] T097 [US3] Register TaskViewSet in immigration/api/v1/urls.py with /api/v1/tasks/ pattern (✨ Aligned with router pattern)

### Cleanup WebSocket Implementation

- [X] T098 [US3] Remove WebSocket consumer code from immigration/consumers.py
- [X] T099 [US3] Remove WebSocket routing from leopard/asgi.py
- [X] T100 [US3] Update deployment/nginx/nginx.conf to add SSE-specific configuration for /api/v1/notifications/stream/ endpoint (proxy_buffering off, proxy_read_timeout 86400s)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - real-time notifications delivered via SSE

---

## Phase 6: User Story 4 - Consistent API Structure and Documentation (Priority: P2)

**Goal**: Standardize all API endpoints to follow /api/v1/ pattern with consistent pagination and generate complete OpenAPI specification

**Independent Test**: Review generated OpenAPI spec and verify all endpoints follow standardized URL pattern, include pagination metadata, and have complete documentation

### URL Restructuring

- [X] T101 [US4] Create immigration/api/v1/routers.py to register all ViewSets with DRF DefaultRouter
- [X] T102 [US4] Update leopard/urls.py to include immigration.api.v1.urls at /api/v1/ prefix
- [X] T103 [US4] Verify all endpoints follow /api/v1/{resource-plural}/{id}/ pattern in immigration/api/v1/urls.py

### Pagination Standardization

- [X] T104 [P] [US4] Create StandardResultsSetPagination class with page_size=25 in immigration/pagination.py
- [X] T105 [P] [US4] Configure REST_FRAMEWORK DEFAULT_PAGINATION_CLASS in leopard/settings.py
- [X] T106 [US4] Apply pagination_class = StandardResultsSetPagination to all ViewSets (ClientViewSet, UserViewSet, VisaApplicationViewSet, NotificationViewSet, TaskViewSet)

### OpenAPI Documentation

- [X] T107 [P] [US4] Add @extend_schema decorators to all ClientViewSet actions with summaries, descriptions, parameters, and response schemas in immigration/api/v1/views/clients.py
- [X] T108 [P] [US4] Add @extend_schema decorators to all UserViewSet actions in immigration/api/v1/views/users.py
- [X] T109 [P] [US4] Add @extend_schema decorators to all VisaApplicationViewSet actions in immigration/api/v1/views/visa.py
- [X] T110 [P] [US4] Add @extend_schema decorators to all NotificationViewSet actions in immigration/api/v1/views/notifications.py
- [X] T111 [P] [US4] Add @extend_schema decorators to all TaskViewSet actions in immigration/api/v1/views/tasks.py
- [X] T112 [US4] Configure SPECTACULAR_SETTINGS in leopard/settings.py with title, description, version, security definitions
- [X] T113 [US4] Add SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView to leopard/urls.py at /api/schema/, /api/docs/, /api/redoc/
- [X] T114 [US4] Generate OpenAPI specification using python manage.py spectacular --file specs/001-multi-tenant-crm-refactor/contracts/openapi.yaml

**Checkpoint**: All user stories 1-4 work independently - API structure is standardized and fully documented

---

## Phase 7: User Story 5 - Data Integrity and Soft Deletion (Priority: P3)

**Goal**: Ensure soft-deleted records are automatically excluded from queries and can be restored by administrators

**Independent Test**: Soft delete a client record, verify it doesn't appear in normal queries, then restore using admin tools and confirm it reappears

### Soft Deletion for Additional Models

- [X] T115 [P] [US5] Update Agent model to inherit from SoftDeletionModel in immigration/models/agent.py
- [X] T116 [P] [US5] Update Branch model to inherit from SoftDeletionModel in immigration/models/branch.py
- [X] T117 [P] [US5] Add deleted_at field and indexes to Agent model migration in immigration/migrations/
- [X] T118 [P] [US5] Add deleted_at field and indexes to Branch model migration in immigration/migrations/

### Services for Soft Deletion

- [X] T119 [P] [US5] Implement client_restore service to restore soft-deleted clients in immigration/services/clients.py
- [X] T120 [P] [US5] Implement branch_restore service in immigration/services/branches.py
- [X] T121 [P] [US5] Implement agent_restore service in immigration/services/agents.py

### Selectors with Soft Deletion Support

- [X] T122 [US5] Update client_list selector to support include_deleted parameter in immigration/selectors/clients.py
- [X] T123 [US5] Update visa_application_list selector to exclude applications for soft-deleted clients in immigration/selectors/applications.py
- [X] T124 [US5] Create deleted_clients_list selector using Client.all_objects manager in immigration/selectors/clients.py

### API Support for Soft Deletion

- [X] T125 [US5] Add restore action to ClientViewSet calling client_restore service in immigration/api/v1/views/clients.py
- [X] T126 [US5] Add include_deleted query parameter support to ClientViewSet list action in immigration/api/v1/views/clients.py
- [X] T127 [US5] Add @extend_schema documentation for restore action in immigration/api/v1/views/clients.py

**Checkpoint**: User Stories 1-5 work independently - soft deletion prevents data loss

---

## Phase 8: User Story 6 - Seed Data for Testing and Development (Priority: P3)

**Goal**: Provide management command to populate database with realistic sample data for development and testing

**Independent Test**: Run seed_data command on fresh database and verify 3 tenants with 2 branches each, users for all roles, and 50+ clients with proper relationships are created

### Seed Data Command Implementation

- [ ] T128 [US6] Create management command file immigration/management/commands/seed_data.py
- [ ] T129 [P] [US6] Implement seed_tenants function to create 3 Tenant entities in seed_data.py
- [ ] T130 [P] [US6] Implement seed_regions function to create 2 regions per tenant in seed_data.py
- [ ] T131 [P] [US6] Implement seed_branches function to create 2 Branch entities per tenant in seed_data.py
- [ ] T132 [US6] Implement seed_users function to create one user for each role (SUPER_SUPER_ADMIN, SUPER_ADMIN, COUNTRY_MANAGER, REGION_MANAGER, BRANCH_ADMIN, CONSULTANT) in seed_data.py
- [ ] T133 [US6] Implement seed_visa_categories function to create visa categories (Work Visa, Student Visa, Permanent Residence, etc.) in seed_data.py
- [ ] T134 [US6] Implement seed_visa_types function to create specific visa types under each category in seed_data.py
- [ ] T135 [US6] Implement seed_clients function to create 50+ Client entities with realistic attributes and relationships to branches in seed_data.py
- [ ] T136 [US6] Implement seed_applications function to create VisaApplication entities linked to clients in seed_data.py
- [ ] T137 [US6] Implement seed_tasks function to create Task entities assigned to users in seed_data.py
- [ ] T138 [US6] Implement seed_agents function to create Agent entities in seed_data.py
- [ ] T139 [US6] Wire all seed functions together in handle method with transaction.atomic wrapper in seed_data.py
- [ ] T140 [US6] Add execution timer to track seed_data command performance (target <60 seconds) in seed_data.py
- [ ] T141 [US6] Test seed_data command on fresh database: python manage.py seed_data

**Checkpoint**: All user stories 1-6 work independently - development environment can be quickly populated with test data

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final cleanup

### Migration Squashing

- [ ] T142 Backup production database using pg_dump before migration squashing
- [ ] T143 Document current migration state using python manage.py showmigrations > migration_state_before_squash.txt
- [ ] T144 Squash migrations incrementally: python manage.py squashmigrations immigration 0001 0010
- [ ] T145 Test squashed migrations on copy of production data
- [ ] T146 Create final 0001_initial.py by squashing all migrations: python manage.py squashmigrations immigration 0001 0035
- [ ] T147 Verify squashed migration schema matches production using schema comparison tools
- [ ] T148 Test squashed migration on fresh database to ensure it creates correct schema

### Code Quality

- [ ] T149 [P] Apply Black formatting to all Python files: black immigration/
- [ ] T150 [P] Apply Ruff linting and auto-fix issues: ruff check --fix immigration/
- [ ] T151 [P] Review and fix any remaining Ruff linting errors: ruff check immigration/
- [ ] T152 [P] Add type hints to service layer functions in immigration/services/
- [ ] T153 Verify all models use explicit imports (no wildcard imports) across immigration/

### Documentation and Validation

- [ ] T154 [P] Update AGENTS.md with final technology stack and commands using .specify/scripts/bash/update-agent-context.sh opencode
- [ ] T155 [P] Verify quickstart.md instructions work on fresh development environment
- [ ] T156 Generate final OpenAPI specification: python manage.py spectacular --file specs/001-multi-tenant-crm-refactor/contracts/openapi.yaml
- [ ] T157 Review generated OpenAPI spec for completeness and accuracy at /api/docs/

### Deployment Preparation

- [ ] T158 Update deployment/nginx/nginx.conf with SSE-specific configuration (proxy_buffering off for /api/v1/notifications/stream/)
- [ ] T159 Verify daphne configuration in deployment/daphne/daphne.service for ASGI SSE support
- [ ] T160 Test SSE connection through Nginx proxy in staging environment
- [ ] T161 Update requirements.txt with all new dependencies (drf-spectacular, pydantic, black, ruff)

---

## Phase 10: Client Profile Data Parity (Backfill)

- [X] T162 Add refactored models for LPE/Passport/Qualification/Proficiency in immigration/models/profile.py
- [X] T163 Add migrations to align client profile models in immigration/migrations/0006_client_profile_models.py
- [X] T164 Add selectors and services for client profile resources in immigration/selectors/client_profiles.py and immigration/services/client_profiles.py
- [X] T165 Expose serializers, views, and routes for client profile resources under immigration/api/v1/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 3 (P2): Can start after Foundational - No dependencies on other stories
  - User Story 4 (P2): Can start after Foundational - Integrates with all previous stories but independently testable
  - User Story 5 (P3): Can start after Foundational - Extends User Story 1 models but independently testable
  - User Story 6 (P3): Can start after Foundational - Depends on all models being created but independently testable
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

**CRITICAL**: All user stories are designed to be independently implementable and testable

- **User Story 1 (P1)**: Foundation → US1 ✅ (INDEPENDENT - can demo role-based filtering alone)
- **User Story 2 (P1)**: Foundation → US2 ✅ (INDEPENDENT - can demo user creation hierarchy alone)
- **User Story 3 (P2)**: Foundation → US3 ✅ (INDEPENDENT - can demo notifications alone)
- **User Story 4 (P2)**: Foundation → US4 ✅ (INDEPENDENT - standardizes existing endpoints)
- **User Story 5 (P3)**: Foundation → US5 ✅ (INDEPENDENT - soft deletion works alone)
- **User Story 6 (P3)**: Foundation → US6 ✅ (INDEPENDENT - seed command works alone)

### Within Each User Story

1. Models before selectors/services
2. Selectors and services can be parallel
3. API layer depends on selectors and services
4. Integration tasks last within story
5. Story checkpoint validates independence

### Parallel Opportunities

#### Phase 1 (Setup) - All Parallel:
- T003, T004, T005, T006, T007, T008, T009 (directory creation)

#### Phase 2 (Foundational) - Partial Parallel:
- T014, T015 (Tenant and Region models - parallel)
- T024, T025, T026, T027 (Permission classes - all parallel)

#### Phase 3 (User Story 1) - Extensive Parallel:
- T028, T029, T030, T031, T032, T033, T034 (All models - parallel)
- T036, T037, T038, T039 (All selectors - parallel)
- T040, T041, T042, T043, T044, T045, T046, T047 (All services - parallel)
- T048, T049, T050, T054, T055 (All serializers - parallel)

#### Phase 4 (User Story 2) - Parallel:
- T059, T060 (Selectors - parallel)
- T065, T066 (Services - parallel after T063-T064)
- T067, T068, T069 (Serializers - parallel)

#### Phase 5 (User Story 3) - Parallel:
- T074, T075, T076, T077 (Models - parallel)
- T079, T080, T081, T082, T083, T084 (Services - parallel)
- T090, T091, T094, T095 (Selectors and serializers - parallel)

#### Phase 6 (User Story 4) - Extensive Parallel:
- T107, T108, T109, T110, T111 (OpenAPI decorators for all ViewSets - parallel)

#### Phase 7 (User Story 5) - Parallel:
- T115, T116, T117, T118 (Soft deletion for models - parallel)
- T119, T120, T121 (Restore services - parallel)

#### Phase 8 (User Story 6) - Parallel:
- T129, T130, T131 (Seed functions for tenants, regions, branches - parallel)

#### Phase 9 (Polish) - Parallel:
- T149, T150, T151, T152, T153 (Code quality tasks - parallel)
- T154, T155, T156, T157 (Documentation - parallel)

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Update Client model to inherit from LifeCycleModel and SoftDeletionModel in immigration/models/client.py"
Task: "Ensure Client model has tenant FK (via branch) and branch FK fields in immigration/models/client.py"
Task: "Create VisaCategory model in immigration/models/visa.py"
Task: "Create VisaType model in immigration/models/visa.py"
Task: "Create VisaApplication model in immigration/models/visa.py"

# Launch all selectors for User Story 1 together:
Task: "Implement client_list selector with role-based filtering in immigration/selectors/clients.py"
Task: "Implement client_get selector with scope validation in immigration/selectors/clients.py"
Task: "Implement visa_application_list selector in immigration/selectors/applications.py"
Task: "Implement visa_application_get selector in immigration/selectors/applications.py"

# Launch all services for User Story 1 together:
Task: "Create ClientCreateInput Pydantic model in immigration/services/clients.py"
Task: "Implement client_create service in immigration/services/clients.py"
Task: "Create ClientUpdateInput Pydantic model in immigration/services/clients.py"
Task: "Implement client_update service in immigration/services/clients.py"
Task: "Implement client_delete service (soft deletion) in immigration/services/clients.py"
Task: "Create VisaApplicationCreateInput Pydantic model in immigration/services/applications.py"
Task: "Implement visa_application_create service in immigration/services/applications.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

**Recommended minimal viable product**:

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T027) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T028-T058) - Role-based data access
4. Complete Phase 4: User Story 2 (T059-T073) - Hierarchical user creation
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

**Why this MVP**: User Stories 1 and 2 are both P1 priority and provide the core security model (role-based access + hierarchical user management). This is the minimal secure foundation.

### Incremental Delivery

**Full feature rollout**:

1. **Foundation Ready** (Setup + Foundational): T001-T027 complete
2. **MVP Release** (US1 + US2): T028-T073 complete → Test independently → Deploy/Demo
3. **Real-Time Enhancement** (+ US3): T074-T100 complete → Test independently → Deploy/Demo
4. **API Standardization** (+ US4): T101-T114 complete → Test independently → Deploy/Demo
5. **Data Safety** (+ US5): T115-T127 complete → Test independently → Deploy/Demo
6. **Dev Tools** (+ US6): T128-T141 complete → Test independently → Deploy/Demo
7. **Production Ready** (Polish): T142-T161 complete → Final validation → Production deployment

Each increment adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers (after Foundational phase complete):

- **Developer A**: User Story 1 (T028-T058) - Client and visa application management
- **Developer B**: User Story 2 (T059-T073) - User creation hierarchy
- **Developer C**: User Story 3 (T074-T100) - Real-time notifications

After initial stories complete, developers can tackle US4-US6 in parallel.

---

## Summary

**Total Tasks**: 161 tasks

**Tasks by Phase**:
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 17 tasks
- Phase 3 (User Story 1 - P1): 31 tasks
- Phase 4 (User Story 2 - P1): 15 tasks
- Phase 5 (User Story 3 - P2): 27 tasks
- Phase 6 (User Story 4 - P2): 14 tasks
- Phase 7 (User Story 5 - P3): 13 tasks
- Phase 8 (User Story 6 - P3): 14 tasks
- Phase 9 (Polish): 20 tasks

**Parallelizable Tasks**: 85 tasks marked [P] (53% of total)

**Independent Test Criteria**:
- **US1**: Create users with different roles and verify each can only view/edit data within scope
- **US2**: Create users at each role level and verify hierarchical creation rules are enforced
- **US3**: Trigger notification events and verify real-time delivery via SSE within 2 seconds
- **US4**: Review OpenAPI spec and verify all endpoints follow standardized patterns
- **US5**: Soft delete records, verify exclusion from queries, restore and verify reappearance
- **US6**: Run seed_data on fresh database and verify all entities created with proper relationships

**Suggested MVP**: User Stories 1 + 2 (Phases 1-4, tasks T001-T073) provides secure foundation with role-based access and user management

**Format Validation**: ✅ All 161 tasks follow strict checklist format (checkbox + ID + [P]/[Story] markers + file paths)

---

## Notes

- **[P] marker**: Task can run in parallel (different files, no incomplete dependencies)
- **[Story] label**: Maps task to specific user story (US1-US6) for traceability
- **File paths**: All tasks include exact file paths from repository root
- **Independence**: Each user story is independently completable and testable
- **No tests**: Test implementation explicitly excluded per requirements
- **Checkpoint validation**: Stop at any user story checkpoint to validate independently
- **Commit strategy**: Commit after each task or logical group within a story
