# Implementation Plan: Multi-Tenant CRM Refactoring and Standardization

**Branch**: `001-multi-tenant-crm-refactor` | **Date**: Fri Dec 05 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Complete refactoring and standardization of a Django/DRF multi-tenant CRM application for immigration agents, focusing on clean architecture, role-based permissions, and maintainable code structure.

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This refactoring project transforms an existing Django/DRF-based multi-tenant CRM for immigration agents into a maintainable, well-structured system following clean architecture principles. The primary goals are:

1. **Architectural Standardization**: Implement service/selector pattern to separate business logic from API layer
2. **Role-Based Access Control**: Enforce strict hierarchical permissions (Super Super Admin → Super Admin → Country Manager → Region Manager → Branch Admin → Consultant)
3. **Multi-Tenancy Enhancement**: Ensure complete data isolation and scope-based filtering
4. **Real-Time Notifications**: Replace Django Channels WebSocket implementation with lightweight SSE
5. **API Standardization**: Consistent RESTful endpoints with versioning and OpenAPI documentation
6. **Code Quality**: Apply Black/Ruff formatting, migrate to atomic transactions, implement soft deletion

The technical approach leverages existing Django 4.2 infrastructure while introducing:
- Dedicated `selectors.py` (read operations) and `services.py` (write operations) modules
- Restructured `api/v1/` directories for API separation
- Custom DRF permission classes for scope-based access control
- SSE endpoint for real-time notifications
- Migration squashing to single `0001_initial.py` per app
- Seed data management command for testing

## Technical Context

**Language/Version**: Python 3.8+ with Django 4.2.6  
**Primary Dependencies**: 
- Django Rest Framework (DRF) for API layer
- djangorestframework-simplejwt (JWT authentication with RS256)
- drf-spectacular (OpenAPI 3.0 specification generation)
- django-filter 23.3 (query filtering)
- PostgreSQL (database backend)
- daphne 4.1.2 (ASGI server - currently used for Channels)
- channels 4.1.0 (WebSocket - **to be removed**)
- django-soft-delete 1.0.13 (soft deletion - **to be replaced with custom implementation**)
- django-countries 7.6.1 (country field support)
- Black/Ruff (code formatting)

**Storage**: PostgreSQL with single shared database + tenant scoping via foreign keys (not schema-per-tenant)

**Testing**: pytest with Django plugin (though test implementation is out of scope per requirements)

**Target Platform**: Linux server deployment behind Nginx reverse proxy

**Project Type**: Web backend API (Django monolith with single app structure)

**Performance Goals**: 
- API response time: <200ms p95 for standard queries
- SSE notification delivery: <2 seconds from event trigger
- Pagination: 25 items per page default
- Seed data generation: <60 seconds for full dataset

**Constraints**: 
- Must maintain 100% operational functionality during refactoring (no breaking changes)
- Cannot modify deployment infrastructure or database system
- Must work without Firebase dependencies
- Migration squashing must preserve all production data
- Must maintain backward compatibility with existing API clients during transition
- SSE must work over standard HTTP/HTTPS (no WebSocket infrastructure)

**Scale/Scope**: 
- Multi-tenant system supporting ~100+ immigration agencies (tenants)
- Each tenant: 2-10 branches, 10-50 users
- ~10k-50k client records per tenant
- 6-tier role hierarchy
- 50+ API endpoints across all resources

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: The constitution file currently contains only placeholder content. Since this is a refactoring project for an existing Django application (not a new greenfield project), we'll apply Django/DRF community best practices as our guiding principles:

### Django/DRF Best Practices (Acting Constitution)

✅ **I. Separation of Concerns**
- **Requirement**: Business logic separated from presentation layer
- **Status**: **PASS** - This refactoring implements service/selector pattern to extract logic from views/serializers
- **Justification**: Current codebase violates this (business logic in views); refactoring explicitly addresses this

✅ **II. DRY (Don't Repeat Yourself)**
- **Requirement**: Reusable components, abstract base classes, mixins
- **Status**: **PASS** - Implementing reusable SoftDeletionModel mixin, custom permission classes, base ViewSets
- **Justification**: Reduces code duplication across 10+ model classes

✅ **III. Explicit is Better Than Implicit**
- **Requirement**: Clear naming, explicit imports, type hints where applicable
- **Status**: **PASS** - PEP 8 compliance, dataclasses/Pydantic for service I/O, explicit imports
- **Justification**: Improves maintainability for multi-developer team

✅ **IV. Database Integrity**
- **Requirement**: Atomic transactions, proper foreign keys, referential integrity
- **Status**: **PASS** - All multi-step operations wrapped in `transaction.atomic()`, FK relationships enforced
- **Justification**: Prevents partial data states in multi-tenant environment

✅ **V. Security by Default**
- **Requirement**: Permission checks on all endpoints, input validation, SQL injection prevention
- **Status**: **PASS** - Custom permission classes on every ViewSet, DRF serializer validation, Django ORM (prevents SQL injection)
- **Justification**: Multi-tenant system requires strict data isolation

✅ **VI. API Versioning & Backward Compatibility**
- **Requirement**: Version all public APIs, maintain compatibility during transitions
- **Status**: **PASS** - Explicit `/api/v1/` versioning, backward compatibility during refactoring
- **Justification**: External API clients exist; breaking changes unacceptable

✅ **VII. Simplicity & Pragmatism**
- **Requirement**: Use Django/DRF conventions, avoid over-engineering
- **Status**: **PASS** - Leveraging DRF ViewSets, standard pagination, avoiding unnecessary abstractions
- **Justification**: Team already familiar with Django; stick to framework patterns

### Potential Violations Requiring Justification

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple layers (models, services, selectors, serializers, views) | Clean separation of read/write logic; testability; clear API contracts | Direct model access from views leads to fat views (current problem); business logic scattered across codebase |
| Custom permission system (not using django-guardian) | Simple role hierarchy; scope-based filtering tightly coupled to models | django-guardian adds complexity for object-level permissions; our needs are simpler (role + scope checks) |
| SSE instead of WebSockets | Unidirectional notifications; simpler than Channels; works over HTTP | WebSockets are overkill for one-way notifications; Channels adds deployment complexity |
| Migration squashing (risky operation) | Technical debt cleanup; reduces migration count from 35+ to 1 per app | Leaving 35+ migrations creates confusion; squashing requires careful execution but long-term benefit justified |

**Gate Status**: ✅ **PASS** - All practices aligned with Django/DRF community standards; violations justified by complexity reduction

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-crm-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── openapi.yaml     # Generated OpenAPI 3.0 specification
├── checklists/
│   └── requirements.md  # Spec quality validation
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Current Structure** (before refactoring):
```text
leopard/                 # Django project root
├── immigration/         # Main Django app (monolithic)
│   ├── models.py        # Lifecycle base models
│   ├── views.py         # Lifecycle base ViewSet
│   ├── serializer.py    # Base serializers
│   ├── user.py          # User views/serializers
│   ├── agent.py         # Agent model/view/serializer
│   ├── branch.py        # Branch model/view/serializer
│   ├── client/          # Client module
│   │   ├── client.py
│   │   ├── experience.py
│   │   ├── lpe.py
│   │   ├── passport.py
│   │   ├── proficiency.py
│   │   ├── qualification.py
│   │   └── history/
│   ├── visa/            # Visa module
│   │   ├── visa_application.py
│   │   ├── visa_category.py
│   │   └── visa_type.py
│   ├── application/     # Application module
│   │   ├── application.py
│   │   ├── application_stage.py
│   │   └── application_type.py
│   ├── reminder/
│   │   └── reminder.py
│   ├── migrations/      # 35+ migration files
│   ├── constants.py
│   ├── middleware.py
│   ├── pagination.py
│   ├── permissions.py
│   ├── task.py
│   ├── notification.py
│   ├── notification_manager.py
│   ├── consumers.py     # WebSocket consumer (to be removed)
│   └── signals.py
├── leopard/             # Django settings
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── manage.py
```

**Target Structure** (after refactoring):
```text
leopard/                 # Django project root
├── immigration/         # Main Django app (refactored)
│   ├── models/          # NEW: Models separated by domain
│   │   ├── __init__.py
│   │   ├── base.py      # LifeCycleModel, SoftDeletionModel
│   │   ├── tenant.py    # Tenant model
│   │   ├── branch.py    # Branch model
│   │   ├── user.py      # Extended User model
│   │   ├── client.py    # Client + related models
│   │   ├── visa.py      # Visa models
│   │   ├── application.py  # Application models
│   │   ├── agent.py     # Agent model
│   │   ├── task.py      # Task model
│   │   ├── notification.py  # Notification model
│   │   └── reminder.py  # Reminder model
│   ├── selectors/       # NEW: Read operations (queries)
│   │   ├── __init__.py
│   │   ├── clients.py
│   │   ├── users.py
│   │   ├── branches.py
│   │   ├── applications.py
│   │   ├── notifications.py
│   │   └── ...
│   ├── services/        # NEW: Write operations (mutations)
│   │   ├── __init__.py
│   │   ├── clients.py
│   │   ├── users.py
│   │   ├── branches.py
│   │   ├── applications.py
│   │   ├── notifications.py
│   │   └── ...
│   ├── api/             # NEW: API layer separation
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── serializers/
│   │       │   ├── __init__.py
│   │       │   ├── base.py
│   │       │   ├── client.py
│   │       │   ├── user.py
│   │       │   ├── branch.py
│   │       │   └── ...
│   │       ├── views/
│   │       │   ├── __init__.py
│   │       │   ├── client.py
│   │       │   ├── user.py
│   │       │   ├── branch.py
│   │       │   ├── notification_stream.py  # SSE endpoint
│   │       │   └── ...
│   │       ├── permissions.py  # Custom permission classes
│   │       ├── filters.py      # Query filters
│   │       └── routers.py      # URL routing
│   ├── management/      # NEW: Management commands
│   │   └── commands/
│   │       └── seed_data.py
│   ├── utils/           # Utilities
│   │   ├── __init__.py
│   │   ├── twowaymapper.py
│   │   └── ...
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py  # Squashed migration
│   ├── constants.py     # Enums, choices
│   ├── middleware.py
│   └── pagination.py
├── leopard/             # Django settings
│   ├── settings.py      # Updated: remove Channels, add drf-spectacular
│   ├── urls.py          # Updated: point to api/v1/ routers
│   ├── asgi.py          # Updated: remove Channels config
│   └── wsgi.py
└── manage.py
```

**Structure Decision**: 

The refactoring maintains Django's single-app structure (`immigration`) but reorganizes internal modules for clean architecture:

1. **Models Layer** (`models/`): Domain models separated by bounded context (client, visa, application, etc.)
2. **Business Logic Layer** (`selectors/` + `services/`): 
   - `selectors/`: Read-only queries, filtering, data retrieval
   - `services/`: Write operations, business rules, transaction management
3. **API Layer** (`api/v1/`): Versioned API with serializers, views, permissions
4. **Infrastructure** (`management/`, `utils/`, `middleware.py`): Supporting code

This structure provides:
- Clear separation of concerns (models ≠ business logic ≠ API)
- Testability (each layer can be tested independently)
- Maintainability (changes localized to specific modules)
- Versioning (easy to add `api/v2/` later)

## Complexity Tracking

> **Filled because Constitution Check has justified violations**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple layers (models, services, selectors, serializers, views) | Clean separation of read/write logic; testability; clear API contracts | Direct model access from views leads to fat views (current problem); business logic scattered across codebase making changes risky |
| Custom permission system (not using django-guardian) | Simple role hierarchy (6 roles); scope-based filtering (tenant/branch/region) tightly coupled to models | django-guardian adds object-level permission complexity; our hierarchical role system is simpler to implement with custom BasePermission classes |
| SSE instead of WebSockets | Unidirectional notifications only; simpler than Channels; works over standard HTTP | WebSockets are overkill for one-way server-to-client notifications; Channels requires ASGI workers, Redis/in-memory backend, adds deployment/scaling complexity |
| Migration squashing (risky operation) | Technical debt cleanup; reduces migration count from 35+ to 1 per app; improves onboarding | Leaving 35+ migrations creates confusion for new developers; squashing is one-time risk with careful backup/testing strategy; long-term benefit justified |
| Dataclasses/Pydantic for service I/O | Type safety; explicit contracts; prevents runtime errors in business logic | Using plain dicts risks runtime errors; service layer needs clear input/output shapes; small overhead for large maintainability gain |

**Risk Mitigation**:
- Migration squashing: Full database backup, test on staging, verify data integrity
- Multiple layers: Start with high-priority models (Client, User), iterate gradually
- Custom permissions: Comprehensive test coverage for all role/scope combinations (out of scope for this refactor but documented for future)

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ Complete (see [research.md](./research.md))

### Research Questions

All technical context items have been resolved from existing codebase analysis and spec requirements. No additional research needed for:

- ✅ Django version: 4.2.6 (confirmed in settings.py)
- ✅ DRF: Installed and configured (confirmed)
- ✅ JWT authentication: djangorestframework-simplejwt with RS256 (confirmed)
- ✅ Database: PostgreSQL (confirmed in settings.py)
- ✅ Testing framework: pytest (assumption documented in spec)
- ✅ Deployment: Linux + Nginx (documented in spec constraints)

### Key Decisions Summary

See [research.md](./research.md) for detailed rationale on:

1. **Service/Selector Pattern**: HackSoft Django Style Guide approach
2. **SSE Implementation**: django-eventstream vs custom implementation
3. **OpenAPI Generation**: drf-spectacular (industry standard)
4. **Soft Deletion**: Custom abstract model vs django-soft-delete upgrade
5. **Migration Squashing**: Strategy for safe execution with data preservation
6. **Permission System**: Custom DRF BasePermission classes vs django-guardian

---

## Phase 1: Design & Data Model

**Status**: ✅ Complete

### Outputs

1. ✅ **Data Model**: [data-model.md](./data-model.md) - Entity definitions, relationships, validation rules
2. ✅ **API Contracts**: [contracts/openapi.yaml](./contracts/openapi.yaml) - OpenAPI 3.0 specification
3. ✅ **Quickstart Guide**: [quickstart.md](./quickstart.md) - Development setup and refactoring workflow
4. ✅ **Agent Context**: Updated via `.specify/scripts/bash/update-agent-context.sh opencode`

---

## Phase 2: Task Breakdown

**Status**: ⏸️ Not started (requires `/speckit.tasks` command)

Task breakdown will be generated by running `/speckit.tasks` after this planning phase completes.

---

## Implementation Notes

### Migration Strategy

**Critical**: Migration squashing must be executed carefully to preserve production data.

**Approach**:
1. **Backup**: Full PostgreSQL dump before any migration changes
2. **Document Current State**: Export current migration graph (`python manage.py showmigrations`)
3. **Squash Incrementally**: 
   - Squash in logical groups (e.g., squash 0001-0010, then 0011-0020)
   - Test each squash on a copy of production data
4. **Generate Final 0001_initial.py**: Once all squashes verified, combine into single initial
5. **Verify**: Run migrations on fresh DB, compare schema to production using `sqldiff`

**Rollback Plan**: Keep old migrations in separate branch until production verification complete (1 week post-deployment).

### Refactoring Sequence

**Recommended Order** (aligns with User Story priorities):

**Phase A - Foundation** (P1 dependencies):
1. Implement `SoftDeletionModel` abstract base class
2. Add `Tenant` model if missing (spec implies it may not exist yet)
3. Update `Branch` model to include `tenant` FK and `region` field
4. Extend User model with `tenant`, `branch`, `region`, `role` fields
5. Create `constants.py` role hierarchy enum

**Phase B - Permissions** (P1 - User Stories 1 & 2):
6. Implement custom permission classes (`HasRolePermission`, `HasScopePermission`)
7. Create `selectors/users.py` with role-based filtering
8. Create `services/users.py` with hierarchical user creation logic
9. Update user ViewSet to use new permissions + service layer

**Phase C - Data Access** (P1 - User Story 1):
10. Implement `selectors/clients.py` with tenant/branch/region scoping
11. Implement `services/clients.py` with atomic transactions
12. Migrate Client ViewSet to new structure
13. Repeat for Visa, Application models

**Phase D - Notifications** (P2 - User Story 3):
14. Create `models/notification.py` with scoping fields
15. Implement `services/notifications.py` for event-driven notification creation
16. Create SSE endpoint at `/api/v1/notifications/stream/`
17. Remove Django Channels (consumers.py, ASGI config)

**Phase E - API Standardization** (P2 - User Story 4):
18. Restructure URLs to `/api/v1/` pattern
19. Configure drf-spectacular
20. Generate OpenAPI spec
21. Standardize pagination across all endpoints

**Phase F - Development Tools** (P3 - User Stories 5 & 6):
22. Create `management/commands/seed_data.py`
23. Squash migrations to `0001_initial.py`
24. Apply Black/Ruff formatting

### Testing Strategy (Out of Scope, but documented for reference)

While test implementation is excluded per requirements, the refactored structure enables:

- **Unit tests**: Service/selector functions (pure business logic)
- **Integration tests**: API endpoints with permission checks
- **Contract tests**: OpenAPI spec validation
- **E2E tests**: Full user journeys per acceptance scenarios

Future test implementation should prioritize:
1. Permission system (all role/scope combinations)
2. User creation hierarchy enforcement
3. Tenant data isolation
4. Soft deletion filtering

---

## Success Metrics (from Spec)

Post-refactoring verification checklist:

- [ ] **SC-001**: Role-based data filtering 100% accurate (manual verification across all roles)
- [ ] **SC-002**: All endpoints follow `/api/v1/` pattern (automated URL audit)
- [ ] **SC-003**: OpenAPI spec generated without manual edits (drf-spectacular validation)
- [ ] **SC-004**: Pagination consistent across endpoints (automated check)
- [ ] **SC-005**: SSE notifications <2s delivery (load testing)
- [ ] **SC-006**: Seed data command <60s execution (timer)
- [ ] **SC-007**: Soft-deleted records excluded in queries (query inspection)
- [ ] **SC-008**: No privilege escalation possible (security audit)
- [ ] **SC-009**: Zero cross-tenant data leakage (tenant isolation test)
- [ ] **SC-010**: Atomic transactions rollback on error (error injection test)
- [ ] **SC-011**: Migrations reduced to 1 file per app (file count)
- [ ] **SC-012**: Black/Ruff compliance 100% (linter run)
- [ ] **SC-013**: 80%+ business logic in services/selectors (code coverage analysis)

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Migration squashing data loss | **Critical** | Low | Full backup, staging test, incremental squashing, rollback plan |
| Breaking API changes during refactor | **High** | Medium | Maintain backward compatibility, version URLs, gradual migration |
| Permission system bugs (data leakage) | **Critical** | Medium | Comprehensive manual testing of all role combinations, security review |
| SSE connection scaling issues | Medium | Low | Connection pooling, Nginx configuration, load testing before production |
| Service layer over-engineering | Low | Medium | Start simple, refactor only where business logic exists, avoid premature abstraction |

---

## Dependencies & Prerequisites

**Before Starting Implementation**:

1. ✅ Feature specification approved
2. ✅ Implementation plan reviewed
3. ⏳ Full database backup created
4. ⏳ Development environment set up with:
   - Python 3.8+
   - PostgreSQL with copy of production data
   - All requirements.txt dependencies installed
   - drf-spectacular added to requirements
5. ⏳ Staging environment configured for testing
6. ⏳ Current migration state documented

**External Dependencies** (from spec):
- ✅ D-001: Access to existing codebase (have it)
- ⏳ D-002: Documentation of tenant/branch/region structure (needs creation)
- ⏳ D-003: List of current roles and permissions (needs documentation)
- ✅ D-004: Development environment with Python/Django/PostgreSQL (can set up)
- ⏳ D-005: drf-spectacular library (needs installation)
- ⏳ D-006: Understanding of WebSocket implementation (needs code review)

---

## Timeline Estimate (Not a commitment, for planning only)

**Assumptions**: 
- Single developer, full-time
- Existing codebase familiarity
- No unexpected blockers

| Phase | Estimated Duration | Key Deliverables |
|-------|-------------------|------------------|
| Phase A - Foundation | 3-5 days | Base models, Tenant/User extensions |
| Phase B - Permissions | 5-7 days | Permission classes, user service layer |
| Phase C - Data Access | 10-15 days | Selectors/services for all models, ViewSet migration |
| Phase D - Notifications | 3-5 days | SSE endpoint, Channels removal |
| Phase E - API Standardization | 3-5 days | URL restructure, OpenAPI generation |
| Phase F - Dev Tools | 2-3 days | Seed command, migration squashing, formatting |
| **Total** | **26-40 days** | Fully refactored codebase |

Add 20-30% buffer for testing, code review, and unexpected issues.

---

## Next Steps

1. ✅ Review this implementation plan
2. ⏳ Run `/speckit.tasks` to generate detailed task breakdown
3. ⏳ Create database backup
4. ⏳ Set up development environment per quickstart.md
5. ⏳ Begin Phase A implementation (Foundation)

**Ready for Phase 2 (Task Breakdown)**: Yes - run `/speckit.tasks` to continue
