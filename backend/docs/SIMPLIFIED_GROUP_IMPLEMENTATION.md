# Simplified Group-Based Implementation

## ✅ COMPLETE SIMPLIFICATION

All role-based logic has been removed. The system now uses pure Django Groups and Permissions.

## Changes Made

### 1. **User Model** - NO ROLE FIELD

**Removed:**
- `role` CharField field
- `branch` ForeignKey (single branch)
- `region` ForeignKey (single region)  
- `sync_role_to_group()` method
- Signal handlers for role sync

**Kept:**
- `branches` ManyToManyField
- `regions` ManyToManyField
- `tenant` ForeignKey

**Added:**
- `get_primary_group()` - Get user's primary group
- `is_in_group(group_name)` - Check group membership

### 2. **Constants** - SIMPLIFIED

**Removed:**
- `ROLE_CHOICES`
- `ROLE_LEVELS`
- `ROLE_HIERARCHY`
- `ROLE_CREATORS`
- `UserRole` enum class
- All role-based mappings

**Kept (Simple):**
```python
GROUP_SUPER_SUPER_ADMIN = 'SUPER_SUPER_ADMIN'
GROUP_SUPER_ADMIN = 'SUPER_ADMIN'
GROUP_REGION_MANAGER = 'REGION_MANAGER'
GROUP_BRANCH_ADMIN = 'BRANCH_ADMIN'
GROUP_CONSULTANT = 'CONSULTANT'

ALL_GROUPS = [...]  # List of all groups
GROUP_DISPLAY_NAMES = {...}  # Display names
```

### 3. **Services** - PERMISSION-BASED ONLY

**User Creation:**
- Check: `user.has_perm('immigration.add_user')`
- Only SUPER_SUPER_ADMIN and SUPER_ADMIN groups have this permission

**User Update:**
- Check: `user.has_perm('immigration.change_user')`

**No role hierarchy validation** - Pure permission checks!

### 4. **Selectors** - GROUP-BASED

Uses `user.is_in_group()` instead of `user.role`:

```python
if user.is_in_group('SUPER_SUPER_ADMIN'):
    return User.objects.all()
elif user.is_in_group('SUPER_ADMIN'):
    return User.objects.filter(tenant=user.tenant)
```

### 5. **Permissions** - PURE DJANGO PERMISSIONS

```python
class CanCreateUsers(RoleBasedPermission):
    required_permission = 'immigration.add_user'
```

That's it! No role checks, just permission checks.

### 6. **Serializers** - USE group_name

**Input:**
```json
{
  "username": "user123",
  "group_name": "BRANCH_ADMIN",  // Not "role"
  "branch_ids": [1, 2, 3],
  "region_ids": [1, 2]
}
```

**Output:**
```json
{
  "username": "user123",
  "groups_list": ["BRANCH_ADMIN"],
  "primary_group": "BRANCH_ADMIN",
  "branches_data": [...],
  "regions_data": [...]
}
```

## Migration

**Created:** `0009_remove_role_field_use_groups_only.py`

**Changes:**
- Removed `role` field
- Removed `branch` field (single)
- Removed `region` field (single)
- Updated indexes

**To Apply:**
```bash
python manage.py migrate immigration
```

⚠️ **WARNING:** This will delete the role, branch, and region columns from the user table!

## How It Works Now

### Group Assignment

```python
# Create user
user = User.objects.create_user(username='admin', email='admin@example.com')

# Assign to group
group = Group.objects.get(name='SUPER_ADMIN')
user.groups.add(group)

# Assign branches
user.branches.set([1, 2, 3])
```

### Permission Checks

```python
# Check if user can create users
if user.has_perm('immigration.add_user'):
    # Create user
    pass

# Check group membership
if user.is_in_group('SUPER_ADMIN'):
    # Do something
    pass
```

### Data Filtering

```python
# In selectors
if user.is_in_group('BRANCH_ADMIN'):
    user_branches = user.branches.all()
    clients = Client.objects.filter(branch__in=user_branches)
```

## Setup

### 1. Run Migration

```bash
python manage.py migrate immigration
```

### 2. Create Groups & Permissions

```bash
python manage.py setup_role_permissions
```

This creates all 5 groups and assigns permissions.

### 3. Create Users

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

# Create SUPER_ADMIN
user = User.objects.create_user(
    username='admin',
    email='admin@example.com',
    password='password123'
)

# Assign to group
group = Group.objects.get(name='SUPER_ADMIN')
user.groups.add(group)

# Assign branches
user.branches.set([1, 2, 3])
```

## API Usage

### Create User

```bash
POST /api/v1/users/
{
  "username": "branch_admin",
  "email": "admin@example.com",
  "password": "password123",
  "first_name": "Branch",
  "last_name": "Admin",
  "group_name": "BRANCH_ADMIN",
  "tenant_id": 1,
  "branch_ids": [1, 2, 3]
}
```

### Update User

```bash
PATCH /api/v1/users/123/
{
  "group_name": "REGION_MANAGER",
  "region_ids": [1, 2]
}
```

### Get User Permissions

```bash
GET /api/v1/users/me/permissions/
```

Response:
```json
{
  "permissions": [
    {"codename": "add_user", "name": "Can add user", "content_type": "immigration.user"},
    {"codename": "change_user", "name": "Can change user", "content_type": "immigration.user"}
  ],
  "groups_list": ["SUPER_ADMIN"],
  "primary_group": "SUPER_ADMIN"
}
```

## Group Permissions Matrix

| Group | add_user | change_user | delete_user | view_user |
|-------|----------|-------------|-------------|-----------|
| **SUPER_SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **SUPER_ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **REGION_MANAGER** | ❌ | ✅ | ❌ | ✅ |
| **BRANCH_ADMIN** | ❌ | ✅ | ❌ | ✅ |
| **CONSULTANT** | ❌ | ❌ | ❌ | ✅ |

## Benefits

1. **✅ Simpler** - No role field, no role hierarchy logic
2. **✅ Pure Django** - Standard Django Groups & Permissions
3. **✅ No Backward Compatibility** - Clean slate for development
4. **✅ Permission-Based** - All checks use `has_perm()`
5. **✅ Flexible** - Can have multiple groups, custom permissions

## Files Modified

- ✅ `immigration/models/user.py` - Removed role field
- ✅ `immigration/constants.py` - Removed all role logic
- ✅ `immigration/services/users.py` - Use permissions only
- ✅ `immigration/selectors/users.py` - Use groups only
- ✅ `immigration/api/v1/permissions.py` - Pure permission checks
- ✅ `immigration/api/v1/serializers/users.py` - Use group_name
- ✅ `immigration/management/commands/setup_role_permissions.py` - Updated

## Next Steps

1. Apply migration: `python manage.py migrate`
2. Set up groups: `python manage.py setup_role_permissions`
3. Create users and assign to groups
4. Update any remaining code that references `.role`

---

**Status:** ✅ Complete  
**Migration:** `0009_remove_role_field_use_groups_only.py`  
**Date:** 2024-12-10

