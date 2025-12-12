# Data Model: Multi-Tenant CRM Refactoring

**Feature**: 001-multi-tenant-crm-refactor  
**Date**: Fri Dec 05 2025  
**Purpose**: Define entities, relationships, validation rules, and state transitions for the refactored system

---

## Overview

This document defines the complete data model for the multi-tenant immigration CRM system post-refactoring. The model implements:

- **Multi-tenancy**: Tenant-level data isolation
- **Role-based hierarchy**: 6-tier role system (Super Super Admin → Consultant)
- **Soft deletion**: Recoverable record deletion
- **Audit trails**: Created/updated by/at tracking
- **Polymorphic relationships**: Tasks, reminders, notifications linked to multiple entity types

---

## Core Entities

### 1. Tenant

**Purpose**: Represents an independent immigration agency organization using the system

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `name` | CharField(200) | Required, unique | Organization name |
| `domain` | CharField(255) | Optional, unique | Custom domain (e.g., agency.crm.com) |
| `is_active` | BooleanField | Default=True | Tenant activation status |
| `subscription_status` | CharField(20) | Choices: TRIAL, ACTIVE, SUSPENDED, CANCELLED | Subscription state |
| `settings` | JSONField | Default={} | Tenant-specific configuration |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Relationships**:
- **Has many**: Branch, User, Client (via Branch)

**Validation Rules**:
- `name` must be unique across all tenants
- `domain` must be valid DNS-compatible string if provided
- Cannot delete tenant with active branches or users

**Indexes**:
```python
indexes = [
    models.Index(fields=['domain']),
    models.Index(fields=['is_active', 'subscription_status']),
]
```

**State Transitions**:
```text
TRIAL → ACTIVE → SUSPENDED → CANCELLED
       ↓
       ACTIVE → CANCELLED
```

**Notes**:
- This entity may need to be created if it doesn't exist in current codebase
- All data queries must be scoped by tenant
- Soft deletion not applicable (critical entity)

---

### 2. Branch

**Purpose**: Represents a physical or logical office location within a Tenant

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `tenant` | ForeignKey(Tenant) | Required, CASCADE | Parent tenant |
| `region` | ForeignKey(Region) | Optional, SET_NULL | Geographic/org region |
| `name` | CharField(100) | Required | Branch name |
| `phone` | CharField(15) | Optional | Contact phone |
| `website` | CharField(100) | Optional | Branch website |
| `street` | CharField(100) | Optional | Street address |
| `suburb` | CharField(100) | Optional | Suburb/city |
| `state` | CharField(100) | Optional | State/province |
| `postcode` | CharField(20) | Optional | Postal code |
| `country` | CountryField | Optional | Country |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_by` | ForeignKey(User) | SET_NULL | Last updater |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Relationships**:
- **Belongs to**: Tenant (required), Region (optional)
- **Has many**: Client, User (assigned staff)

**Validation Rules**:
- Branch name must be unique within tenant
- Cannot delete branch with assigned clients or users
- Region must belong to same tenant

**Indexes**:
```python
indexes = [
    models.Index(fields=['tenant', 'region']),
    models.Index(fields=['tenant', 'name']),
]
```

**Notes**:
- Implements `LifeCycleModel` (created_by, created_at, updated_by, updated_at)
- May implement `SoftDeletionModel` in refactored version

---

### 3. Region

**Purpose**: Groups branches for regional management hierarchy

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `tenant` | ForeignKey(Tenant) | Required, CASCADE | Parent tenant |
| `name` | CharField(100) | Required | Region name (e.g., "North Region") |
| `description` | TextField | Optional | Region description |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Relationships**:
- **Belongs to**: Tenant
- **Has many**: Branch, User (Region Managers)

**Validation Rules**:
- Region name must be unique within tenant
- Cannot delete region with assigned branches

**Indexes**:
```python
indexes = [
    models.Index(fields=['tenant']),
]
```

**Notes**:
- New entity introduced in refactoring
- Required for Region Manager role scope

---

### 4. User (Extended Django User)

**Purpose**: System users with role-based access and multi-tenant scoping

**Fields** (extends `django.contrib.auth.models.AbstractUser`):

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `username` | CharField(150) | Required, unique | Login username |
| `email` | EmailField | Required | Email address |
| `first_name` | CharField(150) | Required | First name |
| `last_name` | CharField(150) | Required | Last name |
| `role` | CharField(30) | Choices: ROLE_CHOICES | User role |
| `tenant` | ForeignKey(Tenant) | Required, CASCADE | Assigned tenant |
| `branch` | ForeignKey(Branch) | Optional, SET_NULL | Assigned branch |
| `region` | ForeignKey(Region) | Optional, SET_NULL | Assigned region (for Region Managers) |
| `is_active` | BooleanField | Default=True | Account active status |
| `date_joined` | DateTimeField | Auto | Registration date |
| `last_login` | DateTimeField | Auto | Last login timestamp |

**Role Choices**:
```python
ROLE_CHOICES = [
    ('SUPER_SUPER_ADMIN', 'Super Super Admin'),
    ('SUPER_ADMIN', 'Super Admin'),
    ('COUNTRY_MANAGER', 'Country Manager'),
    ('REGION_MANAGER', 'Region Manager'),
    ('BRANCH_ADMIN', 'Branch Admin'),
    ('CONSULTANT', 'Consultant'),
]
```

**Relationships**:
- **Belongs to**: Tenant (required), Branch (optional), Region (optional)
- **Has many**: Client (assigned), Task (assigned), Notification (assigned)
- **Created**: Client, Visa, Application, Task records

**Validation Rules**:
- Role hierarchy enforcement:
  - `CONSULTANT` and `BRANCH_ADMIN` must have `branch` assigned
  - `REGION_MANAGER` must have `region` assigned
  - Cannot assign branch/region from different tenant
- Email must be unique across system
- Username must be unique across system

**Indexes**:
```python
indexes = [
    models.Index(fields=['tenant', 'role']),
    models.Index(fields=['branch']),
    models.Index(fields=['region']),
    models.Index(fields=['email']),
]
```

**Notes**:
- Extends Django's default User model
- `created_by`/`updated_by` not applicable (self-managed)

---

### 5. Client

**Purpose**: Immigration clients seeking visa/application services

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `tenant` | ForeignKey(Tenant) | Required, CASCADE | Parent tenant (via branch) |
| `branch` | ForeignKey(Branch) | Required, CASCADE | Assigned branch |
| `first_name` | CharField(100) | Required | Client first name |
| `middle_name` | CharField(100) | Optional | Middle name |
| `last_name` | CharField(100) | Optional | Last name |
| `gender` | CharField(6) | Choices: MALE, FEMALE, OTHER | Gender |
| `dob` | DateField | Optional | Date of birth |
| `phone_number` | CharField(15) | Optional | Contact phone |
| `email` | EmailField | Optional | Contact email |
| `street` | CharField(100) | Optional | Street address |
| `suburb` | CharField(100) | Optional | Suburb/city |
| `state` | CharField(100) | Optional | State/province |
| `postcode` | CharField(20) | Optional | Postal code |
| `country` | CountryField | Required | Country of residence |
| `visa_category` | ForeignKey(VisaCategory) | Optional, SET_NULL | Primary visa interest |
| `agent` | ForeignKey(Agent) | Optional, SET_NULL | Referring agent |
| `assigned_to` | ForeignKey(User) | Optional, SET_NULL | Assigned consultant |
| `stage` | CharField(20) | Choices: CLIENT_STAGE | Current stage in workflow |
| `active` | BooleanField | Default=False | Active client status |
| `description` | TextField | Optional | Additional notes |
| `deleted_at` | DateTimeField | Optional | Soft deletion timestamp |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_by` | ForeignKey(User) | SET_NULL | Last updater |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Client Stage Choices**:
```python
CLIENT_STAGE = [
    ('LEAD', 'Lead'),
    ('CONSULTATION', 'Consultation'),
    ('DOCUMENTATION', 'Documentation'),
    ('APPLICATION', 'Application'),
    ('PROCESSING', 'Processing'),
    ('APPROVED', 'Approved'),
    ('REJECTED', 'Rejected'),
    ('ON_HOLD', 'On Hold'),
]
```

**Relationships**:
- **Belongs to**: Tenant (via branch), Branch, Agent, User (assigned_to)
- **Has many**: VisaApplication, Passport, Qualification, Experience, LPE (Language Proficiency), Reminder, Task, ClientHistory

**Validation Rules**:
- `first_name` is required
- `email` should be unique within tenant (if provided)
- `branch` must belong to same tenant
- `assigned_to` must belong to same branch (if Consultant) or region (if Manager)

**Indexes**:
```python
indexes = [
    models.Index(fields=['branch', 'active']),
    models.Index(fields=['branch', 'stage']),
    models.Index(fields=['email']),
    models.Index(fields=['deleted_at']),  # For soft deletion queries
]
```

**State Transitions**:
```text
LEAD → CONSULTATION → DOCUMENTATION → APPLICATION → PROCESSING → APPROVED
                                                                 ↓
                                                            REJECTED
Any stage → ON_HOLD → (back to previous stage)
```

**Notes**:
- Implements `LifeCycleModel` and `SoftDeletionModel`
- Primary entity for business operations
- Tenant isolation critical

---

### 6. VisaCategory

**Purpose**: Types/categories of visas (e.g., work visa, student visa)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `name` | CharField(100) | Required, unique | Category name |
| `code` | CharField(20) | Optional, unique | Category code |
| `description` | TextField | Optional | Description |

**Relationships**:
- **Has many**: Client (interested clients), VisaType

**Validation Rules**:
- `name` must be unique

**Notes**:
- Master data (not tenant-specific)
- Rarely changes

---

### 7. VisaType

**Purpose**: Specific visa types under categories (e.g., "Subclass 482" under Work Visa)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `visa_category` | ForeignKey(VisaCategory) | Required, CASCADE | Parent category |
| `name` | CharField(100) | Required | Visa type name |
| `code` | CharField(50) | Optional | Official visa code |
| `description` | TextField | Optional | Description |
| `checklist` | JSONField | Default=[] | Required documents checklist |

**Relationships**:
- **Belongs to**: VisaCategory
- **Has many**: VisaApplication

**Validation Rules**:
- `name` must be unique within category

**Notes**:
- Master data (not tenant-specific)

---

### 8. VisaApplication

**Purpose**: Formal visa application submitted for a client

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `client` | ForeignKey(Client) | Required, CASCADE | Applicant client |
| `visa_type` | ForeignKey(VisaType) | Required, PROTECT | Visa type |
| `transaction_reference_no` | CharField(150) | Optional | Reference number |
| `immigration_fee` | MoneyField | Required | Immigration fee amount |
| `service_fee` | MoneyField | Required | Service fee amount |
| `dependent` | BooleanField | Default=False | Is dependent application |
| `notes` | TextField | Optional | Internal notes |
| `assigned_to` | ForeignKey(User) | Optional, SET_NULL | Assigned consultant |
| `required_documents` | JSONField | Default=[] | Required documents from VisaType checklist |
| `expiry_date` | DateField | Optional | Visa expiry date |
| `date_applied` | DateField | Optional | Application submission date |
| `date_opened` | DateField | Optional | Case opened date |
| `final_date` | DateField | Optional | Final decision date |
| `date_granted` | DateField | Optional | Grant date |
| `date_rejected` | DateField | Optional | Rejection date |
| `date_withdrawn` | DateField | Optional | Withdrawal date |
| `status` | CharField(20) | Choices: VISA_STATUS | Application status |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_by` | ForeignKey(User) | SET_NULL | Last updater |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Visa Status Choices**:
```python
VISA_STATUS = [
    ('TO_BE_APPLIED', 'To be Applied'),
    ('VISA_APPLIED', 'Visa Applied'),
    ('CASE_OPENED', 'Case Opened'),
    ('GRANTED', 'Granted'),
    ('REJECTED', 'Rejected'),
    ('WITHDRAWN', 'Withdrawn'),
]
```

**Relationships**:
- **Belongs to**: Client, VisaType, User (assigned_to)
- **Tenant scope**: Inherited from Client → Branch → Tenant

**Validation Rules**:
- `client`, `visa_type`, `immigration_fee`, `service_fee` required on creation
- Status must be valid choice
- Date fields follow logical sequence (applied < opened < final)

**Indexes**:
```python
indexes = [
    models.Index(fields=['client', 'status']),
    models.Index(fields=['status']),
]
```

**State Transitions**:
```text
TO_BE_APPLIED → VISA_APPLIED → CASE_OPENED → GRANTED
                                             ↓
                                        REJECTED
Any stage → WITHDRAWN
```

**Notes**:
- Implements `LifeCycleModel`
- Tenant scoping via client relationship

---

### 9. Agent

**Purpose**: External agents/sub-agents who refer clients

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `agent_name` | CharField(100) | Required | Agent name |
| `agent_type` | CharField(20) | Choices: AGENT_TYPE | Agent type |
| `phone_number` | CharField(15) | Optional | Contact phone |
| `email` | EmailField | Optional | Contact email |
| `website` | URLField(100) | Optional | Website URL |
| `invoice_to` | CharField(100) | Optional | Invoicing address |
| `street` | CharField(100) | Optional | Street address |
| `suburb` | CharField(100) | Optional | Suburb/city |
| `state` | CharField(100) | Optional | State/province |
| `postcode` | CharField(20) | Optional | Postal code |
| `country` | CountryField | Optional | Country |
| `description` | TextField | Optional | Additional notes |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_by` | ForeignKey(User) | SET_NULL | Last updater |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Agent Type Choices**:
```python
AGENT_TYPE = [
    ('SUB_AGENT', 'Sub Agent'),
    ('PARTNER', 'Partner'),
    ('REFERRAL', 'Referral'),
]
```

**Relationships**:
- **Has many**: Client (referred clients)

**Validation Rules**:
- `agent_name` is required
- Email should be unique if provided

**Indexes**:
```python
indexes = [
    models.Index(fields=['agent_type']),
]
```

**Notes**:
- Implements `LifeCycleModel`
- Not tenant-specific (can refer to multiple tenants)

---

### 10. Task

**Purpose**: Work items assigned to users

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `title` | CharField(255) | Required | Task title |
| `detail` | TextField | Optional | Task description |
| `priority` | CharField(10) | Choices: PRIORITY | Priority level |
| `due_date` | DateField | Optional | Due date |
| `assigned_to` | ForeignKey(User) | Optional, CASCADE | Assigned user |
| `tags` | JSONField | Default=[] | Polymorphic entity references |
| `status` | CharField(10) | Choices: STATUS | Task status |
| `comments` | JSONField | Default=[] | Task comments/history |
| `assigned_at` | DateTimeField | Auto | Assignment timestamp |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |
| `updated_by` | ForeignKey(User) | SET_NULL | Last updater |
| `updated_at` | DateTimeField | Auto | Last update timestamp |

**Priority Choices**:
```python
PRIORITY = [
    ('LOW', 'Low'),
    ('MEDIUM', 'Medium'),
    ('HIGH', 'High'),
    ('URGENT', 'Urgent'),
]
```

**Status Choices**:
```python
STATUS = [
    ('PENDING', 'Pending'),
    ('IN_PROGRESS', 'In Progress'),
    ('COMPLETED', 'Completed'),
    ('CANCELLED', 'Cancelled'),
]
```

**Tags Structure** (polymorphic references):
```json
[
    {"id": 123, "type": "client"},  // Links to Client #123
    {"id": 456, "type": "visa_application"}  // Links to VisaApplication #456
]
```

**Comments Structure**:
```json
[
    {
        "comment": ["Text with ", {"id": 123, "type": "client"}, " mention"],
        "comment_date": "2025-12-05T10:30:00Z",
        "added_by": {"id": 5, "type": "user"}
    }
]
```

**Relationships**:
- **Belongs to**: User (assigned_to)
- **Polymorphic links**: Client, VisaApplication, etc. (via tags)
- **Tenant scope**: Via assigned_to → User → Tenant

**Validation Rules**:
- `title` is required
- `assigned_to` defaults to creator if not specified
- `tags` must contain valid id/type pairs

**Indexes**:
```python
indexes = [
    models.Index(fields=['assigned_to', 'status']),
    models.Index(fields=['priority', 'due_date']),
]
```

**State Transitions**:
```text
PENDING → IN_PROGRESS → COMPLETED
        ↓
    CANCELLED
```

**Notes**:
- Implements `LifeCycleModel`
- Tenant scoping via assigned_to user

---

### 11. Notification

**Purpose**: System-generated alerts for users

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `type` | CharField(50) | Choices: NOTIFICATION_TYPE | Notification type |
| `assigned_to` | ForeignKey(User) | Required, CASCADE | Recipient user |
| `due_date` | DateField | Optional | Action due date |
| `meta_info` | JSONField | Default={} | Additional context data |
| `read` | BooleanField | Default=False | Read status |
| `is_completed` | BooleanField | Default=False | Completion status (for actionable notifications) |
| `created_by` | ForeignKey(User) | Optional, DO_NOTHING | User who triggered notification |
| `created_at` | DateTimeField | Auto | Creation timestamp |

**Notification Type Choices**:
```python
NOTIFICATION_TYPE = [
    ('TASK_ASSIGNED', 'Task Assigned'),
    ('VISA_EXPIRY_ALERT', 'Visa Expiry Alert'),
    ('APPLICATION_STATUS_CHANGE', 'Application Status Change'),
    ('CLIENT_STAGE_CHANGE', 'Client Stage Change'),
    ('DOCUMENT_UPLOADED', 'Document Uploaded'),
    ('COMMENT_MENTION', 'Comment Mention'),
]
```

**Meta Info Structure**:
```json
{
    "task_id": 123,
    "task_title": "Review application",
    "related_entity_type": "visa_application",
    "related_entity_id": 456,
    "message": "You have been assigned a new task"
}
```

**Relationships**:
- **Belongs to**: User (assigned_to), User (created_by)
- **Polymorphic links**: Task, Client, VisaApplication (via meta_info)
- **Tenant scope**: Via assigned_to → User → Tenant

**Validation Rules**:
- `type` must be valid choice
- `assigned_to` is required
- `meta_info` should include `related_entity_type` and `related_entity_id` for context

**Indexes**:
```python
indexes = [
    models.Index(fields=['assigned_to', 'read']),
    models.Index(fields=['assigned_to', 'created_at']),
    models.Index(fields=['type', 'read']),
]
```

**Notes**:
- Does not implement `LifeCycleModel` (has custom created_by/created_at)
- Delivered via SSE stream to connected users
- Tenant scoping via assigned_to user

---

### 12. Reminder

**Purpose**: User-created reminders for follow-ups

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | AutoField | PK | Primary key |
| `title` | CharField(255) | Required | Reminder title |
| `reminder_date` | DateTimeField | Required | When to trigger reminder |
| `content_type` | ForeignKey(ContentType) | Required, CASCADE | Polymorphic link to entity |
| `object_id` | PositiveIntegerField | Required | ID of linked entity |
| `created_by` | ForeignKey(User) | SET_NULL | User who created |
| `created_at` | DateTimeField | Auto | Creation timestamp |

**Relationships**:
- **Belongs to**: User (created_by)
- **Polymorphic link**: Client, VisaApplication, etc. (via GenericForeignKey)
- **Tenant scope**: Via created_by → User → Tenant

**Validation Rules**:
- `title` is required
- `reminder_date` must be in future (validation in service layer)
- `content_type` must reference valid model

**Indexes**:
```python
indexes = [
    models.Index(fields=['reminder_date']),
    models.Index(fields=['created_by', 'reminder_date']),
    models.Index(fields=['content_type', 'object_id']),
]
```

**Notes**:
- Uses Django's `GenericForeignKey` for polymorphic relationships
- Tenant scoping via created_by user

---

## Supporting Entities

### Passport

**Purpose**: Client passport information

**Fields**: `client`, `passport_no`, `issue_date`, `expiry_date`, `country`, `created_by`, `created_at`, `updated_by`, `updated_at`

**Relationships**: Belongs to Client

### Qualification

**Purpose**: Client education qualifications

**Fields**: `client`, `institute`, `degree`, `field_of_study`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_by`, `updated_at`

**Relationships**: Belongs to Client

### Experience

**Purpose**: Client work experience

**Fields**: `client`, `company`, `position`, `start_date`, `end_date`, `description`, `created_by`, `created_at`, `updated_by`, `updated_at`

**Relationships**: Belongs to Client

### LPE (Language Proficiency Exam)

**Purpose**: Client language test results

**Fields**: `client`, `exam_type` (IELTS, PTE, etc.), `overall_score`, `listening`, `reading`, `writing`, `speaking`, `exam_date`, `created_by`, `created_at`, `updated_by`, `updated_at`

**Relationships**: Belongs to Client

### ClientHistory

**Purpose**: Audit trail of client record changes

**Fields**: `client`, `entries` (JSONField), `created_at`, `updated_at`

**Relationships**: Belongs to Client (OneToOne)

---

## Entity Relationship Diagram (ERD)

```text
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │ 1:N
       ├───────────────────────────────────┐
       │                                   │
       ▼ 1:N                              ▼ 1:N
┌─────────────┐                    ┌─────────────┐
│   Region    │                    │   Branch    │◀───┐
└──────┬──────┘                    └──────┬──────┘    │
       │ 1:N                              │ 1:N       │
       │                                  │           │
       │                                  ▼           │
       │                           ┌─────────────┐    │
       │                           │    User     │────┘
       │                           └──────┬──────┘
       │                                  │
       │                                  │ 1:N
       │                                  ▼
       │                           ┌─────────────┐
       │                           │   Client    │◀─────┐
       │                           └──────┬──────┘      │
       │                                  │ 1:N         │
       │                                  ▼             │
       │                           ┌──────────────────┐ │
       │                           │ VisaApplication  │ │
       │                           └──────────────────┘ │
       │                                                │
       │                           ┌──────────────────┐ │
       └──────────────────────────▶│      Task        │─┤
                                   └──────────────────┘ │
                                                        │
                                   ┌──────────────────┐ │
                                   │  Notification    │─┤
                                   └──────────────────┘ │
                                                        │
                                   ┌──────────────────┐ │
                                   │    Reminder      │─┘
                                   └──────────────────┘

Master Data (not tenant-specific):
┌───────────────┐
│ VisaCategory  │
└────────┬──────┘
         │ 1:N
         ▼
┌───────────────┐
│   VisaType    │
└───────────────┘

External Entities:
┌───────────────┐
│     Agent     │
└───────────────┘
```

---

## Abstract Base Models

### LifeCycleModel

**Purpose**: Audit trail for created/updated metadata

**Fields**:
```python
created_by = models.ForeignKey(User, SET_NULL, related_name="%(class)s_created_by")
created_at = models.DateTimeField(auto_now_add=True)
updated_by = models.ForeignKey(User, SET_NULL, related_name="%(class)s_updated_by")
updated_at = models.DateTimeField(auto_now=True)
```

**Used by**: Client, VisaApplication, Branch, Agent, Task

### SoftDeletionModel

**Purpose**: Recoverable record deletion

**Fields**:
```python
deleted_at = models.DateTimeField(null=True, blank=True)
```

**Manager**:
```python
objects = SoftDeletionManager()  # Filters deleted_at__isnull=True
all_objects = models.Manager()   # Includes deleted
```

**Methods**:
```python
def delete():  # Soft delete (sets deleted_at)
def hard_delete():  # Permanent deletion
def restore():  # Undelete (clears deleted_at)
```

**Used by**: Client, (potentially Branch, Agent in future)

---

## Validation Rules Summary

### Tenant Isolation
- All queries must filter by `tenant` (either directly or via relationships)
- Cross-tenant data access is forbidden
- Foreign key relationships must respect tenant boundaries

### Role-Based Scoping
- `CONSULTANT`, `BRANCH_ADMIN`: Must have `branch` assigned
- `REGION_MANAGER`: Must have `region` assigned
- Data access filtered by role:
  - Consultant/Branch Admin: Only their branch
  - Region Manager: All branches in their region
  - Country Manager/Super Admin: All tenant data

### Hierarchical User Creation
- `SUPER_SUPER_ADMIN` → `SUPER_ADMIN`
- `SUPER_ADMIN` → `COUNTRY_MANAGER`
- `COUNTRY_MANAGER` → `REGION_MANAGER`
- `REGION_MANAGER` → `BRANCH_ADMIN`
- `BRANCH_ADMIN` → `CONSULTANT`
- Cannot create users at own level or higher

### Data Integrity
- Foreign key constraints prevent orphaned records
- Cascade deletions only where appropriate (client → dependent data)
- Protected deletions for master data (visa types, categories)
- Soft deletion for recoverable entities (clients)

---

## Migration Notes

### Schema Changes Required

1. **Add Tenant Model** (if doesn't exist):
   - Create `Tenant` table
   - Populate with initial tenant(s) from existing data

2. **Add Region Model**:
   - Create `Region` table
   - Add `region` FK to `Branch`
   - Populate regions based on existing branch groupings

3. **Extend User Model**:
   - Add `role`, `tenant`, `branch`, `region` fields
   - Migrate existing user data to new structure

4. **Add Tenant FKs**:
   - Add `tenant` FK to `Branch` (if doesn't exist)
   - Backfill tenant data from existing branches

5. **Soft Deletion**:
   - Add `deleted_at` to `Client` and other entities
   - Update managers (SoftDeletionManager)

6. **Indexes**:
   - Add composite indexes for tenant + branch queries
   - Add indexes on `deleted_at` for soft deletion filtering

### Data Migration

- Assign all existing data to default tenant
- Create regions from existing branch groupings
- Assign user roles based on current permissions/groups
- Assign users to branches/regions based on existing relationships

---

## Next Steps

1. ✅ Data model defined
2. ⏳ Generate API contracts from this model
3. ⏳ Implement models in `immigration/models/` directory
4. ⏳ Create migrations (squashed to `0001_initial.py`)
5. ⏳ Implement selectors for scoped querying
6. ⏳ Implement services for business logic

**Ready for API Contracts Generation**: Yes
