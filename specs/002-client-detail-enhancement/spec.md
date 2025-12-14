# Feature Specification: Enhanced Client Detail Page

**Feature Branch**: `002-client-detail-enhancement`  
**Created**: 2025-12-13  
**Status**: Draft  
**Input**: User description: "Enhance the Client Detail page with comprehensive client management features including overview, timeline, passport, language proficiency, qualifications, visa applications, college applications, notes, tasks, profile picture, and reminders. Redesign Task and Notification systems for broader use cases."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Complete Client Overview (Priority: P1)

As a CRM user, I want to see a comprehensive overview of a client when I open their detail page, so I can quickly understand the client's status and key information at a glance.

**Why this priority**: The overview is the foundation of the client detail page - without it, users cannot effectively manage clients. This provides immediate value by consolidating scattered information into one view.

**Independent Test**: Can be fully tested by navigating to a client detail page and verifying all summary information (personal details, contact info, stage, assigned consultant, key dates) is visible. Delivers immediate value for daily client management.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they navigate to a client's detail page, **Then** they see a summary section showing client's name, photo placeholder, stage, assigned consultant, and last activity date
2. **Given** a client has incomplete information, **When** viewing the overview, **Then** empty fields show appropriate placeholders and do not break the layout
3. **Given** a user views the overview, **When** they click on stage badge, **Then** they can see stage history or initiate stage change (based on permissions)

---

### User Story 2 - Manage Client Notes (Priority: P1)

As a CRM user, I want to add, view, edit, and delete notes on a client's profile, so I can document important interactions and information about the client over time.

**Why this priority**: Notes are essential for day-to-day client communication tracking. Every user interaction typically results in a note, making this critical for CRM functionality.

**Independent Test**: Can be fully tested by creating, reading, updating, and deleting notes for a client. Delivers immediate value for tracking client communications.

**Acceptance Scenarios**:

1. **Given** a user is viewing a client detail page, **When** they click "Add Note", **Then** they can enter text and save a timestamped note
2. **Given** a client has existing notes, **When** viewing the notes section, **Then** notes are displayed in reverse chronological order with author and timestamp
3. **Given** a user has delete permission, **When** they click delete on a note, **Then** a confirmation dialog appears and the note is removed upon confirmation
4. **Given** a user lacks delete permission, **When** viewing notes, **Then** the delete option is not visible

---

### User Story 3 - View Client Timeline (Priority: P2)

As a CRM user, I want to see a chronological timeline of all activities and comments related to a client, so I can understand the complete history of interactions.

**Why this priority**: Timeline provides context for client relationship but requires notes to be functional first. Important for understanding client journey.

**Independent Test**: Can be tested by performing various actions on a client and verifying they appear in the timeline with correct timestamps and details.

**Acceptance Scenarios**:

1. **Given** a client has activity history, **When** viewing the timeline, **Then** activities appear in chronological order with type indicators (note, stage change, document upload, etc.)
2. **Given** a user adds a comment to the timeline, **When** they submit, **Then** the comment appears immediately with their name and timestamp
3. **Given** a user has delete_comment permission, **When** they attempt to delete a comment, **Then** they can remove their own comments

---

### User Story 4 - View and Manage Passport Details (Priority: P2)

As a CRM user, I want to view and update a client's passport information, so I can ensure accurate documentation for immigration processes.

**Why this priority**: Passport data is critical for immigration workflows. Using existing API, this is lower effort but high value.

**Independent Test**: Can be tested by viewing/editing passport details for a client. Delivers value for document management workflows.

**Acceptance Scenarios**:

1. **Given** a client has passport information, **When** viewing the passport section, **Then** passport number, country, nationality, issue date, and expiry date are displayed
2. **Given** a client has no passport on file, **When** viewing the passport section, **Then** an "Add Passport" option is shown
3. **Given** passport is expiring within 6 months, **When** viewing the passport section, **Then** a visual warning indicator is displayed

---

### User Story 5 - View and Manage Language Proficiency (Priority: P2)

As a CRM user, I want to view and manage a client's language test scores, so I can assess their eligibility for various visa/education programs.

**Why this priority**: Language proficiency is essential for immigration and education applications. Using existing API.

**Independent Test**: Can be tested by adding/viewing/editing language test results. Delivers value for eligibility assessment.

**Acceptance Scenarios**:

1. **Given** a client has language test results, **When** viewing the proficiency section, **Then** test name, overall score, and component scores (reading, writing, speaking, listening) are displayed
2. **Given** a user clicks "Add Test Result", **When** they complete the form, **Then** the new result is saved and displayed
3. **Given** multiple test results exist, **When** viewing the section, **Then** results are sorted by test date with the most recent first

---

### User Story 6 - View and Manage Qualifications (Priority: P2)

As a CRM user, I want to view and manage a client's educational qualifications, so I can assess eligibility for education and skilled migration pathways.

**Why this priority**: Educational qualifications are core to education applications and skilled migration. Using existing API.

**Independent Test**: Can be tested by adding/viewing/editing qualifications. Delivers value for application eligibility assessment.

**Acceptance Scenarios**:

1. **Given** a client has qualifications, **When** viewing the section, **Then** institution, degree, field of study, start date, and completion date are shown
2. **Given** a user adds a new qualification, **When** saved, **Then** it appears in the qualifications list
3. **Given** a qualification is in progress, **When** viewing, **Then** it shows "In Progress" status instead of completion date

---

### User Story 7 - Manage Visa Applications from Client Detail (Priority: P2)

As a CRM user, I want to view and manage all visa applications for a client from their detail page, so I can track their immigration journey without switching contexts.

**Why this priority**: Visa applications are core to the CRM. This integrates the existing visa management into client context for a unified experience.

**Independent Test**: Can be tested by creating/viewing/editing visa applications from client detail page. Delivers integrated workflow value.

**Acceptance Scenarios**:

1. **Given** a client has visa applications, **When** viewing the visa section, **Then** all applications are listed with visa type, status, and key dates
2. **Given** a user clicks "New Visa Application", **When** they complete the form, **Then** the application is created and linked to the client
3. **Given** a user clicks on a visa application, **When** the detail view opens, **Then** it shows the same information as the main Visa Application section (shared component)
4. **Given** a visa application status changes, **When** viewing the client detail, **Then** the updated status is reflected immediately

---

### User Story 8 - Manage College/Institute Applications from Client Detail (Priority: P2)

As a CRM user, I want to view and manage all college/institute applications for a client from their detail page, so I can track their education pathway alongside immigration.

**Why this priority**: Education applications are closely tied to student visa workflows. Integrates existing Application model into client context.

**Independent Test**: Can be tested by creating/viewing/editing college applications from client detail page.

**Acceptance Scenarios**:

1. **Given** a client has college applications, **When** viewing the applications section, **Then** all applications are listed with institute, course, status, and intake date
2. **Given** a user creates a new application, **When** saved, **Then** it appears in the client's application list
3. **Given** an application changes stage, **When** viewing client detail, **Then** the current stage is displayed with visual indication

---

### User Story 9 - View Client-Linked Tasks (Priority: P2)

As a CRM user, I want to see all tasks associated with a client on their detail page, so I can track pending work and deadlines.

**Why this priority**: Task visibility per client improves workflow management. Uses existing task API with client filtering.

**Independent Test**: Can be tested by creating tasks linked to a client and verifying they appear on the client detail page.

**Acceptance Scenarios**:

1. **Given** a client has linked tasks, **When** viewing the tasks section, **Then** tasks are displayed with title, status, priority, due date, and assignee
2. **Given** tasks have different statuses, **When** viewing, **Then** tasks are grouped or filterable by status (pending, in progress, completed)
3. **Given** a user clicks on a task, **When** the task detail opens, **Then** they can view and update the task

---

### User Story 10 - Upload and View Client Profile Picture (Priority: P3)

As a CRM user, I want to upload and view a client's profile picture, so I can easily identify clients and personalize their profile.

**Why this priority**: Profile pictures improve user experience but are not critical for core workflows. Requires new API support.

**Independent Test**: Can be tested by uploading an image and verifying it displays on the client profile.

**Acceptance Scenarios**:

1. **Given** a user wants to add a photo, **When** they click on the photo placeholder, **Then** they can upload an image file
2. **Given** a client has a profile picture, **When** viewing their detail page, **Then** the picture is displayed in the overview section
3. **Given** an uploaded image is too large, **When** uploading, **Then** the system shows an error with size limits

---

### User Story 11 - Manage Reminders for Client (Priority: P3)

As a CRM user, I want to set reminders for specific clients, so I can be notified to follow up on important dates and actions.

**Why this priority**: Reminders improve proactive client management but require new API enhancements.

**Independent Test**: Can be tested by creating a reminder and verifying notification is received at the specified time.

**Acceptance Scenarios**:

1. **Given** a user is on client detail page, **When** they click "Add Reminder", **Then** they can set a date/time and message
2. **Given** a reminder date arrives, **When** the system processes reminders, **Then** the user receives a notification
3. **Given** a client has reminders, **When** viewing the reminders section, **Then** upcoming and past reminders are displayed

---

### User Story 12 - Enhanced Task Management (Priority: P3)

As a CRM user, I want tasks to be linkable to any entity, assigned by specific users, and have comprehensive status tracking, so tasks can be used across all CRM workflows.

**Why this priority**: Enhances existing task system for broader use. Requires model changes.

**Independent Test**: Can be tested by creating tasks linked to different entities and verifying assignment/status features work.

**Acceptance Scenarios**:

1. **Given** a user creates a task, **When** selecting the linked entity, **Then** they can choose client, visa application, college application, or other entities
2. **Given** a task is created, **When** viewing task details, **Then** it shows who assigned the task and to whom
3. **Given** a task status changes, **When** viewing the task, **Then** status history is available

---

### User Story 13 - Unified Notification System (Priority: P3)

As a system administrator, I want a flexible notification system that handles various event types across the application, so users are informed of relevant activities.

**Why this priority**: Foundation for future notification features. Extends existing notification model.

**Independent Test**: Can be tested by triggering various events and verifying appropriate notifications are created.

**Acceptance Scenarios**:

1. **Given** a task is assigned to a user, **When** the assignment is saved, **Then** the assignee receives a notification
2. **Given** a client is assigned to a consultant, **When** the assignment is saved, **Then** the consultant receives a notification
3. **Given** a user has multiple unread notifications, **When** viewing the notification center, **Then** they can mark individual or all as read

---

### Edge Cases

- What happens when a client is deleted but has linked notes, tasks, or applications?
- How does the system handle concurrent edits to the same note or task?
- What happens when a user loses permission while viewing a client they could previously access?
- How are large numbers of timeline entries (100+) handled in terms of performance and pagination?
- What happens when uploading an invalid image format for profile picture?
- How does the system handle reminder notifications for users who are no longer active?

## Requirements *(mandatory)*

### Functional Requirements

#### Client Overview & Profile
- **FR-001**: System MUST display a consolidated client overview showing name, profile picture, stage, assigned consultant, and last activity date
- **FR-002**: System MUST support uploading client profile pictures with file type and size validation
- **FR-003**: System MUST display a visual indicator when passport is expiring within 6 months

#### Notes Management
- **FR-004**: System MUST allow users to create notes on client profiles with text content
- **FR-005**: System MUST display notes in reverse chronological order with author name and timestamp
- **FR-006**: System MUST allow note editing by the note author or users with edit permission
- **FR-007**: System MUST restrict note deletion to users with delete_note permission
- **FR-008**: System MUST require confirmation before deleting a note

#### Timeline & Activity
- **FR-009**: System MUST display a chronological timeline of client activities including notes, stage changes, and system events
- **FR-010**: System MUST allow users to add comments to the client timeline
- **FR-011**: System MUST restrict comment deletion to users with delete_comment permission

#### Client Documents (Passport, Qualifications, Language Proficiency)
- **FR-012**: System MUST display passport details including number, country, nationality, issue date, and expiry date
- **FR-013**: System MUST allow CRUD operations on language proficiency records
- **FR-014**: System MUST allow CRUD operations on qualification records

#### Applications
- **FR-015**: System MUST display all visa applications linked to a client with status and key dates
- **FR-016**: System MUST allow creating new visa applications from the client detail page
- **FR-017**: System MUST display all college/institute applications linked to a client
- **FR-018**: System MUST allow creating new college applications from the client detail page
- **FR-019**: Visa application detail view MUST be shareable between client detail and visa management sections

#### Tasks
- **FR-020**: System MUST display all tasks linked to a client on their detail page
- **FR-021**: System MUST support linking tasks to any entity type (client, visa application, college application)
- **FR-022**: System MUST track who assigned a task and to whom
- **FR-023**: System MUST support task status transitions (pending, in progress, completed, cancelled)

#### Reminders
- **FR-024**: System MUST allow users to create reminders with date, time, and message
- **FR-025**: System MUST link reminders to specific clients
- **FR-026**: System MUST trigger notifications when reminder date/time arrives

#### Notifications
- **FR-027**: System MUST generate notifications for task assignments
- **FR-028**: System MUST generate notifications for client assignments
- **FR-029**: System MUST support multiple notification types for extensibility
- **FR-030**: System MUST allow bulk marking notifications as read

### Key Entities *(include if feature involves data)*

- **Note**: Client-specific text notes with author, timestamp, and content. Linked to client via foreign key.
- **ClientActivity**: Timeline events for audit trail - captures all significant actions (notes added, stage changes, document uploads, assignments)
- **ProfilePicture**: Client profile image with file reference and metadata (size, type, upload date)
- **Task (Enhanced)**: Extended with assigned_by field and generic foreign key for entity linking
- **Reminder (Enhanced)**: Extended with notification integration and user targeting
- **Notification**: Existing model extended to handle wider range of notification types with consistent structure

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can access all client information from a single page within 2 clicks from the client list
- **SC-002**: Users can add a note to a client profile in under 30 seconds
- **SC-003**: Client detail page loads completely within 3 seconds for clients with up to 100 timeline entries
- **SC-004**: 90% of users can successfully create a visa application from client detail on first attempt
- **SC-005**: Notification delivery occurs within 1 minute of the triggering event
- **SC-006**: System maintains data integrity when 10 users simultaneously edit different aspects of the same client
- **SC-007**: Users report improved productivity in client management workflows (qualitative feedback)
- **SC-008**: Profile picture upload completes within 5 seconds for images up to 5MB

## Assumptions

1. **Existing APIs are functional**: Passport, language proficiency, qualification, visa application, and task APIs work as documented
2. **File storage available**: Cloud or local file storage is available for profile pictures
3. **Permission system exists**: RBAC system with granular permissions (delete_note, delete_comment, edit_client) is in place
4. **Real-time not required for V1**: Timeline and notifications can use polling; real-time updates are a future enhancement
5. **College Application = Application model**: The existing Application model in immigration/application/ serves as the college application entity
6. **Notes are separate from description**: Notes are a new entity, distinct from the existing client description field
7. **Soft delete for notes**: Notes should be soft-deleted to maintain audit trail
