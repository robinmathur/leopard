# Immigration CRM - Multi-Tenant SaaS Application

A comprehensive Multi-Tenant SaaS CRM system designed for Immigration and Study Abroad agents with robust Role-Based Access Control (RBAC).

## Features

- **Multi-Tenant Architecture**: Supports multiple organizations with complete data isolation
- **Role-Based Access Control**: Granular permissions for Super Admin, Branch Manager, Agent, and Intern roles
- **Compact UI**: High-density interface optimized for maximum data visibility
- **Responsive Layout**: Modern dashboard with collapsible sidebar and global navigation
- **Type-Safe**: Built with TypeScript for enhanced developer experience

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI v5** for component library
- **React Router DOM v6** for routing
- **Zustand** for state management
- **Emotion** for CSS-in-JS styling

## Getting Started

### Prerequisites

- Node.js 18+ and npm

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
```

## Project Structure

```
src/
├── auth/                    # Authentication and authorization
│   ├── guards/             # Permission guards
│   ├── hooks/              # Auth hooks (usePermission, useAuth)
│   └── types.ts            # Auth types and interfaces
├── components/             # Reusable components
│   ├── layout/            # Layout components
│   ├── common/            # Common UI components
│   └── protected/         # Permission-wrapped components
├── pages/                  # Page components
│   ├── Dashboard/
│   ├── Clients/
│   ├── Leads/
│   ├── VisaApplications/
│   ├── Institute/
│   └── Agent/
├── store/                  # Zustand store
│   ├── authStore.ts       # Authentication state
│   └── index.ts           # Store exports
├── theme/                  # MUI theme configuration
│   └── theme.ts           # Custom theme (compact mode)
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions
```

## RBAC Implementation

### Roles

- **Super Admin**: Full system access
- **Branch Manager**: Branch-level management and oversight
- **Agent**: Client and application management
- **Intern**: Limited read access

### Permission Control

The system implements two levels of permission control:

1. **Page-Level**: Controls visibility of entire pages/routes
2. **Component-Level**: Controls visibility of specific fields and actions

### Usage Examples

```tsx
// Using the usePermission hook
const { hasPermission } = usePermission();

if (hasPermission('view_contact_info')) {
  // Show contact information
}

// Using the Protect component
<Protect permission="can_view_finance">
  <FinancialData />
</Protect>
```

## Development Guidelines

- Use `size="small"` for all form inputs and buttons
- Minimize whitespace for high data density
- Hide or redact UI elements when permissions are insufficient
- Use TypeScript strictly - no `any` types
- Follow the established folder structure

## License

Proprietary - All rights reserved

