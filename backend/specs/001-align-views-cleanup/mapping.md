# Mapping: Task & Notification schemas/views

Purpose: capture current locations for alignment work.

- Task serializers: `immigration/api/v1/serializers/task.py`
- Task views: `immigration/api/v1/views/tasks.py`
- Notification serializers: `immigration/api/v1/serializers/notification.py`
- Notification views: `immigration/api/v1/views/notifications.py`
- Router: `immigration/api/v1/routers.py` (ensures centralized serializers wired)

Reference pattern: client/branch/visa schemas centralized under `immigration/api/v1/serializers/` with views importing.

Notes: Baseline samples captured in `dev/responses/tasks.json` and `dev/responses/notifications.json` for regression reference.
