# Calendar Event Permissions Guide

## Overview
The calendar system implements a **permission-based visibility** model where users can see different events based on their permissions and roles.

## Permission Model

### 1. **Own Events (Always Visible)**
- **Permission Required**: NONE
- **What You See**: Events assigned to YOU
- **Logic**: Every user can ALWAYS see events where `assigned_to = current_user`
- **Code Location**: `backend/immigration/selectors/events.py:event_list()`

```python
# Always include own events
own_events_filter = Q(assigned_to=user)
```

### 2. **Team Events (Requires Permission)**
- **Permission Required**: `immigration.view_team_events`
- **What You See**: Events assigned to users in your scope (branch/region)
- **Scoping Rules**:
  - **CONSULTANT / BRANCH_ADMIN**: See events of users in same **branches**
  - **REGION_MANAGER**: See events of users in same **regions**
  - **SUPER_ADMIN**: See **all events** in tenant

```python
# Check permission
has_team_permission = user.has_perm('immigration.view_team_events')

if has_team_permission:
    if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
        # See events from users in same branches
        team_events_filter = Q(assigned_to__branches__in=user_branches)
    elif user.is_in_group('REGION_MANAGER'):
        # See events from users in same regions
        team_events_filter = Q(assigned_to__regions__in=user_regions)
```

### 3. **Assign Events to Others**
- **Permission Required**: `immigration.assign_calendarevent_to_others`
- **What It Does**: Allows creating events and assigning them to OTHER users
- **UI Behavior**:
  - WITHOUT permission: Can only create events for yourself
  - WITH permission: Shows "Assign To" field with UserAutocomplete

```python
# In EventFormDialog.tsx
const canAssignToOthers = hasPermission('assign_calendarevent_to_others');

{canAssignToOthers && (
  <UserAutocomplete
    value={assignedToUser}
    onChange={setAssignedToUser}
    label="Assign To"
  />
)}
```

## Custom Permissions

These permissions are defined in the model's Meta class:

```python
# backend/immigration/models/event.py
class Meta:
    permissions = [
        ('view_team_events', 'Can view team calendar events'),
        ('assign_calendarevent_to_others', 'Can assign calendar events to other users'),
    ]
```

## Default Django Permissions

These are auto-created by Django:
- `view_calendarevent` - Can view calendar events
- `add_calendarevent` - Can add calendar events
- `change_calendarevent` - Can change calendar events
- `delete_calendarevent` - Can delete calendar events

## How to Assign Permissions

### Via Django Admin:
1. Go to Django Admin → Groups
2. Select a group (e.g., "BRANCH_ADMIN")
3. Under "Permissions", select:
   - `immigration | calendar event | Can view team calendar events`
   - `immigration | calendar event | Can assign calendar events to other users`
4. Save

### Via Django Shell:
```python
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from immigration.models import CalendarEvent

# Get the content type
content_type = ContentType.objects.get_for_model(CalendarEvent)

# Get permissions
view_team_perm = Permission.objects.get(
    codename='view_team_events',
    content_type=content_type
)
assign_perm = Permission.objects.get(
    codename='assign_calendarevent_to_others',
    content_type=content_type
)

# Add to a group
from django.contrib.auth.models import Group
branch_admin_group = Group.objects.get(name='BRANCH_ADMIN')
branch_admin_group.permissions.add(view_team_perm, assign_perm)
```

### Via Management Command:
```bash
uv run python manage.py setup_role_permissions
```
(If you have a management command that sets up default permissions)

## Permission Flow Examples

### Example 1: Consultant WITHOUT `view_team_events`
```
User: John (Consultant, Branch A)
Permission: NONE (default)

What John sees:
✅ Events assigned to John
❌ Events assigned to other users in Branch A
```

### Example 2: Consultant WITH `view_team_events`
```
User: Sarah (Consultant, Branch A)
Permission: view_team_events

What Sarah sees:
✅ Events assigned to Sarah
✅ Events assigned to other users in Branch A
❌ Events assigned to users in Branch B
```

### Example 3: Branch Admin
```
User: Mike (Branch Admin, Branch A)
Permission: view_team_events (typically granted)

What Mike sees:
✅ Events assigned to Mike
✅ Events assigned to all users in Branch A
❌ Events assigned to users in other branches
```

### Example 4: Region Manager
```
User: Lisa (Region Manager, Region 1 with Branch A, B, C)
Permission: view_team_events

What Lisa sees:
✅ Events assigned to Lisa
✅ Events assigned to all users in Branches A, B, C
❌ Events assigned to users in other regions
```

### Example 5: Super Admin
```
User: Admin (Super Admin)
Permission: view_team_events

What Admin sees:
✅ All events in the entire tenant
```

## Checking Permissions in Code

### Backend (Python):
```python
# Check if user has permission
if user.has_perm('immigration.view_team_events'):
    # Show team events
    pass

if user.has_perm('immigration.assign_calendarevent_to_others'):
    # Allow assigning to others
    pass
```

### Frontend (TypeScript):
```typescript
// In any component
const { hasPermission } = useAuthStore();

if (hasPermission('view_team_events')) {
  // Show team calendar toggle
}

if (hasPermission('assign_calendarevent_to_others')) {
  // Show user selection field
}
```

## Testing Permissions

1. **Create test users with different roles**:
```bash
uv run python manage.py createsuperuser --username consultant1
uv run python manage.py createsuperuser --username branch_admin1
```

2. **Assign groups and permissions** in Django Admin

3. **Test visibility**:
   - Login as `consultant1` (no permissions)
   - Create an event for yourself
   - Login as another consultant in same branch
   - Verify you DON'T see the first consultant's event (without permission)
   - Grant `view_team_events` permission to the second consultant's group
   - Verify you NOW see the first consultant's event

## Permission Codenames Reference

| Permission Codename | Full Permission String | Description |
|---------------------|------------------------|-------------|
| `view_calendarevent` | `immigration.view_calendarevent` | View own events (default) |
| `add_calendarevent` | `immigration.add_calendarevent` | Create events |
| `change_calendarevent` | `immigration.change_calendarevent` | Edit events |
| `delete_calendarevent` | `immigration.delete_calendarevent` | Delete events |
| `view_team_events` | `immigration.view_team_events` | View team/branch/region events |
| `assign_calendarevent_to_others` | `immigration.assign_calendarevent_to_others` | Assign events to other users |

## Notes

- Permissions are **additive** - granting more permissions expands visibility
- **Multi-tenancy** is automatic - users can only see events within their tenant
- **Hard delete** is used - deleted events are permanently removed
- Permissions are cached by Django - restart the server after changing permissions in development
