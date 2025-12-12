# Implementation Plan: Client Authentication & Management System

**Branch**: `001-client-auth-management` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-client-auth-management/spec.md`

## Summary

This feature implements JWT-based authentication with permission fetching, a mock server for development, and enhanced client management UI with CRUD operations and state workflow (Lead -> Follow Up -> Client -> Close). The technical approach uses Zustand for state management, React with Material UI for components, and Prism/MSW for mock server capabilities.

## Technical Context

**Language/Version**: TypeScript 5.3, React 18.2, Node.js (for mock server)
**Primary Dependencies**: React, Material UI 5.15, Zustand 4.5, react-router-dom 6.22, Vite 5.1
**Storage**: Browser localStorage for tokens, Zustand store for application state
**Testing**: Vitest (to be added for unit tests), integration tests with mock server
**Target Platform**: Modern browsers (ES2020+)
**Project Type**: Single-page web application (frontend-only with API integration)
**Performance Goals**: <5s login, <3s client list load, <2s state transitions (per spec)
**Constraints**: Must work offline with mock server, no backend changes required
**Scale/Scope**: Multi-tenant CRM, role-based access for ~5 user types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file contains template placeholders without specific rules defined. No specific gates to evaluate. Proceeding with standard best practices:

- [x] Feature is self-contained and testable
- [x] Clear purpose defined (authentication + client management)
- [x] No unnecessary complexity introduced
- [x] Follows existing project patterns (Zustand, MUI, React Router)

## Project Structure

### Documentation (this feature)

```text
specs/001-client-auth-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── auth/
│   ├── hooks/
│   │   └── usePermission.ts    # Existing - permission hooks
│   ├── types.ts                 # Existing - auth types (to be updated)
│   └── services/
│       └── authService.ts       # NEW - API integration for login/token
├── components/
│   ├── layout/
│   │   ├── AppBar.tsx          # Existing - add logout button
│   │   ├── DashboardLayout.tsx # Existing
│   │   ├── Sidebar.tsx         # Existing
│   │   └── navigation.config.ts # Existing
│   ├── protected/
│   │   └── Protect.tsx         # Existing - RBAC wrapper
│   └── clients/
│       ├── ClientForm.tsx       # NEW - Add/Edit client form
│       ├── ClientTable.tsx      # NEW - Client list table
│       ├── ClientActions.tsx    # NEW - Edit/Delete/View/Move icons
│       ├── DeleteConfirmDialog.tsx # NEW - Delete confirmation
│       └── MoveStageDialog.tsx  # NEW - Stage transition dialog
├── pages/
│   ├── Clients/
│   │   ├── ClientsPage.tsx      # Existing - to be updated
│   │   └── ClientDetailPage.tsx # NEW - Full client view
│   └── Login/
│       └── LoginPage.tsx        # Existing - to be updated
├── store/
│   ├── authStore.ts             # Existing - to be updated with JWT
│   └── clientStore.ts           # NEW - Client state management
├── services/
│   └── api/
│       ├── httpClient.ts        # NEW - Axios/fetch wrapper with token refresh
│       └── clientApi.ts         # NEW - Client API calls
└── types/
    └── client.ts                # NEW - Client type definitions

dev/
├── mock-server/
│   ├── index.ts                 # NEW - Mock server entry
│   ├── handlers/
│   │   ├── auth.ts              # NEW - Auth mock handlers
│   │   └── clients.ts           # NEW - Client mock handlers
│   └── data/
│       └── mockData.ts          # NEW - Realistic mock data
└── openapi-spec.yaml            # Existing - API specification

tests/
├── integration/
│   └── client-management.test.ts # Existing - to be updated
└── unit/
    ├── authStore.test.ts        # NEW
    └── clientStore.test.ts      # NEW
```

**Structure Decision**: Single project structure maintained. Frontend-only application with separate mock server module in `dev/` directory for development. No backend changes - all integration via OpenAPI spec.

## Complexity Tracking

No constitution violations to justify. Implementation follows existing patterns and adds minimal new dependencies.
