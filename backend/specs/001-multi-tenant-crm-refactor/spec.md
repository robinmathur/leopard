# Feature Specification: Multi-Tenant CRM Refactoring and Standardization

**Feature Branch**: `001-multi-tenant-crm-refactor`  
**Created**: Fri Dec 05 2025  
**Status**: Draft  
**Input**: Complete refactoring and standardization of a Django/DRF multi-tenant CRM application for immigration agents, focusing on clean architecture, role-based permissions, and maintainable code structure.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role-Based Data Access and Filtering (Priority: P1)

Immigration consultants, branch administrators, and regional managers need to access only the data relevant to their organizational scope to maintain data privacy and operational efficiency.

**Why this priority**: This is the foundational requirement for a multi-tenant system. Without proper data scoping, the system cannot operate securely or effectively. All other features depend on proper role-based access control.

**Independent Test**: Can be fully tested by creating users with different roles (Consultant, Branch Admin, Region Manager) and verifying that each user can only view and edit data within their assigned scope (branch, region, or tenant-wide).

**Acceptance Scenarios**:

1. **Given** a Consultant assigned to Branch A, **When** they request the list of clients, **Then** they see only clients assigned to Branch A
2. **Given** a Branch Admin managing Branch B, **When** they attempt to access Branch C's data, **Then** the system denies access with an appropriate error message
3. **Given** a Region Manager responsible for Region 1 (containing Branch A and B), **When** they request visa applications, **Then** they see all applications from Branch A and Branch B but not from other regions
4. **Given** a Country Manager, **When** they access the system, **Then** they can view all data within their tenant across all branches and regions
5. **Given** a Super Super Admin, **When** they create a new user, **Then** they can only create users with Super Admin role and cannot create lower-level roles directly

---

### User Story 2 - Hierarchical User Creation and Management (Priority: P1)

System administrators and managers need to create and manage users according to a strict role hierarchy to maintain organizational structure and security boundaries.

**Why this priority**: User management is critical for onboarding new team members and maintaining system security. The role hierarchy ensures that only authorized personnel can create users at appropriate levels, preventing privilege escalation.

**Independent Test**: Can be fully tested by creating users at each role level and verifying that they can only create users at the next level down in the hierarchy (e.g., Super Admin creates Country Manager, Country Manager creates Region Manager, etc.).

**Acceptance Scenarios**:

1. **Given** a Super Super Admin user, **When** they attempt to create a new user, **Then** they can only select "Super Admin" as the role
2. **Given** a Region Manager user, **When** they create a Branch Admin, **Then** the system requires them to assign a branch within their managed region
3. **Given** a Branch Admin user, **When** they create a Consultant, **Then** the Consultant is automatically assigned to the Branch Admin's branch
4. **Given** a Consultant user, **When** they access user creation functionality, **Then** the system prevents access with a permission error
5. **Given** a Region Manager managing Region 1, **When** they attempt to create a Branch Admin for Branch X in Region 2, **Then** the system denies the operation

---

### User Story 3 - Real-Time Notification Delivery (Priority: P2)

Users need to receive instant notifications about important events (task assignments, visa expiry alerts, application updates) without polling the server to stay informed and respond promptly.

**Why this priority**: Real-time notifications improve user experience and operational efficiency by ensuring users are immediately aware of critical events. This is lower priority than access control but essential for daily operations.

**Independent Test**: Can be fully tested by triggering notification events (assigning a task, updating visa status) and verifying that the affected user receives the notification in real-time through the SSE connection.

**Acceptance Scenarios**:

1. **Given** a user is connected to the notification stream, **When** a task is assigned to them, **Then** they receive a notification within 2 seconds containing task details
2. **Given** multiple users with different roles, **When** a visa expiry alert is generated for a client, **Then** only users with access to that client's branch receive the notification
3. **Given** a user's notification connection is interrupted, **When** they reconnect to the stream, **Then** they receive any notifications that were generated during the disconnection
4. **Given** a user is not authenticated, **When** they attempt to connect to the notification stream, **Then** the system denies access with an authentication error

---

### User Story 4 - Consistent API Structure and Documentation (Priority: P2)

Developers and third-party integrators need a well-documented, consistent API structure to build integrations and maintain the system efficiently.

**Why this priority**: API standardization reduces development time, prevents errors, and enables easier integration with external systems. While important for long-term maintainability, it doesn't affect core business operations directly.

**Independent Test**: Can be fully tested by reviewing the generated OpenAPI specification and verifying that all endpoints follow the standardized URL pattern, include proper authentication headers, and return consistent response structures.

**Acceptance Scenarios**:

1. **Given** any list endpoint in the API, **When** a request is made without pagination parameters, **Then** the response includes 25 items per page by default with pagination metadata
2. **Given** the OpenAPI specification, **When** reviewing any endpoint, **Then** it includes complete request/response schemas, authentication requirements, and human-readable descriptions
3. **Given** any resource endpoint, **When** accessing it, **Then** the URL follows the pattern `/api/v1/{resource-plural}/{id}/`
4. **Given** nested resources (e.g., clients within a branch), **When** accessing them, **Then** the URL follows the pattern `/api/v1/branches/{branch_id}/clients/`

---

### User Story 5 - Data Integrity and Soft Deletion (Priority: P3)

System administrators need to maintain data integrity across tenant boundaries and recover accidentally deleted records to prevent data loss and support compliance requirements.

**Why this priority**: While important for data safety, soft deletion is a recovery mechanism that isn't required for day-to-day operations. It provides a safety net but doesn't affect core functionality.

**Independent Test**: Can be fully tested by soft-deleting a client record, verifying it doesn't appear in normal queries, then restoring it using admin tools and confirming it reappears in the system.

**Acceptance Scenarios**:

1. **Given** a client record, **When** an admin performs a delete operation, **Then** the record is soft-deleted and no longer appears in standard queries
2. **Given** a soft-deleted client, **When** querying with "include_deleted=true" flag, **Then** the system returns both active and soft-deleted records
3. **Given** soft-deleted records exist, **When** running standard business reports, **Then** the reports exclude soft-deleted records by default
4. **Given** referential integrity between entities, **When** a soft-deleted parent record is restored, **Then** all related child records are also visible again

---

### User Story 6 - Seed Data for Testing and Development (Priority: P3)

Developers and testers need realistic sample data in development environments to test features, validate workflows, and demonstrate functionality.

**Why this priority**: Seed data accelerates development and testing but isn't required for production operation. It's valuable for development environments but doesn't affect end-user functionality.

**Independent Test**: Can be fully tested by running the seed_data management command on a fresh database and verifying that all required entities (tenants, branches, users, clients, applications) are created with realistic relationships.

**Acceptance Scenarios**:

1. **Given** a fresh database, **When** the seed_data command is executed, **Then** the system creates 3 tenants with 2 branches each
2. **Given** the seed data is generated, **When** listing users, **Then** the system contains at least one user for each defined role (Super Super Admin through Consultant)
3. **Given** the seed data includes clients, **When** testing pagination, **Then** there are sufficient client records (50+) to test multi-page navigation
4. **Given** seed data is generated, **When** testing role-based filtering, **Then** each branch contains clients, applications, and tasks with proper foreign key relationships

---

### Edge Cases

- What happens when a Region Manager is reassigned to a different region with existing Branch Admins they previously created?
- How does the system handle soft-deleted records that have foreign key relationships to active records?
- What happens when an SSE connection is lost and reconnected multiple times in rapid succession?
- How does the system handle a user attempting to create another user at their own role level (horizontal creation)?
- What happens when pagination is requested beyond the total number of available pages?
- How does the system handle concurrent modifications to the same client record by users in different roles?
- What happens when a tenant's database schema is corrupted or unavailable?
- How does the system handle notification delivery when thousands of users are connected simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

#### Architectural Standardization

- **FR-001**: System MUST separate business logic into dedicated selector.py files for read operations and services.py files for write/mutation operations
- **FR-002**: System MUST organize API-related code (views, serializers, routers) within dedicated api/v1/ directories within each Django app
- **FR-003**: System MUST use dataclasses or Pydantic models for defining input/output data shapes in services to ensure type safety
- **FR-004**: System MUST follow PEP 8 naming conventions with snake_case for functions/variables/files and PascalCase for classes
- **FR-005**: System MUST wrap all multi-step database operations within atomic transactions using Django's transaction.atomic()

#### Multi-Tenancy & Data Scoping

- **FR-006**: System MUST scope all queries for tenant-specific models (Client, Visa, Application) by the current Tenant and Branch where applicable
- **FR-007**: System MUST prevent users from accessing or modifying data outside their assigned tenant boundary
- **FR-008**: System MUST prevent users from accessing or modifying data outside their role-defined scope (branch, region, or tenant-wide)
- **FR-009**: System MUST maintain tenant isolation at the database schema level or through query filtering on all operations

#### Role-Based Access Control

- **FR-010**: System MUST enforce a strict role hierarchy: Super Super Admin → Super Admin → Country Manager → Region Manager → Branch Admin → Consultant
- **FR-011**: System MUST prevent users from creating users at their own role level or higher
- **FR-012**: Super Super Admin users MUST only be able to create Super Admin users
- **FR-013**: Super Admin users MUST only be able to create Country Manager users
- **FR-014**: Country Manager users MUST only be able to create Region Manager users
- **FR-015**: Region Manager users MUST only be able to create Branch Admin users for branches within their assigned region
- **FR-016**: Branch Admin users MUST only be able to create Consultant users for their specific branch
- **FR-017**: Consultant users MUST NOT have permission to create any users
- **FR-018**: System MUST implement granular permissions using custom DRF BasePermission classes that check role and scope on every API request
- **FR-019**: Consultant and Branch Admin users MUST only access data tied to their assigned branch(es)
- **FR-020**: Region Manager users MUST only access data across all branches within their assigned region
- **FR-021**: Country Manager and Super Admin users MUST have full access to all data within their tenant
- **FR-022**: System MUST deny API requests with a 403 Forbidden response when users lack the necessary role or scope

#### Database Schema & Soft Deletion

- **FR-023**: System MUST implement soft deletion functionality through a reusable SoftDeletionModel abstract base class or mixin
- **FR-024**: System MUST automatically filter out soft-deleted records in all standard queries unless explicitly requested with include_deleted flag
- **FR-025**: All branch-specific entity models (Client, Visa, Application, etc.) MUST include foreign keys to both Tenant and Branch
- **FR-026**: System MUST squash all existing migrations into a single 0001_initial.py migration file per app
- **FR-027**: System MUST maintain referential integrity between related entities when performing soft deletion operations

#### Data Seeding

- **FR-028**: System MUST provide a custom Django management command named seed_data that populates the database with test data
- **FR-029**: The seed_data command MUST create at least 3 Tenant entities with realistic attributes
- **FR-030**: The seed_data command MUST create at least 2 Branch entities per Tenant with proper foreign key relationships
- **FR-031**: The seed_data command MUST create one user for each role in the hierarchy: Super Super Admin, Super Admin, Country Manager, Region Manager, Branch Admin, and Consultant
- **FR-032**: The seed_data command MUST assign appropriate roles and permissions to each seeded user
- **FR-033**: The seed_data command MUST create sufficient Client, Visa, Application, and Task entities (at least 50 clients) to test pagination effectively
- **FR-034**: The seed_data command MUST establish realistic relationships between seeded entities (e.g., clients assigned to branches, applications linked to clients)

#### API Standardization

- **FR-035**: System MUST standardize all API URLs to follow the pattern /api/v1/{resource-plural}/{pk}/
- **FR-036**: System MUST support nested resource URLs following the pattern /api/v1/{parent-resource}/{parent-id}/{child-resource}/
- **FR-037**: System MUST explicitly version all APIs with "v1" in the URL path
- **FR-038**: System MUST implement all views using DRF ViewSets (ModelViewSet) and generic mixins for code reuse
- **FR-039**: System MUST implement pagination on all list endpoints with a default page size of 25 items
- **FR-040**: System MUST return pagination metadata including total count, next/previous page URLs, and current page number
- **FR-041**: System MUST generate an OpenAPI 3.0 specification using drf-spectacular or equivalent tooling
- **FR-042**: The OpenAPI specification MUST include complete request/response schemas for all endpoints
- **FR-043**: The OpenAPI specification MUST document the authentication method (Bearer Token)
- **FR-044**: The OpenAPI specification MUST include clear summaries and descriptions for all paths and operations

#### Real-Time Notifications (SSE)

- **FR-045**: System MUST replace any existing WebSocket implementation with Server-Sent Events (SSE) for unidirectional server-to-client messaging
- **FR-046**: System MUST provide an authenticated API endpoint at /api/v1/notifications/stream/ that streams notifications via SSE
- **FR-047**: System MUST generate notifications automatically upon key events including Task Assigned, Visa Expiry Alert, and Application Status Change
- **FR-048**: System MUST scope notification delivery to only deliver notifications to users who have permission to access the related entity
- **FR-049**: Notification entities MUST include fields for: recipient user, notification type, message content, related entity reference, timestamp, and read status
- **FR-050**: System MUST authenticate SSE connections and reject unauthenticated requests
- **FR-051**: System MUST deliver notifications to connected clients within 2 seconds of the triggering event

#### Code Quality & Consistency

- **FR-052**: System MUST apply consistent code formatting using Black or Ruff formatting standards
- **FR-053**: System MUST use explicit imports and avoid wildcard imports throughout the codebase
- **FR-054**: System MUST maintain the existing project's operational functionality while applying refactoring changes
- **FR-055**: System MUST be runnable in a standard Python/Django environment without Firebase configuration variables

### Key Entities

- **Tenant**: Represents an independent organization (immigration agency) using the system. Contains branches, users, and all business entities. Key attributes: name, domain, subscription status, settings.

- **Branch**: Represents a physical or logical office location within a Tenant. Key attributes: name, phone, website, address, assigned region. Related to: Tenant (parent), Users (assigned staff), Clients (managed clients).

- **User**: Represents system users with role-based access. Key attributes: username, email, role (Super Super Admin, Super Admin, Country Manager, Region Manager, Branch Admin, Consultant), assigned tenant, assigned branch(es), assigned region. Related to: Tenant, Branch.

- **Client**: Represents an immigration client seeking services. Key attributes: name, date of birth, contact information, address, passport details, visa category, assigned consultant, current stage, active status. Related to: Tenant, Branch, Agent, Visa Category, Applications, Tasks.

- **Visa Category**: Represents types of visa classifications (e.g., work visa, student visa, permanent residence). Key attributes: name, code, description.

- **Visa Application**: Represents a formal visa application submitted for a client. Key attributes: application type, application stage, status, submission date, decision date, assigned user, sub-agent. Related to: Client, Application Type, Application Stage, Visa Type.

- **Application Type**: Represents categories of applications (e.g., new application, renewal, appeal). Key attributes: name, description.

- **Application Stage**: Represents workflow stages in the application process (e.g., documentation, submission, awaiting decision). Key attributes: name, order, description.

- **Agent**: Represents external agents or sub-agents referring clients. Key attributes: name, agent type, contact information, address. Related to: Clients (referred clients).

- **Task**: Represents work items assigned to users. Key attributes: title, description, due date, assigned user, priority, status, related entity. Related to: User (assignee), Client or Application (contextual entity).

- **Notification**: Represents system-generated alerts for users. Key attributes: recipient user, notification type, message, related entity reference, timestamp, read status, delivery status.

- **Reminder**: Represents user-created reminders for follow-ups. Key attributes: title, reminder date, related entity, created by. Related to: Client or other entities (polymorphic).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully filter and access data according to their role (Branch Admin sees only their branch data, Region Manager sees their region's data) with 100% accuracy in access control checks

- **SC-002**: All API endpoints follow the standardized URL pattern /api/v1/{resource-plural}/{id}/ with zero exceptions

- **SC-003**: The system generates a complete OpenAPI 3.0 specification that accurately documents all endpoints, schemas, and authentication requirements without manual corrections

- **SC-004**: All list endpoints support pagination with consistent behavior, returning 25 items per page by default and proper pagination metadata

- **SC-005**: Users receive real-time notifications within 2 seconds of triggering events 95% of the time

- **SC-006**: The seed_data management command successfully populates a fresh database with all required test entities in under 60 seconds

- **SC-007**: Soft-deleted records are automatically excluded from 100% of standard queries unless explicitly requested

- **SC-008**: Role hierarchy enforcement prevents unauthorized user creation attempts with a 0% failure rate (no privilege escalation)

- **SC-009**: The system maintains 100% tenant data isolation with zero cross-tenant data leakage

- **SC-010**: All multi-step database operations complete successfully or fully rollback with no partial data states

- **SC-011**: Migration squashing reduces the number of migration files from 35+ to a single 0001_initial.py per app without data loss

- **SC-012**: Code formatting compliance reaches 100% when checked against Black/Ruff standards

- **SC-013**: Business logic extraction moves at least 80% of query and mutation logic from views/serializers into dedicated selectors.py and services.py files

## Assumptions

- **A-001**: The current system uses Django's default User model or a custom user model that extends AbstractUser or AbstractBaseUser
- **A-002**: The system uses JWT tokens (via djangorestframework-simplejwt) for API authentication
- **A-003**: The existing database contains production data that must not be lost during migration squashing (will require careful migration strategy)
- **A-004**: Python 3.8+ and Django 3.2+ (or Django 4.x) are the target versions for this refactoring
- **A-005**: The current multi-tenancy implementation uses a single shared database with tenant scoping via foreign keys (not separate databases per tenant)
- **A-006**: The system will continue to use PostgreSQL as the database backend
- **A-007**: Real-time notification requirements can be satisfied with SSE (no need for bidirectional WebSocket communication)
- **A-008**: The system will be deployed behind a reverse proxy (Nginx) that can handle SSE connections with appropriate timeout settings
- **A-009**: Regions are geographic or organizational groupings of branches (e.g., "North Region" contains Branch A and Branch B)
- **A-010**: Current codebase uses Django Channels for WebSocket notifications which can be safely removed in favor of SSE
- **A-011**: Standard HTTP session or JWT-based authentication is sufficient for SSE endpoint authentication
- **A-012**: The system requires read-after-write consistency but not strict serializability for most operations

## Out of Scope

- **OS-001**: Migrating to a separate database per tenant (staying with shared database + tenant scoping)
- **OS-002**: Implementing automated test suites (testing infrastructure is explicitly excluded per requirements)
- **OS-003**: Building a frontend application or modifying existing frontend code
- **OS-004**: Implementing two-way real-time communication (only server-to-client SSE notifications)
- **OS-005**: Data migration tools for transferring data between tenants
- **OS-006**: Advanced analytics and reporting dashboards
- **OS-007**: Third-party integrations with external services (email, SMS, payment gateways, government visa systems)
- **OS-008**: Implementing GraphQL API alongside REST API
- **OS-009**: Setting up CI/CD pipelines or deployment automation
- **OS-010**: Performance optimization beyond standard Django best practices
- **OS-011**: Implementing audit logging for all database changes
- **OS-012**: Building admin tools for managing soft-deleted records
- **OS-013**: Internationalization (i18n) and localization (l10n) support
- **OS-014**: Mobile-specific API endpoints or mobile app development
- **OS-015**: Implementing rate limiting or advanced API throttling

## Dependencies

- **D-001**: Access to existing codebase and database schema
- **D-002**: Documentation of current tenant/branch/region organizational structure
- **D-003**: List of current user roles and their intended permissions (for validation against requirements)
- **D-004**: Development environment with Python 3.8+, Django, PostgreSQL setup
- **D-005**: Availability of drf-spectacular or equivalent OpenAPI generation library
- **D-006**: Understanding of existing WebSocket/Channels implementation to safely remove it

## Constraints

- **C-001**: Refactoring must maintain full operational functionality at all times (no breaking changes to existing features)
- **C-002**: Cannot require changes to the deployment infrastructure or database system
- **C-003**: Must work in a standard Python/Django environment without Firebase dependencies
- **C-004**: Migration squashing must preserve all existing production data
- **C-005**: Cannot introduce new paid third-party services or libraries without approval
- **C-006**: Must maintain backward compatibility with existing API clients during transition period
- **C-007**: SSE implementation must work with standard HTTP/HTTPS without requiring WebSocket infrastructure

## Related Documentation

- Django Multi-Tenancy Patterns: https://books.agiliq.com/projects/django-multi-tenant/en/latest/
- DRF Best Practices: https://www.django-rest-framework.org/topics/best-practices/
- SSE with Django: https://djangostars.com/blog/server-sent-events-django/
- Clean Architecture in Django: https://www.hacksoft.io/blog/styleguide
