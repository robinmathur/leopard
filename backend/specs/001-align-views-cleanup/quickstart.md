# Quickstart: Align Views & Cleanup

1. **Install dependencies**
   - `pip install -r requirements.txt`
2. **Run linting**
   - `ruff check .`
3. **Run tests**
   - `cd src` (if tests live there per repo guidance) then `pytest`
4. **Environment config**
   - Export env vars for environment-specific settings (domains, feature flags, integration endpoints) before running server. Key vars now supported: `TASKS_DUE_SOON_DEFAULT_DAYS`, `TASKS_INCLUDE_OVERDUE_DEFAULT`, `NOTIFICATIONS_INCLUDE_READ_DEFAULT`, `NOTIFICATION_STREAM_ALLOWED_ORIGIN`, plus existing secrets/DB settings.
5. **Dev server**
   - `python manage.py runserver` (ensure env vars loaded).

### Refactor validation steps
- Confirm task/notification views import shared schemas from the centralized module.
- Verify constants/enums replace string literals in touched modules.
- Run smoke tests for task and notification APIs to ensure unchanged responses.
- Validate missing/invalid env vars fail fast at startup.
