# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Default Login Credentials

The application includes mock users for testing different permission levels:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Super Admin | admin@immigrationcrm.com | password123 | Full system access |
| Branch Manager | manager@immigrationcrm.com | password123 | Branch-level management |
| Agent | agent@immigrationcrm.com | password123 | Client/application management |
| Intern | intern@immigrationcrm.com | password123 | Read-only access |

## Development Workflow

### 1. Creating a New Page

```bash
# 1. Create page component
src/pages/YourPage/YourPage.tsx

# 2. Add route in src/App.tsx
<Route path="your-page" element={<YourPage />} />

# 3. Add navigation item in src/components/layout/navigation.config.ts
{
  id: 'your-page',
  label: 'Your Page',
  path: '/your-page',
  icon: YourIcon,
  permission: 'your_permission',
}
```

### 2. Adding a New Permission

```typescript
// 1. Add to Permission type (auth/types.ts)
export type Permission =
  | 'existing_permissions'
  | 'your_new_permission';

// 2. Add to appropriate roles (auth/types.ts)
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'existing_permissions',
    'your_new_permission',
  ],
  // ... other roles
};

// 3. Use in components
<Protect permission="your_new_permission">
  <YourComponent />
</Protect>
```

### 3. Creating Protected Components

```tsx
import { Protect } from '@/components/protected/Protect';
import { usePermission } from '@/auth/hooks/usePermission';

function YourComponent() {
  const { hasPermission } = usePermission();

  return (
    <div>
      {/* Imperative approach */}
      {hasPermission('your_permission') && (
        <SensitiveData />
      )}

      {/* Declarative approach */}
      <Protect permission="your_permission">
        <SensitiveData />
      </Protect>
    </div>
  );
}
```

## Project Structure Conventions

### File Naming
- Components: PascalCase (e.g., `ClientsPage.tsx`)
- Utilities/Hooks: camelCase (e.g., `usePermission.ts`)
- Types: PascalCase (e.g., `types.ts`)
- Config: camelCase (e.g., `navigation.config.ts`)

### Import Aliases
Use `@/` for absolute imports from `src/`:

```typescript
import { usePermission } from '@/auth/hooks/usePermission';
import { Protect } from '@/components/protected/Protect';
import { theme } from '@/theme/theme';
```

### Component Structure

```tsx
// 1. Imports
import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { usePermission } from '@/auth/hooks/usePermission';

// 2. Types/Interfaces
interface Props {
  id: string;
  name: string;
}

// 3. Component
export const YourComponent = ({ id, name }: Props) => {
  // Hooks
  const { hasPermission } = usePermission();
  const [state, setState] = useState();

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    <Box>
      {/* Content */}
    </Box>
  );
};
```

## Styling Guidelines

### Use MUI Components
Prefer MUI components over custom HTML elements:

```tsx
// Good
<Box sx={{ p: 2 }}>
  <Typography variant="h6">Title</Typography>
  <Button size="small">Action</Button>
</Box>

// Avoid
<div style={{ padding: '16px' }}>
  <h6>Title</h6>
  <button>Action</button>
</div>
```

### Compact Mode Requirements
Always use `size="small"` for form inputs and buttons:

```tsx
// Good
<TextField size="small" />
<Button size="small" />
<Table size="small" />

// Bad
<TextField /> // Uses medium by default
<Button /> // Uses medium by default
```

### Spacing
Use MUI spacing units (1 unit = 8px):

```tsx
<Box sx={{ p: 2 }}>      // 16px padding
<Box sx={{ mt: 3 }}>     // 24px margin-top
<Box sx={{ gap: 1 }}>    // 8px gap
```

## State Management

### Zustand Store Pattern

```typescript
import { create } from 'zustand';

interface YourStore {
  data: YourData[];
  isLoading: boolean;
  
  // Actions
  fetchData: () => Promise<void>;
  updateData: (id: string, data: YourData) => void;
}

export const useYourStore = create<YourStore>((set, get) => ({
  data: [],
  isLoading: false,
  
  fetchData: async () => {
    set({ isLoading: true });
    const data = await api.fetchData();
    set({ data, isLoading: false });
  },
  
  updateData: (id, newData) => {
    set(state => ({
      data: state.data.map(item => 
        item.id === id ? newData : item
      ),
    }));
  },
}));
```

## Testing Different User Roles

### Quick Role Switching
1. Login as different users using the quick login buttons
2. Observe how the UI changes based on permissions
3. Check that sensitive data is properly protected

### What to Test for Each Role

**Super Admin**
- ✓ Can see all navigation items
- ✓ Can access Agent Management page
- ✓ Can view and edit all data
- ✓ Can see financial information
- ✓ Can view contact information

**Branch Manager**
- ✓ Can see most navigation items
- ✗ Cannot see Agent Management page
- ✓ Can view and edit branch data
- ✓ Can view financial information
- ✓ Can view contact information

**Agent**
- ✓ Can see basic navigation items
- ✗ Cannot see Agent Management page
- ✓ Can create and edit clients
- ✓ Can create applications
- ✗ Cannot view full financial data
- ✓ Can view contact information

**Intern**
- ✓ Can see limited navigation items
- ✗ Cannot see Agent Management page
- ✓ Can view clients (read-only)
- ✗ Cannot edit or create
- ✗ Cannot view financial data
- ✗ Contact info shows as [Restricted]

## Common Development Tasks

### Adding a Table with Permissions

```tsx
import { 
  Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow 
} from '@mui/material';
import { Protect } from '@/components/protected/Protect';

function DataTable() {
  const { hasPermission } = usePermission();

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            {hasPermission('view_contact_info') && (
              <TableCell>Phone</TableCell>
            )}
            {hasPermission('view_finance') && (
              <TableCell>Revenue</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>
                <Protect permission="view_contact_info" fallback="redact">
                  {row.phone}
                </Protect>
              </TableCell>
              <TableCell>
                <Protect permission="view_finance" fallback="redact">
                  ${row.revenue}
                </Protect>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
```

### Adding a Form with Validation

```tsx
import { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';

function ClientForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        size="small"
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        size="small"
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        size="small"
        label="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" size="small">
        Submit
      </Button>
    </Box>
  );
}
```

## API Integration

### Setting Up API Client

```typescript
// src/utils/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });
    return response.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

function getToken() {
  // Get token from auth store
  return useAuthStore.getState().token;
}
```

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Immigration CRM
VITE_TENANT_ID=your-tenant-id
```

Access in code:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load pages
import { lazy, Suspense } from 'react';

const ClientsPage = lazy(() => import('./pages/Clients/ClientsPage'));

// In routes
<Route 
  path="clients" 
  element={
    <Suspense fallback={<Loading />}>
      <ClientsPage />
    </Suspense>
  } 
/>
```

### Memoization

```tsx
import { useMemo, useCallback } from 'react';

function DataTable({ data, filters }) {
  // Memoize expensive computations
  const filteredData = useMemo(() => {
    return data.filter(item => 
      matchesFilters(item, filters)
    );
  }, [data, filters]);

  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);

  return (
    // Render
  );
}
```

## Troubleshooting

### Build Errors

**Error: Cannot find module '@/...'**
- Check `tsconfig.json` has correct path mapping
- Restart TypeScript server in VSCode: Cmd+Shift+P → "Restart TS Server"

**Error: Module not found**
- Run `npm install` to ensure all dependencies are installed
- Check import path is correct

### Runtime Errors

**User permissions not working**
- Verify user is logged in: Check `useAuthStore.getState().user`
- Check permission spelling matches exactly
- Verify role has the permission in `ROLE_PERMISSIONS`

**Navigation not showing**
- Check navigation item has correct permission
- Verify user role includes that permission
- Check `filterNavByPermissions` is being called

### Styling Issues

**Components too large**
- Ensure `size="small"` is set on components
- Check theme is properly applied
- Verify custom theme overrides are loading

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub/GitLab
```

### Commit Message Format

```
feat: add new feature
fix: fix bug description
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: update dependencies
```

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Environment-Specific Builds

```bash
# Production
npm run build

# Staging
VITE_API_URL=https://staging-api.example.com npm run build

# Development
npm run dev
```

### Deploy to Vercel/Netlify

1. Connect your Git repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables in dashboard

## Additional Resources

- [React Documentation](https://react.dev)
- [Material-UI Documentation](https://mui.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev)

## Support

For questions or issues:
1. Check this documentation first
2. Review ARCHITECTURE.md and RBAC_GUIDE.md
3. Check existing issues on GitHub
4. Contact the development team

