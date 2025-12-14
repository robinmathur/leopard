# This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leopard is a multi-tenant SaaS Immigration CRM system with Django REST Framework backend and React TypeScript frontend. The system implements granular role-based access control (RBAC) with complete data isolation between tenants.

## Common Development Commands

### Backend (Django + uv)

```bash
cd backend

# Development server
uv run python manage.py runserver

# Database migrations
uv run python manage.py makemigrations
uv run python manage.py migrate

# Create admin user
uv run python manage.py createsuperuser --username admin --email admin@example.com

# Testing
uv run pytest                        # Run all tests
uv run pytest path/to/test_file.py  # Run specific test file
uv run pytest -k test_name          # Run specific test

# Code quality
uv run black .                       # Format code
uv run ruff check .                  # Lint code

# Management commands
uv run python manage.py seed_data             # Seed test data
uv run python manage.py setup_role_permissions # Setup RBAC groups
uv run python manage.py process_reminders      # Process scheduled reminders

# Dependencies
uv sync                # Install dependencies
uv add package-name    # Add new package
```

### Frontend (React + Vite)

```bash
cd frontend

# Development server (runs on http://localhost:5173)
npm run dev

# Build & preview
npm run build
npm run preview

# Code quality
npm run lint
npm run typecheck
```

### Docker

```bash
# Start PostgreSQL database
docker-compose up -d

# Stop database
docker-compose down
```

## Architecture Overview

### Backend: Service/Selector Pattern

The backend follows a strict **service/selector pattern** to separate read and write operations:

**Models** (`backend/immigration/models/`):
- All major models inherit from `SoftDeletionModel` (soft delete with `deleted_at`) and `LifeCycleModel` (audit trail)
- Multi-tenancy hierarchy: `Tenant` → `Region` → `Branch` → `User`
- Key models: `User`, `Client`, `Task`, `Notification`, `VisaApplication`, `Branch`, `Region`, `Tenant`

**Selectors** (`backend/immigration/selectors/`):
- Handle **read operations** (GET)
- Return QuerySets with automatic role-based filtering
- Scope data by user's role:
  - `CONSULTANT`/`BRANCH_ADMIN`: Own branch only
  - `REGION_MANAGER`: All branches in their regions
  - `SUPER_ADMIN`: Entire tenant
  - `SUPER_SUPER_ADMIN`: System-wide
- Example: `client_list(user=user, filters={})` automatically filters based on role

**Services** (`backend/immigration/services/`):
- Handle **write operations** (POST, PATCH, DELETE)
- Use Pydantic models for input validation (e.g., `ClientCreateInput`)
- Wrapped in `@transaction.atomic` decorators
- Example: `client_create(data, user)`, `client_update(client_id, data, user)`

**API Layer** (`backend/immigration/api/v1/`):
- ViewSets orchestrate but contain **no business logic**
- Thin serializers for JSON serialization:
  - `*OutputSerializer`: GET responses (ModelSerializer)
  - `*CreateSerializer`: POST requests (Serializer with validation)
  - `*UpdateSerializer`: PATCH/PUT requests
- All endpoints registered in `routers.py`
- Custom DRF permissions in `permissions.py` (e.g., `CanManageClients`, `RoleBasedPermission`)

**Authentication & RBAC**:
- JWT authentication (Simple JWT) with access/refresh tokens
- Roles via **Django Groups** (NO custom role field):
  - `SUPER_SUPER_ADMIN`, `SUPER_ADMIN`, `REGION_MANAGER`, `BRANCH_ADMIN`, `CONSULTANT`
- `CurrentUserMiddleware`: Thread-local user storage via `get_current_user()`
- Only `SUPER_SUPER_ADMIN` and `SUPER_ADMIN` can create users

**Real-time Features**:
- Server-Sent Events (SSE), NOT WebSockets
- Endpoint: `/api/v1/notifications/stream/`
- Notifications triggered by signals (currently disabled in `apps.py`)

### Frontend: React + Zustand + Material-UI

**State Management** (`frontend/src/store/`):
- Zustand stores (lightweight, no Redux):
  - `authStore.ts`: Authentication, JWT tokens, permissions
  - `clientStore.ts`: Client list and filters
  - `clientDetailStore.ts`: Single client details
  - `noteStore.ts`, `timelineStore.ts`: Feature-specific state

**API Services** (`frontend/src/services/api/`):
- `httpClient.ts`: Axios instance with interceptors
  - Auto-injects JWT Bearer token
  - Auto-refreshes token on 401 errors
  - Queues failed requests during token refresh
- One service file per resource: `clientApi.ts`, `taskApi.ts`, etc.
- Example: `clientApi.list()`, `clientApi.create(data)`

**Routing**:
- React Router v6 in `App.tsx`
- `ProtectedRoute` component checks `isAuthenticated` from authStore
- Layout: `DashboardLayout` with `AppBar`, `Sidebar`, and `<Outlet>`

**Types** (`frontend/src/types/`):
- TypeScript interfaces mirror backend serializers
- Enums: `ClientStage`, `Gender`, `UserRole`, `Permission`

**Component Structure**:
- `layout/`: Dashboard layout, navigation
- `shared/`: Reusable components (TaskList, Notes, Timeline)
- `clients/`, `leads/`, etc.: Feature-specific components
- Follows Atomic Design principles per constitution

### Constitution & Development Standards

The frontend follows strict standards defined in `.specify/memory/constitution.md`:

1. **Component Reusability First**: Atomic design, prop-driven configuration, generic before specific
2. **OpenAPI-Driven API Integration**: All API calls must reference `dev/openapi-spec.yaml`
3. **UX Excellence & Accessibility**: Compact UI, keyboard navigation, ARIA compliance
4. **Performance Optimization**: Bundle size < 500KB, render optimization, virtualization for large datasets
5. **Testing & Quality**: Unit tests for components, integration tests for flows, RBAC testing
6. **Code Quality**: TypeScript strict mode, ESLint compliance, no `any` types

## Critical Patterns & Conventions

### Backend

1. **Always use service/selector pattern**:
   - Views must NEVER contain business logic
   - Use selectors for read, services for write

2. **Soft deletion is default**:
   - Use `.delete()` (soft delete), not `.hard_delete()`
   - Use `.restore()` to undelete

3. **Multi-tenant scoping is automatic**:
   - Selectors automatically filter by role
   - No manual filtering needed in views

4. **Input validation layers**:
   - Pydantic models for service inputs
   - DRF Serializers for API validation

5. **Lifecycle tracking**:
   - Models auto-track created_by, created_at, updated_by, updated_at
   - Services must pass `user` parameter

### Frontend

1. **State management**:
   - Zustand for global state (auth, client list)
   - Local state (useState) for component-specific state

2. **Authentication flow**:
   - Login → Store tokens in localStorage → Fetch user profile → Navigate to dashboard
   - httpClient auto-refreshes tokens on 401

3. **Permission-based UI**:
   - `authStore.hasPermission(permission)` for conditional rendering
   - Example: Hide "Delete" button if user lacks `delete_client` permission

4. **Type safety**:
   - All API responses typed with interfaces
   - Backend serializers mirror frontend types

## Important Files & Entry Points

### Backend
- `backend/leopard/settings.py` - Django configuration
- `backend/leopard/urls.py` - URL routing
- `backend/immigration/api/v1/routers.py` - API endpoint registration
- `backend/immigration/constants.py` - Enums and constants (groups, stages, etc.)
- `backend/immigration/models/__init__.py` - Model imports

### Frontend
- `frontend/src/main.tsx` - Application bootstrap
- `frontend/src/App.tsx` - Routing configuration
- `frontend/src/store/authStore.ts` - Authentication logic
- `frontend/src/services/api/httpClient.ts` - HTTP client setup
- `frontend/src/types/` - TypeScript type definitions

### Configuration
- `backend/.env` - Environment variables (DB, secrets)
- `backend/pyproject.toml` - Python dependencies (managed by uv)
- `frontend/package.json` - Node dependencies
- `frontend/vite.config.ts` - Vite build configuration

## Database & Models

### Key Constraints
- **Indexes**: All foreign keys and common filters are indexed
- **Unique Together**: `Branch[tenant, name]`, `Tenant[name]`, `Tenant[domain]`
- **GenericForeignKey**: `Task.linked_entity` can link to any model (Client, VisaApplication, etc.)

### Custom Managers
- `objects`: Excludes soft-deleted records (default)
- `all_objects`: Includes soft-deleted records

## API Endpoints

- REST API: `http://localhost:8000/api/v1/`
- Admin Panel: `http://localhost:8000/admin/`
- OpenAPI Schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/docs/`
- Authentication: `http://localhost:8000/api/token/` (login), `http://localhost:8000/api/token/refresh/`

## Development Workflows

### Adding a New Model
1. Create model in `backend/immigration/models/`
2. Import in `backend/immigration/models/__init__.py`
3. Run `uv run python manage.py makemigrations`
4. Run `uv run python manage.py migrate`

### Adding a New API Endpoint
1. Create service/selector functions
2. Create ViewSet in `backend/immigration/api/v1/views/`
3. Create serializers in `backend/immigration/api/v1/serializers/`
4. Register in `backend/immigration/api/v1/routers.py`
5. (Optional) Add permissions in `backend/immigration/api/v1/permissions.py`

### Adding a Frontend Feature
1. Create page component in `frontend/src/pages/`
2. Add route to `frontend/src/App.tsx`
3. Create API service in `frontend/src/services/api/`
4. Add Zustand store if needed in `frontend/src/store/`
5. Create TypeScript types in `frontend/src/types/`

## Testing

### Backend
- Tests located in `backend/` root: `test_*.py`
- Run with: `uv run pytest`
- Run specific test: `uv run pytest path/to/test_file.py -k test_name`
- Coverage: `uv run pytest --cov`

### Frontend
- Tests in `frontend/dev/tests/` (integration, RBAC, tenant tests)
- Mock Service Worker (MSW) in `frontend/dev/mock-server/`
- Enable mocks: `VITE_ENABLE_MOCK=true`

## Important Notes

1. **Signals are currently DISABLED** in `backend/immigration/apps.py` - check before relying on them
2. **Real-time via SSE, NOT WebSockets** - ASGI configured but WebSocket routing disabled
3. **Use Django Groups for roles** - NO custom role field on User model
4. **Thread-local user access** - Use `get_current_user()` from `CurrentUserMiddleware`
5. **Soft deletion by default** - `.delete()` doesn't permanently remove records
6. **Frontend uses compact UI theme** - 13px base font, reduced padding for high data density
7. **OpenAPI spec is source of truth** - Check `dev/openapi-spec.yaml` before implementing API calls

## Deployment

- ASGI server: Daphne (for SSE support)
- Database: PostgreSQL (required, not SQLite)
- Static files: WhiteNoise
- Deployment scripts: `backend/deployment/`
- Browser support: Modern evergreen browsers (latest 2 versions)
- Bundle size budget: < 500KB initial JS (gzipped)
