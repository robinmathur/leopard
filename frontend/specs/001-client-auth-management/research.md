# Research: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`
**Date**: 2025-12-10
**Status**: Complete

## Research Questions Addressed

### 1. Mock Server Technology Choice

**Decision**: Use MSW (Mock Service Worker) for mock server

**Rationale**:
- MSW intercepts requests at the network level, providing realistic API simulation
- Works seamlessly with existing Vite setup
- Supports OpenAPI spec generation via `msw-auto-mock` or manual handlers
- No need for separate server process in development
- Can be disabled in production builds automatically
- Already follows best practices for modern React testing

**Alternatives Considered**:
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| Prism | Direct OpenAPI support | Requires separate CLI process | More setup, less integrated |
| json-server | Simple setup | Limited logic, no auth simulation | Too basic for JWT workflow |
| Express mock | Full control | Requires separate port/process | Overhead for frontend project |

**Implementation Notes**:
- Install `msw` as dev dependency
- Create handlers in `dev/mock-server/handlers/`
- Initialize in `main.tsx` conditionally for development
- Generate mock data matching OpenAPI schemas

---

### 2. JWT Token Management Strategy

**Decision**: Use Zustand store with localStorage persistence and axios interceptors

**Rationale**:
- Zustand already in use for auth state - extend rather than add new state manager
- localStorage for token persistence across page refreshes
- Axios interceptors provide clean token refresh without modifying each API call
- Token refresh happens transparently before 401 errors

**Implementation Pattern**:
```
1. Login → Store tokens in Zustand + localStorage
2. API request → Axios interceptor adds Authorization header
3. Token expiring → Interceptor checks exp claim, refreshes proactively
4. 401 response → Interceptor attempts refresh, retries original request
5. Refresh fails → Clear tokens, redirect to login
6. Logout → Clear Zustand store + localStorage
```

**Alternatives Considered**:
| Option | Pros | Cons | Why Rejected |
|--------|------|------|--------------|
| React Context | Built-in | No persistence, more boilerplate | Zustand already in place |
| Cookies | HttpOnly option | More complex setup, CSRF concerns | localStorage simpler for SPA |
| In-memory only | Most secure | Lost on refresh | Poor UX |

---

### 3. Permission Fetching and Caching Strategy

**Decision**: Fetch permissions immediately after login, store in Zustand, flush on logout

**Rationale**:
- Per spec requirement: "force a fresh permission fetch on every new login"
- Single fetch after authentication reduces API calls during session
- Zustand store provides reactive updates to permission-dependent UI
- No cross-session caching ensures permissions are always current

**Implementation Pattern**:
```
1. Login success → Immediately call /api/v1/users/me/permissions/
2. Store permissions array in authStore
3. hasPermission() checks against stored permissions
4. Logout → Clear permissions from store (not just tokens)
5. Re-login → Fresh fetch, overwrites any stale data
```

**Key Considerations**:
- Permissions include: codename, name, content_type (from API)
- Map backend permission codenames to frontend Permission type
- Consider periodic refresh for long sessions (optional enhancement)

---

### 4. Client State Workflow Implementation

**Decision**: Simple stage progression via PATCH API call with immediate UI update

**Rationale**:
- Linear workflow (Lead → Follow Up → Client → Close) is straightforward
- Single API call to update stage field
- Optimistic UI update with rollback on failure
- No complex state machine needed for linear progression

**Stage Mapping** (from OpenAPI spec):
| Stage | Code | Next Stage |
|-------|------|------------|
| Lead | LE | Follow Up |
| Follow Up | FU | Client |
| Client | CT | Close |
| Close | CL | (none - terminal) |

**Implementation Pattern**:
```
1. User clicks Move icon
2. Show confirmation/info about next stage
3. Call PATCH /api/v1/clients/{id}/ with {stage: nextStageCode}
4. On success → Update local state, show success message
5. On failure → Show error, allow retry
6. Disable Move for CL stage
```

---

### 5. HTTP Client and API Service Architecture

**Decision**: Create dedicated httpClient with axios, separate service files per domain

**Rationale**:
- Centralized request/response handling
- Token refresh interceptor in one place
- Error handling standardized across app
- Service files group related endpoints for maintainability

**File Structure**:
```
src/services/api/
├── httpClient.ts      # Axios instance with interceptors
├── authApi.ts         # login, refresh, permissions
└── clientApi.ts       # list, create, update, delete, getById
```

**httpClient Features**:
- Base URL configuration (supports mock and real API)
- Request interceptor: Add Authorization header
- Response interceptor: Handle 401, attempt refresh
- Error transformation to consistent format

---

### 6. Mock Data Generation Strategy

**Decision**: Manually crafted mock data with faker-like realistic values

**Rationale**:
- Full control over edge cases and scenarios
- Can match specific test cases from spec
- Include clients at each stage for testing workflow
- Include various user roles for permission testing

**Mock Data Requirements**:
- 10-20 mock clients across all stages
- Multiple user accounts with different roles
- Valid JWT-like tokens (can use static strings for mock)
- Pagination support in list responses

---

### 7. UI Component Library Pattern

**Decision**: Use Material UI components with custom wrapper components

**Rationale**:
- MUI already in project dependencies
- Consistent with existing pages
- Dialog component for modals (edit, delete confirmation)
- DataGrid or Table for client list with actions
- Form components with validation

**Component Decisions**:
| Feature | MUI Component | Custom Wrapper |
|---------|--------------|----------------|
| Client list | Table with TablePagination | ClientTable.tsx |
| Edit dialog | Dialog + form fields | ClientForm.tsx |
| Delete confirm | Dialog with actions | DeleteConfirmDialog.tsx |
| Action icons | IconButton with tooltip | ClientActions.tsx |
| Stage move | Dialog or Menu | MoveStageDialog.tsx |

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.2 |
| Language | TypeScript | 5.3 |
| State Management | Zustand | 4.5 |
| UI Library | Material UI | 5.15 |
| Routing | React Router DOM | 6.22 |
| HTTP Client | Axios (to add) | 1.x |
| Mock Server | MSW (to add) | 2.x |
| Build Tool | Vite | 5.1 |
| Testing | Vitest (to add) | 1.x |

## Dependencies to Add

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "msw": "^2.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0"
  }
}
```

## Open Questions (None)

All technical decisions have been made. No NEEDS CLARIFICATION items remain.
