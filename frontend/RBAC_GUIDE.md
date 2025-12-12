# RBAC Implementation Guide

## Overview

This guide explains how to implement and use the Role-Based Access Control (RBAC) system in the Immigration CRM application.

## Quick Start

### 1. Check User Permission in Component

```tsx
import { usePermission } from '@/auth/hooks/usePermission';

function MyComponent() {
  const { hasPermission, role } = usePermission();

  if (hasPermission('view_finance')) {
    return <FinancialData />;
  }

  return <div>Access denied</div>;
}
```

### 2. Protect UI Elements Declaratively

```tsx
import { Protect } from '@/components/protected/Protect';

function MyComponent() {
  return (
    <div>
      <h1>Client Profile</h1>
      
      {/* Hide completely if no permission */}
      <Protect permission="view_contact_info">
        <PhoneNumber value={client.phone} />
      </Protect>
      
      {/* Show "Restricted" if no permission */}
      <Protect permission="view_contact_info" fallback="redact">
        <Email value={client.email} />
      </Protect>
      
      {/* Show custom fallback */}
      <Protect 
        permission="view_finance" 
        fallback={<div>Premium feature</div>}
      >
        <FinancialReport />
      </Protect>
    </div>
  );
}
```

## Available Permissions

### Client Permissions
- `view_clients` - View client list
- `create_client` - Add new clients
- `edit_client` - Edit client information
- `delete_client` - Delete clients
- `view_contact_info` - View phone numbers and contact details
- `view_client_documents` - Access client documents

### Lead Permissions
- `view_leads` - View leads
- `create_lead` - Create new leads
- `edit_lead` - Edit lead information
- `delete_lead` - Delete leads
- `assign_lead` - Assign leads to agents

### Application Permissions
- `view_applications` - View visa applications
- `create_application` - Create new applications
- `edit_application` - Edit applications
- `delete_application` - Delete applications
- `submit_application` - Submit applications

### Institute Permissions
- `view_institutes` - View institute list
- `create_institute` - Add new institutes
- `edit_institute` - Edit institute information
- `delete_institute` - Remove institutes

### Agent/Admin Permissions
- `view_agents` - View agent list
- `create_agent` - Add new agents
- `edit_agent` - Edit agent information
- `delete_agent` - Remove agents
- `manage_permissions` - Manage user permissions

### Financial Permissions
- `view_finance` - View financial data
- `edit_finance` - Edit financial records
- `approve_payments` - Approve payment transactions

### Branch Permissions
- `view_branch_data` - View branch-specific data
- `manage_branch` - Manage branch settings
- `view_all_branches` - View data across all branches

### Dashboard Permissions
- `view_dashboard` - Access dashboard
- `view_analytics` - View analytics and reports
- `export_data` - Export data

## Role Definitions

### Super Admin
Full access to all features and data across all tenants.

**Use cases**: System administrators, founders

### Branch Manager
Can manage their branch, view analytics, and oversee agents.

**Use cases**: Regional managers, office managers

### Agent
Can manage clients and applications but limited financial access.

**Use cases**: Immigration consultants, case workers

### Intern
Read-only access for learning and support.

**Use cases**: Trainees, support staff

## Common Use Cases

### 1. Conditionally Render Action Buttons

```tsx
function ClientActions({ client }: { client: Client }) {
  const { hasPermission, hasAnyPermission } = usePermission();

  return (
    <Box>
      {/* Show edit button only if user can edit */}
      {hasPermission('edit_client') && (
        <Button onClick={() => editClient(client.id)}>
          Edit
        </Button>
      )}
      
      {/* Show delete OR archive if user has either permission */}
      {hasAnyPermission(['delete_client', 'archive_client']) && (
        <Button color="error" onClick={() => deleteClient(client.id)}>
          Delete
        </Button>
      )}
    </Box>
  );
}
```

### 2. Table with Conditional Columns

```tsx
function ClientTable() {
  const { hasPermission } = usePermission();

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Email</TableCell>
          {hasPermission('view_contact_info') && (
            <TableCell>Phone</TableCell>
          )}
          {hasPermission('view_finance') && (
            <TableCell>Revenue</TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>{client.name}</TableCell>
            <TableCell>{client.email}</TableCell>
            {hasPermission('view_contact_info') && (
              <TableCell>{client.phone}</TableCell>
            )}
            {hasPermission('view_finance') && (
              <TableCell>{client.revenue}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 3. Redacted Data Display

```tsx
function ClientContactCard({ client }: { client: Client }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{client.name}</Typography>
        
        {/* Email visible to all */}
        <Typography>Email: {client.email}</Typography>
        
        {/* Phone shows as "[Restricted]" if no permission */}
        <Protect permission="view_contact_info" fallback="redact">
          <Typography>Phone: {client.phone}</Typography>
        </Protect>
        
        {/* Address completely hidden if no permission */}
        <Protect permission="view_contact_info">
          <Typography>Address: {client.address}</Typography>
        </Protect>
      </CardContent>
    </Card>
  );
}
```

### 4. Page-Level Protection

```tsx
// In App.tsx or route configuration
import { usePermission } from '@/auth/hooks/usePermission';
import { Navigate } from 'react-router-dom';

function AgentPage() {
  const { hasPermission } = usePermission();

  if (!hasPermission('view_agents')) {
    return <Navigate to="/" replace />;
  }

  return <AgentManagement />;
}
```

### 5. Multiple Permission Requirements

```tsx
function FinancialEditForm() {
  const { hasAllPermissions } = usePermission();

  // User must have BOTH permissions
  if (!hasAllPermissions(['view_finance', 'edit_finance'])) {
    return <AccessDenied />;
  }

  return <EditFinancialData />;
}

// Or using Protect component
function FinancialSection() {
  return (
    <Protect 
      permission={['view_finance', 'edit_finance']} 
      requireAll
    >
      <EditFinancialData />
    </Protect>
  );
}
```

## Navigation Configuration

Control sidebar visibility based on permissions:

```typescript
// navigation.config.ts
export const navigationConfig: NavItem[] = [
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: PeopleIcon,
    permission: 'view_clients', // Required permission
    children: [
      {
        id: 'clients-active',
        label: 'Active',
        path: '/clients/active',
        icon: PeopleIcon,
        permission: 'view_clients',
      },
    ],
  },
  // Navigation items without permission are visible to all authenticated users
  {
    id: 'help',
    label: 'Help',
    path: '/help',
    icon: HelpIcon,
    // No permission required
  },
];
```

## Adding Custom Permissions

### Step 1: Define Permission Type

```typescript
// auth/types.ts
export type Permission =
  | 'view_clients'
  | 'your_new_permission' // Add here
  | ...
```

### Step 2: Assign to Roles

```typescript
// auth/types.ts
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'view_clients',
    'your_new_permission', // Add to appropriate roles
    // ...
  ],
  agent: [
    'view_clients',
    // Agents don't get the new permission
  ],
  // ...
};
```

### Step 3: Use in Components

```tsx
<Protect permission="your_new_permission">
  <YourProtectedComponent />
</Protect>
```

## Testing Permissions

Use the mock users to test different permission levels:

```typescript
// Quick login as different users
const users = {
  admin: 'admin@immigrationcrm.com',      // Full access
  manager: 'manager@immigrationcrm.com',  // Branch-level access
  agent: 'agent@immigrationcrm.com',      // Limited access
  intern: 'intern@immigrationcrm.com',    // Read-only
};

// Password for all: password123
```

## Best Practices

### 1. Fail Secure
When in doubt, hide the content. It's better to hide something by mistake than expose sensitive data.

```tsx
// Good
<Protect permission="view_sensitive_data">
  <SensitiveInfo />
</Protect>

// Bad - exposing data by default
<SensitiveInfo visible={hasPermission('view_sensitive_data')} />
```

### 2. Use Descriptive Permission Names
Use format: `{action}_{resource}`

```typescript
// Good
'view_contact_info'
'edit_financial_data'
'delete_client'

// Bad
'contacts'
'finance'
'remove'
```

### 3. Group Related Permissions
For complex features, check multiple related permissions:

```tsx
const { hasAllPermissions } = usePermission();

if (hasAllPermissions(['view_finance', 'edit_finance', 'approve_payments'])) {
  return <FullFinancialAccess />;
}
```

### 4. Provide Fallbacks for Better UX

```tsx
// Show disabled button instead of hiding
<Protect 
  permission="edit_client"
  fallback={
    <Button disabled>
      Edit (No Permission)
    </Button>
  }
>
  <Button>Edit</Button>
</Protect>
```

### 5. Always Validate on Backend
Client-side checks are for UX only. Always enforce permissions on your API:

```typescript
// Backend (example)
app.post('/api/clients', requirePermission('create_client'), async (req, res) => {
  // Create client
});
```

## Troubleshooting

### Permission Check Not Working

1. Check user is authenticated: `const { user } = usePermission();`
2. Verify user has the permission: `console.log(user?.permissions)`
3. Check permission name spelling matches exactly
4. Ensure Zustand store is properly initialized

### Navigation Item Not Showing

1. Check `navigation.config.ts` has correct permission
2. Verify user role includes that permission in `ROLE_PERMISSIONS`
3. Check the navigation is using `filterNavByPermissions`

### Protect Component Always Hiding Content

1. Verify permission prop is spelled correctly
2. Check user is authenticated
3. Ensure user object has permissions array
4. Try removing permission prop to debug (will show content)

## API Integration

When connecting to a real backend:

```typescript
// authStore.ts - Update login function
login: async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  // Backend returns user with permissions
  set({
    user: data.user,
    isAuthenticated: true,
    token: data.token,
  });
},
```

Ensure your backend JWT includes:
- User ID
- Role
- Permissions array
- Tenant ID
- Branch ID (if applicable)

