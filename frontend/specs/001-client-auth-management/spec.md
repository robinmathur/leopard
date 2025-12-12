# Feature Specification: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "Mock server setup, login API integration with permissions, and client management with state workflow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Login and Permission Loading (Priority: P1)

As a user, I want to log in to the application using my credentials and have my permissions automatically loaded so that I can access features appropriate to my role throughout my session.

**Why this priority**: Authentication is the foundational requirement - no other functionality can work without secure login and permission-based access control. This enables the entire RBAC system to function.

**Independent Test**: Can be fully tested by entering valid credentials and verifying that the user sees appropriate navigation options and can access permitted features.

**Acceptance Scenarios**:

1. **Given** I am on the login page with valid credentials, **When** I enter my username and password and submit, **Then** I receive access and refresh tokens and am redirected to the dashboard with my permissions loaded.

2. **Given** I have an expired access token, **When** I attempt to access a protected resource, **Then** the system automatically refreshes my token using the refresh token without requiring me to log in again.

3. **Given** I enter invalid credentials, **When** I submit the login form, **Then** I see a clear error message indicating the login failed without exposing security details.

4. **Given** I am logged in, **When** I access any page, **Then** my permissions are available to control what actions and navigation items I can see.

---

### User Story 2 - User Logout with Permission Flush (Priority: P1)

As a user, I want to log out of the application and have all my session data including permissions cleared so that my account remains secure and permissions are freshly fetched on my next login.

**Why this priority**: Security-critical feature that ensures no stale permissions persist and forces fresh permission fetch on each login. Tied directly to the login feature.

**Independent Test**: Can be fully tested by logging out and verifying that attempting to access protected routes redirects to login, and re-logging in fetches fresh permissions.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I click the logout button, **Then** I am logged out, all tokens are cleared, and permissions are flushed from the application state.

2. **Given** I have logged out, **When** I try to access a protected page, **Then** I am redirected to the login page.

3. **Given** I have logged out and my permissions were cached, **When** I log back in, **Then** my permissions are freshly fetched from the server (not from cache).

---

### User Story 3 - View All Clients List (Priority: P2)

As a consultant or administrator, I want to view a list of all clients I have access to so that I can manage my client portfolio efficiently.

**Why this priority**: Client listing is the primary interface for client management - users need to see clients before they can take actions on them.

**Independent Test**: Can be fully tested by navigating to the Clients page and verifying the list displays with pagination, filters, and client data.

**Acceptance Scenarios**:

1. **Given** I am logged in with appropriate permissions, **When** I navigate to the Clients tab, **Then** I see a list of all clients I have access to based on my role scope.

2. **Given** the client list has more than one page of results, **When** I navigate through pages, **Then** I can view all clients using pagination controls.

3. **Given** I am viewing the client list, **When** I look at each row, **Then** I see four action buttons: Edit, Delete, View, and Move.

---

### User Story 4 - Add New Client (Priority: P2)

As a consultant or administrator, I want to add new clients to the system so that I can track and manage their immigration journey from the beginning.

**Why this priority**: Adding clients is essential for growing the client base and must be available alongside viewing clients.

**Independent Test**: Can be fully tested by clicking Add Client, filling the form with valid data, submitting, and verifying the new client appears in the list.

**Acceptance Scenarios**:

1. **Given** I am on the Clients page with create permission, **When** I click the "Add Client" button, **Then** a form opens allowing me to enter client details.

2. **Given** I am filling the Add Client form, **When** I submit with valid required fields (first name, country, gender), **Then** the client is created with default stage "Lead" and I see a success message.

3. **Given** I am filling the Add Client form, **When** I submit with missing required fields, **Then** I see validation errors indicating which fields are required.

4. **Given** I have just created a client, **When** I return to the client list, **Then** the new client appears in the list.

---

### User Story 5 - Edit Client Details (Priority: P2)

As a consultant or administrator, I want to edit existing client information so that I can keep client records accurate and up-to-date.

**Why this priority**: Data accuracy is critical for client management. Editing is a core CRUD operation.

**Independent Test**: Can be fully tested by clicking Edit on a client row, modifying fields, saving, and verifying the changes persist.

**Acceptance Scenarios**:

1. **Given** I am viewing the client list, **When** I click the Edit icon on a client row, **Then** a modal/dialog opens with the client's current information pre-filled.

2. **Given** I am editing a client, **When** I modify fields and save, **Then** the changes are saved and I see a success message.

3. **Given** I am editing a client, **When** I click cancel, **Then** the dialog closes without saving changes.

---

### User Story 6 - Delete Client (Priority: P2)

As an administrator, I want to delete clients with confirmation so that I can remove records while preventing accidental deletions.

**Why this priority**: Data management requires ability to remove records, but must be protected against accidents.

**Independent Test**: Can be fully tested by clicking Delete, confirming in the dialog, and verifying the client no longer appears in the list.

**Acceptance Scenarios**:

1. **Given** I am viewing the client list with delete permission, **When** I click the Delete icon on a client row, **Then** a confirmation dialog appears asking me to confirm the deletion.

2. **Given** the delete confirmation dialog is open, **When** I confirm the deletion, **Then** the client is soft-deleted and removed from the visible list.

3. **Given** the delete confirmation dialog is open, **When** I cancel, **Then** the dialog closes and the client remains in the list.

---

### User Story 7 - View Client Full Details (Priority: P3)

As a consultant or administrator, I want to view complete client details in a dedicated page so that I can see all information without editing.

**Why this priority**: Full detail view supports thorough review but is secondary to list and basic CRUD operations.

**Independent Test**: Can be fully tested by clicking View on a client row and verifying all client fields are displayed in a read-only format.

**Acceptance Scenarios**:

1. **Given** I am viewing the client list, **When** I click the View icon on a client row, **Then** I am taken to a full-page view showing all client details.

2. **Given** I am viewing a client's full details, **When** I want to return to the list, **Then** I can navigate back using a back button or navigation.

---

### User Story 8 - Move Client Through State Workflow (Priority: P3)

As a consultant or administrator, I want to move clients through their lifecycle stages so that I can track their progression from Lead to Close.

**Why this priority**: State management is important for workflow but depends on basic client management being in place.

**Independent Test**: Can be fully tested by clicking Move on a client, selecting next stage, and verifying the stage updates in the list.

**Acceptance Scenarios**:

1. **Given** I am viewing a client in "Lead" stage, **When** I click the Move icon, **Then** I can advance the client to "Follow Up" stage.

2. **Given** I am viewing a client in "Follow Up" stage, **When** I click the Move icon, **Then** I can advance the client to "Client" stage.

3. **Given** I am viewing a client in "Client" stage, **When** I click the Move icon, **Then** I can advance the client to "Close" stage.

4. **Given** I am viewing a client in "Close" stage, **When** I view the Move icon, **Then** the Move action is disabled or hidden since this is the final stage.

5. **Given** I have moved a client to a new stage, **When** I view the client list, **Then** the client's stage is updated and reflected in the list.

---

### User Story 9 - Mock Server for Development (Priority: P3)

As a developer, I want to run a mock server that simulates the backend API so that I can develop and test frontend features without requiring the actual backend.

**Why this priority**: Development tooling that supports all other features but doesn't impact end-user functionality.

**Independent Test**: Can be fully tested by starting the mock server and making requests to verify responses match the OpenAPI specification.

**Acceptance Scenarios**:

1. **Given** I want to develop frontend features, **When** I run the mock server command, **Then** a server starts that responds to API endpoints defined in the OpenAPI spec.

2. **Given** the mock server is running, **When** I make requests to authentication endpoints, **Then** I receive valid mock token responses.

3. **Given** the mock server is running, **When** I make requests to client endpoints, **Then** I receive realistic mock client data.

---

### Edge Cases

- What happens when token refresh fails? User should be redirected to login with a session expired message.
- What happens when attempting to move a client that was already moved by another user? System should show the current state and allow retry.
- What happens when deleting a client that has associated visa applications? The soft delete should preserve relationships for data integrity.
- What happens when network connection is lost during an operation? User should see an appropriate error message with retry option.
- What happens when a user's permissions change while they are logged in? Permissions should be re-fetched on next page navigation or after a reasonable interval.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Permissions:**
- **FR-001**: System MUST provide a login form accepting username and password credentials
- **FR-002**: System MUST request and store JWT access and refresh tokens upon successful login
- **FR-003**: System MUST automatically refresh the access token when it expires using the refresh token
- **FR-004**: System MUST fetch user permissions immediately after successful authentication
- **FR-005**: System MUST store permissions in application state for use throughout the session
- **FR-006**: System MUST clear all tokens and permissions from state when user logs out
- **FR-007**: System MUST redirect unauthenticated users to the login page when accessing protected routes
- **FR-008**: System MUST force a fresh permission fetch on every new login (no permission caching across sessions)

**Client List Management:**
- **FR-009**: System MUST display a paginated list of clients accessible to the logged-in user based on their role scope
- **FR-010**: System MUST rename the "Active" tab to "All Clients" in the Clients page
- **FR-011**: System MUST display four action icons on each client row: Edit, Delete, View, and Move
- **FR-012**: System MUST respect role-based access control for all client operations

**Client CRUD Operations:**
- **FR-013**: System MUST provide an "Add Client" button that opens a form for creating new clients
- **FR-014**: System MUST validate required fields (first name, country, gender) before creating a client
- **FR-015**: System MUST set new clients to "Lead" stage by default
- **FR-016**: Edit icon MUST open a modal/dialog with pre-filled client information for editing
- **FR-017**: Delete icon MUST show a confirmation dialog before performing soft delete
- **FR-018**: View icon MUST navigate to a full-page view of client details
- **FR-019**: System MUST display success/error feedback messages after CRUD operations

**Client State Workflow:**
- **FR-020**: System MUST support client stages: Lead (LE) -> Follow Up (FU) -> Client (CT) -> Close (CL)
- **FR-021**: Move icon MUST advance client to the next stage in the workflow
- **FR-022**: Move action MUST be disabled or hidden for clients in "Close" stage
- **FR-023**: System MUST update the client's stage immediately after a successful move operation

**Mock Server:**
- **FR-024**: System MUST provide a mock server module that runs independently
- **FR-025**: Mock server MUST implement endpoints defined in the OpenAPI specification
- **FR-026**: Mock server MUST return realistic dummy data for development testing

### Key Entities

- **User**: Represents system users with authentication credentials and role assignments. Has permissions derived from group membership (Super Super Admin, Super Admin, Region Manager, Branch Admin, Consultant).

- **Client**: Represents a potential or active immigration client. Key attributes include: name, contact info, country, stage (Lead/Follow Up/Client/Close), assigned consultant, and visa category. Clients progress through stages during their immigration journey.

- **Permission**: Represents access rights associated with user roles. Determines what actions a user can perform (view, create, edit, delete) on various resources.

- **Token**: JWT tokens (access and refresh) used for authentication. Access tokens are short-lived; refresh tokens enable seamless session extension.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the login process and access the dashboard within 5 seconds under normal network conditions
- **SC-002**: Permission-based UI elements (buttons, menu items) display correctly 100% of the time based on user's actual permissions
- **SC-003**: Users can view the client list and load first page of results within 3 seconds
- **SC-004**: Users can add a new client through the form and see it in the list within 5 seconds of submission
- **SC-005**: Users can edit client information and see changes reflected immediately after save
- **SC-006**: Delete confirmation prevents accidental deletions - 100% of deletes require explicit confirmation
- **SC-007**: Client stage transitions complete within 2 seconds and update the UI immediately
- **SC-008**: Session logout completely clears authentication state - verified by inability to access protected routes after logout
- **SC-009**: Mock server responds to all defined endpoints with valid mock data for development testing
- **SC-010**: Token refresh happens transparently without user intervention or visible delay

## Assumptions

- The backend API follows the OpenAPI specification provided in `dev/openapi-spec.yaml`
- JWT tokens follow standard JWT format with exp claim for expiration checking
- The client stage workflow is strictly linear (Lead -> Follow Up -> Client -> Close) with no backward transitions
- Role-based filtering is handled by the backend API - frontend receives only accessible data
- Soft delete is the standard deletion method; clients are not permanently removed
- The mock server will be used only for development and will not be deployed to production
- Users have modern browsers that support ES6+ JavaScript features
