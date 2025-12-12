# Quick Start: Client Authentication & Management System

**Feature Branch**: `001-client-auth-management`
**Date**: 2025-12-10

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git

## Getting Started

### 1. Clone and Setup

```bash
# Checkout the feature branch
git checkout 001-client-auth-management

# Install dependencies
npm install
```

### 2. Install New Dependencies

This feature requires additional packages:

```bash
# Production dependencies
npm install axios

# Development dependencies  
npm install -D msw vitest @testing-library/react @testing-library/jest-dom
```

### 3. Start Development Server

```bash
# Start Vite dev server (mock server auto-initializes)
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Mock Server

The mock server uses MSW (Mock Service Worker) and initializes automatically in development mode.

**Test Credentials**:
| Username | Password | Role |
|----------|----------|------|
| admin@immigrationcrm.com | password123 | Super Admin |
| manager@immigrationcrm.com | password123 | Branch Manager |
| agent@immigrationcrm.com | password123 | Agent |
| intern@immigrationcrm.com | password123 | Intern |

### 5. Running Tests

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## Key Files Modified/Added

### New Files

| File | Purpose |
|------|---------|
| `src/services/api/httpClient.ts` | Axios instance with interceptors |
| `src/services/api/authApi.ts` | Authentication API service |
| `src/services/api/clientApi.ts` | Client CRUD API service |
| `src/types/client.ts` | Client type definitions |
| `src/store/clientStore.ts` | Client state management |
| `src/components/clients/ClientForm.tsx` | Add/Edit client form |
| `src/components/clients/ClientTable.tsx` | Client list component |
| `src/components/clients/ClientActions.tsx` | Row action icons |
| `src/components/clients/DeleteConfirmDialog.tsx` | Delete confirmation |
| `src/components/clients/MoveStageDialog.tsx` | Stage transition |
| `src/pages/Clients/ClientDetailPage.tsx` | Full client view |
| `dev/mock-server/index.ts` | MSW server setup |
| `dev/mock-server/handlers/auth.ts` | Auth mock handlers |
| `dev/mock-server/handlers/clients.ts` | Client mock handlers |

### Modified Files

| File | Changes |
|------|---------|
| `src/store/authStore.ts` | Add JWT token handling, permissions |
| `src/auth/types.ts` | Add token and permission types |
| `src/pages/Clients/ClientsPage.tsx` | Implement full client list with actions |
| `src/pages/Login/LoginPage.tsx` | Integrate real login API |
| `src/components/layout/AppBar.tsx` | Add logout button |
| `src/main.tsx` | Initialize MSW in development |
| `package.json` | Add new dependencies and scripts |

## Feature Verification Checklist

### Authentication

- [ ] Can log in with valid credentials
- [ ] Receives and stores JWT tokens
- [ ] Permissions are fetched after login
- [ ] Token refresh works when access token expires
- [ ] Logout clears all auth state
- [ ] Protected routes redirect to login when unauthenticated

### Client Management

- [ ] Client list displays with pagination
- [ ] "Active" tab renamed to "All Clients"
- [ ] Can add new client via form
- [ ] Can edit client via modal
- [ ] Delete shows confirmation dialog
- [ ] Can view client details on separate page
- [ ] Can move client through stages (Lead → Follow Up → Client → Close)
- [ ] Move disabled for clients in Close stage

### RBAC

- [ ] Action buttons respect user permissions
- [ ] API calls fail gracefully with 403 for unauthorized actions

## Troubleshooting

### Mock Server Not Working

1. Ensure MSW is installed: `npm ls msw`
2. Check browser DevTools Network tab for intercepted requests
3. Verify `main.tsx` initializes MSW in development

### Login Fails

1. Use exact credentials from table above
2. Check browser console for errors
3. Verify mock handlers are registered

### Type Errors

1. Run `npm run build` to check TypeScript errors
2. Ensure all new types are exported correctly

## Environment Variables

Create `.env.local` for local overrides:

```env
# API base URL (for production)
VITE_API_BASE_URL=https://api.example.com

# Enable/disable mock server (default: true in development)
VITE_ENABLE_MOCK=true
```

## Scripts Reference

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```
