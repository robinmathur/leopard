<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0 (MAJOR: Initial constitution creation)

Modified Principles: N/A (new document)

Added Sections:
- Core Principles (6 principles)
  - I. Component Reusability First
  - II. OpenAPI-Driven API Integration
  - III. UX Excellence & Accessibility
  - IV. Performance Optimization
  - V. Testing & Quality Assurance
  - VI. Code Quality Standards
- Technology Stack & Constraints
- Development Workflow

Removed Sections: N/A (new document)

Templates Requiring Updates:
- .specify/templates/plan-template.md ✅ (Constitution Check section compatible)
- .specify/templates/spec-template.md ✅ (Requirements align with principles)
- .specify/templates/tasks-template.md ✅ (Task phases align with principles)

Follow-up TODOs: None
-->

# LeopardUI Modern Constitution

## Developer Context

**Role**: Senior UX and Front-end Developer  
**Primary Focus**: Building reusable, accessible, and performant React components for the
Immigration CRM multi-tenant SaaS application.

## Core Principles

### I. Component Reusability First

Every UI component MUST be evaluated for reusability before implementation.

- **Atomic Design**: Components MUST follow atomic design principles (atoms, molecules, organisms)
- **Prop-Driven Configuration**: Components MUST expose configuration via props rather than
  hardcoded values; avoid internal state where possible
- **Single Responsibility**: Each component MUST have one clear purpose; split complex components
  into composable pieces
- **Generic Before Specific**: Create generic components first (`DataTable`, `FormField`), then
  compose specific instances (`ClientTable`, `ClientForm`)
- **Style Isolation**: Use MUI `sx` prop or Emotion styled components; avoid global CSS that
  leaks between components
- **Documentation**: Every reusable component MUST include JSDoc with usage examples and
  prop descriptions

**Rationale**: Reusable components reduce code duplication, ensure UI consistency across the
multi-tenant application, and accelerate feature development.

### II. OpenAPI-Driven API Integration

All API integrations MUST reference and comply with the OpenAPI specification at
`dev/openapi-spec.yaml`.

- **Spec First**: Before implementing any API call, developers MUST verify the endpoint exists
  in `dev/openapi-spec.yaml` and understand its request/response schema
- **Type Generation**: TypeScript types for API requests and responses SHOULD be derived from
  or validated against the OpenAPI spec
- **Missing API Detection**: If a required API endpoint is missing from the spec, developers
  MUST flag it and suggest additions before implementing workarounds
- **Error Handling**: API error responses MUST be handled according to the spec's error schemas
  (400, 401, 403, 404 patterns defined in OpenAPI)
- **RBAC Compliance**: All API calls MUST respect the role-based access control scoping defined
  in the spec (tenant, branch, region isolation)
- **Performance Recommendations**: Developers SHOULD recommend alternative APIs if performance
  analysis indicates better options (e.g., batch endpoints vs. multiple single requests)

**Rationale**: The OpenAPI spec is the contract between frontend and backend. Strict adherence
prevents integration bugs and ensures type safety.

### III. UX Excellence & Accessibility

All UI implementations MUST prioritize user experience and accessibility.

- **Compact UI Compliance**: Adhere to the established compact theme (small sizes, reduced
  padding, 13px base font) for high data density
- **Keyboard Navigation**: All interactive elements MUST be keyboard accessible with visible
  focus indicators
- **ARIA Compliance**: Use semantic HTML and proper ARIA attributes; MUI components provide
  defaults but MUST be verified
- **Loading States**: All async operations MUST show appropriate loading indicators
- **Error Feedback**: User-facing errors MUST be clear, actionable, and non-technical
- **Responsive Design**: Components MUST function on screens from 320px to 4K; test at common
  breakpoints (sm, md, lg, xl)
- **UX Recommendations**: If implementation instructions result in suboptimal UX, developers
  MUST suggest improvements before proceeding

**Rationale**: Immigration agents use the CRM intensively; poor UX directly impacts productivity
and data accuracy.

### IV. Performance Optimization

All features MUST be implemented with performance as a primary concern.

- **Bundle Size**: New dependencies MUST be evaluated for bundle impact; prefer tree-shakeable
  libraries
- **Render Optimization**: Use `React.memo`, `useMemo`, and `useCallback` appropriately; avoid
  unnecessary re-renders
- **Data Fetching**: Implement pagination, infinite scroll, or virtualization for large datasets
  (clients list can exceed 10K records)
- **State Management**: Use Zustand selectors to prevent unnecessary component updates;
  avoid storing derived data in state
- **Lazy Loading**: Route-level code splitting via `React.lazy` for pages; large components
  SHOULD be dynamically imported
- **Image Optimization**: Use appropriate formats, lazy loading, and sizing for any images

**Rationale**: The CRM handles large datasets across multi-tenant environments; performance
directly affects user productivity.

### V. Testing & Quality Assurance

Features MUST include appropriate test coverage before being considered complete.

- **Component Testing**: Reusable components MUST have unit tests covering props, states,
  and user interactions using React Testing Library
- **Integration Tests**: User flows (login, client creation, RBAC enforcement) MUST have
  integration tests
- **Contract Tests**: API integrations SHOULD have contract tests validating against
  OpenAPI spec schemas
- **RBAC Testing**: Permission-based UI elements MUST be tested across all role configurations
  (Super Admin, Branch Manager, Agent, Intern)
- **Accessibility Testing**: Run automated accessibility checks (axe-core) on new components
- **Test Location**: Tests reside in `dev/tests/` organized by type (integration, rbac, tenant)

**Rationale**: Multi-tenant RBAC systems have complex permission interactions; comprehensive
testing prevents security and data isolation issues.

### VI. Code Quality Standards

All code MUST meet established quality standards for the TypeScript/React ecosystem.

- **TypeScript Strict Mode**: No `any` types except when interfacing with untyped libraries;
  prefer explicit typing over inference for public APIs
- **ESLint Compliance**: All code MUST pass ESLint checks without warnings; no disabled rules
  without documented justification
- **Naming Conventions**: PascalCase for components/types, camelCase for functions/variables,
  SCREAMING_SNAKE_CASE for constants
- **File Organization**: One component per file; co-locate tests, styles, and types with
  components when specific to that component
- **Import Structure**: Group imports: React → external libs → internal absolute → relative;
  no circular dependencies
- **Zustand Patterns**: Follow established store patterns in `src/store/`; separate actions
  from state; use immer for complex updates if needed

**Rationale**: Consistent code quality reduces cognitive load, speeds up code reviews, and
prevents common bugs.

## Technology Stack & Constraints

**Core Stack**:
- React 18 with TypeScript (strict mode)
- Vite for development and building
- Material-UI v5 as component library
- Zustand for state management
- React Router DOM v6 for routing
- Emotion for CSS-in-JS

**Development Environment**:
- Mock Service Worker (MSW) with handlers in `dev/mock-server/`
- OpenAPI spec at `dev/openapi-spec.yaml`
- Integration tests in `dev/tests/`

**Constraints**:
- Browser support: Modern evergreen browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Bundle size budget: < 500KB initial JS (gzipped)
- First Contentful Paint: < 1.5s on 4G
- Time to Interactive: < 3s on 4G

## Development Workflow

**Pre-Implementation Checklist**:
1. Review OpenAPI spec for required endpoints
2. Identify reusable component opportunities
3. Plan RBAC implications
4. Consider UX/accessibility requirements

**Implementation Flow**:
1. Create/update types from OpenAPI contracts
2. Build reusable components (if applicable)
3. Implement feature-specific components
4. Add Zustand state management
5. Integrate with API layer
6. Add tests
7. Verify ESLint and TypeScript compliance

**Code Review Gates**:
- Constitution principle compliance verified
- No ESLint warnings
- TypeScript strict mode passes
- Component reusability assessed
- OpenAPI alignment confirmed
- Accessibility basics met

## Governance

This constitution supersedes all other development practices for the LeopardUI Modern project.

**Amendment Process**:
1. Propose change with rationale
2. Assess impact on existing code and templates
3. Update constitution with version increment
4. Update dependent templates if needed
5. Document in Sync Impact Report

**Version Policy**:
- MAJOR: Backward-incompatible principle changes or removals
- MINOR: New principles or significant guidance additions
- PATCH: Clarifications, typos, non-breaking refinements

**Compliance Review**:
- All PRs must verify constitutional compliance
- Violations require documented justification
- Use `AGENTS.md` for runtime AI agent guidance

**Version**: 1.0.0 | **Ratified**: 2025-12-12 | **Last Amended**: 2025-12-12
