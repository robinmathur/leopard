# Data Model: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`
**Date**: 2025-12-10
**Source**: OpenAPI spec (`dev/openapi-spec.yaml`) + existing auth types

## Entities

### 1. Token (Authentication)

Represents JWT tokens for authentication.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| access | string | JWT access token | Required, short-lived (typically 15-60 min) |
| refresh | string | JWT refresh token | Required, longer-lived (typically 7-30 days) |

**State Transitions**: None (immutable once created)

**Validation Rules**:
- Both tokens must be valid JWT format
- Access token used for API authorization
- Refresh token used only for obtaining new access token

---

### 2. TokenRequest (Login)

Request payload for authentication.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| username | string | User's username | Required, min 1 char |
| password | string | User's password | Required, min 1 char, write-only |

---

### 3. TokenRefreshRequest

Request payload for token refresh.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| refresh | string | Valid refresh token | Required, min 1 char |

---

### 4. Permission

Represents a user permission from the backend.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| codename | string | Permission identifier | Required, e.g., "view_client" |
| name | string | Human-readable name | Required |
| content_type | string | Resource type | Required, e.g., "core.client" |

**Frontend Type Mapping**:
```typescript
type Permission = 
  | 'view_clients' | 'create_client' | 'edit_client' | 'delete_client'
  | 'view_leads' | 'create_lead' | 'edit_lead' | 'delete_lead'
  // ... etc
```

---

### 5. User (Extended from existing)

Represents an authenticated user with permissions.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | integer | Unique identifier | Required, read-only |
| username | string | Login username | Required, max 150 chars |
| email | string | Email address | Email format, max 254 chars |
| first_name | string | First name | Max 150 chars |
| last_name | string | Last name | Max 150 chars |
| primary_group | string | Role identifier | Read-only, e.g., "CONSULTANT" |
| tenant | integer | Tenant ID | Nullable |
| is_active | boolean | Account active status | Default true |

**Relationships**:
- Has many Permissions (via groups)
- Belongs to Tenant
- May belong to Branch(es) and Region(s)

---

### 6. Client

Core entity for client management.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | integer | Unique identifier | Required, read-only |
| first_name | string | First name | Required, max 100 chars |
| middle_name | string | Middle name | Optional, max 100 chars |
| last_name | string | Last name | Optional, max 100 chars |
| email | string | Email address | Optional, email format |
| phone_number | string | Phone number | Optional, max 15 chars |
| gender | enum | Gender | Required: MALE, FEMALE, OTHER |
| dob | date | Date of birth | Optional, ISO date |
| country | enum | Country code | Required, 2-char ISO code |
| street | string | Street address | Optional, max 100 chars |
| suburb | string | Suburb/City | Optional, max 100 chars |
| state | string | State/Province | Optional, max 100 chars |
| postcode | string | Postal code | Optional, max 20 chars |
| stage | enum | Client stage | LE, FU, CT, CL |
| active | boolean | Active status | Default false |
| description | string | Notes | Optional, text |
| referred_by | string | Referral source | Optional, max 100 chars |
| visa_category | integer | Visa category ID | Optional, FK |
| assigned_to | integer | Assigned consultant ID | Optional, FK |
| agent | integer | Referring agent ID | Optional, FK |
| created_by | integer | Creator user ID | Read-only |
| created_at | datetime | Creation timestamp | Read-only |
| updated_by | integer | Last updater ID | Read-only |
| updated_at | datetime | Last update timestamp | Read-only |

**State Transitions** (stage field):

```
┌──────┐    ┌───────────┐    ┌────────┐    ┌───────┐
│ Lead │───▶│ Follow Up │───▶│ Client │───▶│ Close │
│ (LE) │    │   (FU)    │    │  (CT)  │    │ (CL)  │
└──────┘    └───────────┘    └────────┘    └───────┘
```

**Rules**:
- New clients default to "Lead" (LE) stage
- Transitions are forward-only (no backward movement)
- Close (CL) is terminal state - no further transitions

**Validation Rules**:
- first_name: Required, 1-100 characters
- gender: Required, must be valid enum value
- country: Required, valid 2-character ISO country code
- email: If provided, must be valid email format
- stage: If provided, must be valid enum value

---

### 7. ClientStage (Enum)

| Code | Label | Description |
|------|-------|-------------|
| LE | Lead | Initial contact, potential client |
| FU | Follow Up | In communication, not yet committed |
| CT | Client | Active paying client |
| CL | Close | Relationship ended |

---

### 8. Gender (Enum)

| Value | Label |
|-------|-------|
| MALE | Male |
| FEMALE | Female |
| OTHER | Other |

---

## Frontend Type Definitions

```typescript
// src/types/client.ts

export type ClientStage = 'LE' | 'FU' | 'CT' | 'CL';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Client {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender: Gender;
  dob?: string; // ISO date
  country: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage: ClientStage;
  active: boolean;
  description?: string;
  referred_by?: string;
  visa_category?: number;
  visa_category_name?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  agent?: number;
  agent_name?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface ClientCreateRequest {
  first_name: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender: Gender;
  dob?: string;
  country: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage?: ClientStage; // Defaults to 'LE'
  visa_category_id?: number;
  assigned_to_id?: number;
  agent_id?: number;
  description?: string;
  referred_by?: string;
  active?: boolean;
}

export interface ClientUpdateRequest {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender?: Gender;
  dob?: string;
  country?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  stage?: ClientStage;
  visa_category_id?: number;
  assigned_to_id?: number;
  agent_id?: number;
  description?: string;
  referred_by?: string;
  active?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const STAGE_LABELS: Record<ClientStage, string> = {
  LE: 'Lead',
  FU: 'Follow Up',
  CT: 'Client',
  CL: 'Close',
};

export const NEXT_STAGE: Record<ClientStage, ClientStage | null> = {
  LE: 'FU',
  FU: 'CT',
  CT: 'CL',
  CL: null, // Terminal state
};
```

---

## Auth Type Extensions

```typescript
// src/auth/types.ts (additions)

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserPermission {
  codename: string;
  name: string;
  content_type: string;
}

export interface PermissionsResponse {
  permissions: UserPermission[];
  role: string;
  role_display: string;
}

// Update AuthStore interface
export interface AuthStore {
  // Existing fields...
  tokens: AuthTokens | null;
  permissions: Permission[];
  
  // New actions
  setTokens: (tokens: AuthTokens | null) => void;
  setPermissions: (permissions: Permission[]) => void;
  refreshToken: () => Promise<boolean>;
}
```

---

## Entity Relationships Diagram

```
┌─────────────┐       ┌─────────────┐
│    User     │       │   Client    │
├─────────────┤       ├─────────────┤
│ id          │       │ id          │
│ username    │◀──────│ assigned_to │
│ email       │       │ created_by  │
│ primary_group│      │ updated_by  │
│ permissions │       │ stage       │
└─────────────┘       └─────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│ Permission  │       │ VisaCategory│
├─────────────┤       ├─────────────┤
│ codename    │       │ id          │
│ name        │       │ name        │
│ content_type│       └─────────────┘
└─────────────┘
```
