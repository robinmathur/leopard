# Architecture Documentation

## Overview

This is a Multi-Tenant SaaS CRM application for Immigration Agents built with React, TypeScript, and Material-UI. The architecture is designed around a robust Role-Based Access Control (RBAC) system with support for multi-tenancy.

## Key Architectural Decisions

### 1. State Management - Zustand

We chose Zustand over Redux for several reasons:
- **Minimal boilerplate**: No actions, reducers, or middleware setup required
- **Performance**: Uses React hooks and doesn't require context providers
- **Type-safety**: Excellent TypeScript support
- **Small bundle size**: ~1KB vs Redux's larger footprint
- **Developer experience**: Simpler API, easier to learn and maintain

### 2. RBAC System

The permission system operates at two levels:

#### Page-Level Control
- Entire routes/pages can be hidden based on user permissions
- Implemented via the `navigationConfig` with permission requirements
- Navigation items are automatically filtered based on the logged-in user's role

#### Component-Level Control
- Individual UI elements (fields, buttons, sections) can be controlled
- Implemented via two mechanisms:
  1. **`usePermission` hook** - For imperative permission checks
  2. **`<Protect>` component** - For declarative permission wrapping

### 3. Multi-Tenant Architecture

Each user belongs to a `tenant` (organization) and optionally a `branch`:
- `tenantId`: Isolates data between different organizations
- `branchId`: Allows branch-level data separation within a tenant
- User permissions are scoped to their tenant and branch

### 4. Compact UI Design

The theme is optimized for high data density:
- All components use `size="small"` by default
- Reduced padding and spacing throughout
- Smaller font sizes (13px base instead of 14px)
- Minimal table cell padding
- Compact form fields and buttons

## Directory Structure

```
src/
├── auth/                      # Authentication & Authorization
│   ├── hooks/                 # Auth-related hooks
│   │   └── usePermission.ts   # Permission checking hook
│   └── types.ts               # User, Role, Permission types
│
├── components/
│   ├── layout/                # Layout components
│   │   ├── AppBar.tsx         # Top navigation bar
│   │   ├── Sidebar.tsx        # Side navigation
│   │   ├── DashboardLayout.tsx # Main layout wrapper
│   │   └── navigation.config.ts # Nav menu configuration
│   │
│   └── protected/             # Permission-controlled components
│       └── Protect.tsx        # Permission guard component
│
├── pages/                     # Page components
│   ├── Dashboard/
│   ├── Clients/
│   ├── Leads/
│   ├── VisaApplications/
│   ├── Institute/
│   ├── Agent/
│   └── Login/
│
├── store/                     # Zustand stores
│   └── authStore.ts          # Authentication state
│
├── theme/                     # MUI theme
│   └── theme.ts              # Custom theme (compact mode)
│
├── App.tsx                    # Main app with routing
└── main.tsx                   # Entry point
```

## Component Hierarchy

```
App (ThemeProvider, BrowserRouter)
  ├── LoginPage (public)
  └── ProtectedRoute
      └── DashboardLayout
          ├── AppBar
          │   ├── Breadcrumbs
          │   ├── Search
          │   └── Profile Menu
          ├── Sidebar
          │   └── Filtered Navigation (based on permissions)
          └── Page Content (Outlet)
              ├── Dashboard
              ├── ClientsPage
              ├── LeadsPage
              └── etc.
```

## Data Flow

### Authentication Flow

1. User enters credentials on `LoginPage`
2. `authStore.login()` is called (mock authentication)
3. User object with permissions is stored in Zustand
4. User is redirected to dashboard
5. All routes check authentication via `ProtectedRoute`

### Permission Check Flow

1. Component needs to check permission
2. Either:
   - Call `usePermission()` hook and check imperatively
   - Wrap content in `<Protect permission="...">` component
3. Hook/component reads from `authStore`
4. Permission is checked against user's permission array
5. Content is shown/hidden/redacted based on result

## Key Features

### 1. Flexible Permission System

```tsx
// Imperative check
const { hasPermission } = usePermission();
if (hasPermission('view_contact_info')) {
  // Render sensitive data
}

// Declarative check - hide completely
<Protect permission="view_finance">
  <FinancialData />
</Protect>

// Declarative check - show redacted
<Protect permission="view_contact_info" fallback="redact">
  <PhoneNumber value={client.phone} />
</Protect>

// Multiple permissions - any
<Protect permission={['edit_client', 'delete_client']}>
  <ActionButtons />
</Protect>

// Multiple permissions - all required
<Protect permission={['view_finance', 'edit_finance']} requireAll>
  <EditFinancialData />
</Protect>
```

### 2. Role Hierarchy

Roles are defined with their default permissions in `auth/types.ts`:

- **Super Admin**: Full access to everything including user management
- **Branch Manager**: Branch-level access, can manage agents and view analytics
- **Agent**: Client and application management, limited financial access
- **Intern**: Read-only access to clients, leads, and applications

### 3. Navigation Filtering

Navigation items are automatically filtered based on permissions:

```typescript
// navigation.config.ts
export const navigationConfig: NavItem[] = [
  {
    id: 'agent',
    label: 'Agent',
    path: '/agent',
    icon: BadgeIcon,
    permission: 'view_agents', // Only visible to users with this permission
  },
  // ...
];
```

### 4. Graceful Degradation

When users lack permissions:
- **Pages**: Redirected or shown access denied message
- **Buttons/Actions**: Hidden completely
- **Data Fields**: Either hidden or shown as "[Restricted]"
- **Navigation Items**: Automatically filtered out

## Extensibility

### Adding New Permissions

1. Add permission to `Permission` type in `auth/types.ts`
2. Add to appropriate role(s) in `ROLE_PERMISSIONS`
3. Use in components via `<Protect>` or `usePermission()`

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation item in `navigation.config.ts` with required permission
4. Page automatically becomes visible to users with permission

### Adding New Roles

1. Add role to `UserRole` type in `auth/types.ts`
2. Define permissions in `ROLE_PERMISSIONS`
3. Create mock user if needed
4. Role-based filtering works automatically

## Performance Considerations

1. **Zustand** - No unnecessary re-renders, only components using the store update
2. **Route-based code splitting** - Can be added via React.lazy() for larger apps
3. **Compact UI** - Reduces DOM size, improves rendering performance
4. **Permission checks** - O(n) array lookups, could be optimized to Set for larger permission lists

## Security Notes

⚠️ **Important**: Client-side permission checks are for UX only!

- Always validate permissions on the backend/API
- Never trust client-side checks for security
- Use JWT tokens with permission claims
- Implement proper API authorization middleware

## Future Enhancements

1. **Permission Caching**: Cache permission checks for better performance
2. **Dynamic Permissions**: Load permissions from API instead of hardcoding
3. **Field-Level Permissions**: Extend to control individual form fields
4. **Audit Logging**: Track permission denials and access patterns
5. **Permission Groups**: Create permission bundles for easier management
6. **Conditional Permissions**: Permissions based on data ownership or context

