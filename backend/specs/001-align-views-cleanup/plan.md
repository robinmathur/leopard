# Implementation Plan: Align Views & Cleanup

**Branch**: `001-align-views-cleanup` | **Date**: 2025-12-09 | **Spec**: `/Users/robinmathur/Documents/workspace/leopard/specs/001-align-views-cleanup/spec.md`
**Input**: Feature specification from `/specs/001-align-views-cleanup/spec.md`

## Summary

Align task and notification views to match the centralized schema pattern used by client/branch/visa, remove unused/duplicate code, standardize constants to traceable enums, and introduce environment-specific configuration with validation—while keeping API behavior backward compatible.

## Technical Context

**Language/Version**: Python 3.8+, Django 4.2.6 (per project baseline)  
**Primary Dependencies**: Django, Django REST Framework (current API stack), ruff for linting  
**Storage**: Relational DB (assume PostgreSQL as current deployment default)  
**Testing**: pytest (per repo guidance), ruff check for static linting  
**Target Platform**: Linux server deployment (Daphne/nginx in repo)  
**Project Type**: Web backend (single Django project)  
**Performance Goals**: Maintain current API latency/throughput; no regressions in task/notification endpoints  
**Constraints**: Preserve public API shapes; avoid downtime; keep schemas single-sourced for tasks/notifications  
**Scale/Scope**: Existing CRM usage; focus on task/notification endpoints plus shared constants/settings

## Constitution Check

No explicit principles defined in `.specify/memory/constitution.md`; proceed with implicit gates: keep scope minimal, preserve backward compatibility, ensure testability. Status: PASS (no violations).

## Project Structure

### Documentation (this feature)

```text
specs/001-align-views-cleanup/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
immigration/
├── api/v1/
│   ├── serializers/
│   └── views/           # task, notification, client, branch, visa, etc.
├── constants.py         # domain constants (to be cleaned/centralized)
├── services/            # business logic per domain
├── models/              # Django models (task, notification, client, etc.)
└── utils/               # shared utilities

leopard/
├── settings.py          # environment configuration
└── urls.py

deployment/              # deployment scripts (nginx, daphne)
```

**Structure Decision**: Single Django backend; focus areas are `immigration/api/v1/views`, shared serializers/schemas, `immigration/constants.py`, and environment settings in `leopard/settings.py`.

## Complexity Tracking

No constitution violations; table not required.
