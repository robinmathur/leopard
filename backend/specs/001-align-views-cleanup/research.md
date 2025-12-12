# Research: Align Views & Cleanup

## Centralized schemas for tasks/notifications
- **Decision**: Mirror the client/branch/visa pattern by defining shared task and notification schemas/serializers in a single module and having all viewsets import from there.
- **Rationale**: Reduces drift, enables single-point updates, and aligns with existing successful pattern.
- **Alternatives considered**: Keep scattered serializers per view (rejected: duplication risk); introduce a separate schema package (rejected: overkill for current scope).

## Backward compatibility strategy
- **Decision**: Preserve existing request/response shapes and status codes; add regression smoke tests for primary task/notification endpoints before refactor.
- **Rationale**: Spec requires no behavioral change; tests provide safety net during consolidation.
- **Alternatives considered**: Opportunistic contract tweaks (rejected: violates compatibility and scope).

## Unused/duplicate code removal
- **Decision**: Use static checks (ruff/flake8 rules already in repo) plus targeted grep to find unused imports/branches; remove only code with zero runtime references and no scheduled use.
- **Rationale**: Minimizes risk of removing latent dependencies; aligns with cleanup goal.
- **Alternatives considered**: Broad sweeping deletions without verification (rejected: high regression risk).

## Constants and enums
- **Decision**: Consolidate repeated literals (statuses, types, channels) into `immigration/constants.py` or a focused module; refactor call sites to reference these symbols.
- **Rationale**: Improves traceability and prevents string drift across endpoints.
- **Alternatives considered**: Leave literals in place (rejected: contradicts spec); create multiple domain-specific constant files (deferred unless size demands splitting).

## Environment-specific settings
- **Decision**: Extend `leopard/settings.py` (or per-environment overlay) to load env-driven values for domains/feature flags/integration endpoints with validation and sane defaults.
- **Rationale**: Meets requirement for environment-specific configuration without code edits; fits Django settings pattern.
- **Alternatives considered**: Per-module hard-coded values (rejected: not environment-aware); new config service (rejected: over-scoped).
