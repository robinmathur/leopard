# Test Scripts

This folder contains development test scripts for verifying critical system requirements.

## Folder Structure

```
tests/
├── integration/    # Multi-component user journey tests
├── rbac/          # RBAC permission matrix tests  
└── tenant/        # Tenant isolation verification tests
```

## Test Categories

### Integration Tests (`integration/`)

Tests that verify complete user journeys across multiple components and API endpoints.

**Examples**:
- Create client → Assign agent → Create visa application → Track status
- User login → Dashboard load → Navigate to clients → View client details
- Branch Manager creates lead → Assigns to agent → Agent converts to client

**Purpose**: Ensure features work end-to-end as users experience them.

### RBAC Tests (`rbac/`)

Tests that verify role-based access control for all protected resources.

**Test Matrix** (role × resource × action):
| Role | Resource | Can Create | Can Read | Can Update | Can Delete |
|------|----------|-----------|----------|------------|------------|
| Super Admin | All | ✅ | ✅ | ✅ | ✅ |
| Branch Manager | Clients in branch | ✅ | ✅ | ✅ | ❌ |
| Agent | Assigned clients | ✅ | ✅ | ✅ | ❌ |
| Intern | Assigned clients | ❌ | ✅ | ❌ | ❌ |

**Purpose**: Verify permission enforcement prevents unauthorized access.

### Tenant Isolation Tests (`tenant/`)

Tests that verify multi-tenant data isolation.

**Critical Scenarios**:
- User from Tenant A cannot access Tenant B's clients
- API queries without tenant_id are rejected
- Switching tenant context requires re-authentication
- Bulk operations stay within tenant boundaries
- Search results exclude other tenants

**Purpose**: Prevent cross-tenant data leakage (security critical).

## Running Tests

```bash
# Install test dependencies (add to package.json as needed)
npm install --save-dev vitest @testing-library/react @testing-library/user-event

# Run all tests
npm test

# Run specific test category
npm test -- tests/rbac
npm test -- tests/tenant
npm test -- tests/integration

# Run with coverage
npm test -- --coverage
```

## Writing Tests

### Test Structure Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature: [User Story Name]', () => {
  beforeEach(() => {
    // Setup test environment, mock API, etc.
  });

  describe('RBAC', () => {
    it('should allow Super Admin to [action]', () => {
      // Test implementation
    });

    it('should deny Intern from [action]', () => {
      // Test implementation
    });
  });

  describe('Tenant Isolation', () => {
    it('should not return clients from other tenants', () => {
      // Test implementation
    });
  });

  describe('Integration', () => {
    it('should complete [user journey] successfully', () => {
      // Test implementation
    });
  });
});
```

### Best Practices

1. **Test Names**: Use descriptive names that explain what is being tested and expected outcome
2. **Arrange-Act-Assert**: Structure tests clearly (setup → execute → verify)
3. **Mock External APIs**: Use mock data matching OpenAPI spec
4. **Test Both Success and Failure**: Test happy path and error handling
5. **Isolation**: Tests should not depend on each other's state
6. **Realistic Data**: Use data representative of production scenarios

## Coverage Goals

- **Critical Paths** (RBAC, Tenant, Auth): 100% coverage required
- **Business Logic**: 80% coverage target
- **UI Components**: 60% coverage target (focus on interactive logic)

## CI/CD Integration

Tests in this folder should run:
- **Pre-commit**: Fast unit tests (<1s)
- **Pre-merge**: All tests including integration (<30s)
- **Pre-deploy**: Full suite with API contract validation (<2min)

## References

- Constitution: `.specify/memory/constitution.md` (Principle V: Test-First for Critical Paths)
- OpenAPI Spec: `dev/openapi-spec.yaml` (API contracts to test against)
- RBAC Types: `src/auth/types.ts` (Permission definitions)
