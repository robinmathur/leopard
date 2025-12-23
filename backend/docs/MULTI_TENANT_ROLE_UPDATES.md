# Multi-Tenant Role Hierarchy Updates

## Summary

This document describes the major updates to the role hierarchy and multi-tenant architecture to support the new requirements where only SUPER_SUPER_ADMIN and SUPER_ADMIN can create users, and REGION_MANAGER/BRANCH_ADMIN can manage multiple regions/branches.

## Key Changes

### 1. Role Hierarchy Update

**OLD Hierarchy:**
```
SUPER_SUPER_ADMIN → SUPER_ADMIN → COUNTRY_MANAGER → REGION_MANAGER → BRANCH_ADMIN → CONSULTANT
```

**NEW Hierarchy:**
```
SUPER_SUPER_ADMIN → SUPER_ADMIN → [REGION_MANAGER, BRANCH_ADMIN, CONSULTANT]
                                      (parallel, no creation rights)
```

### 2. User Creation Rules (CHANGED)

| Role | Can Create |
|------|-----------|
| **SUPER_SUPER_ADMIN** | ✅ SUPER_ADMIN |
| **SUPER_ADMIN** | ✅ REGION_MANAGER, BRANCH_ADMIN, CONSULTANT, COUNTRY_MANAGER |
| **COUNTRY_MANAGER** | ❌ Cannot create users (deprecated role) |
| **REGION_MANAGER** | ❌ Cannot create users (NEW) |
| **BRANCH_ADMIN** | ❌ Cannot create users (NEW) |
| **CONSULTANT** | ❌ Cannot create users |

### 3. Multiple Assignments (NEW)

#### REGION_MANAGER
- **OLD:** Assigned to ONE region (ForeignKey)
- **NEW:** Can be assigned to MULTIPLE regions (ManyToMany)
- Can view data from ALL assigned regions
- Can manage users in ALL assigned regions (but cannot create new users)

#### BRANCH_ADMIN
- **OLD:** Assigned to ONE branch (ForeignKey)
- **NEW:** Can be assigned to MULTIPLE branches (ManyToMany)
- Can view data from ALL assigned branches
- Can manage users in ALL assigned branches (but cannot create new users)

#### CONSULTANT
- **UNCHANGED:** Assigned to ONE branch (ForeignKey)
- Single branch access only

## Database Schema Changes

### User Model Updates

**New Fields Added:**
```python
# Multiple branches for BRANCH_ADMIN
branches = models.ManyToManyField(
    'Branch',
    related_name='branch_admins',
    blank=True,
    help_text='Multiple branch assignments (used for BRANCH_ADMIN role)'
)

# Multiple regions for REGION_MANAGER
regions = models.ManyToManyField(
    'Region',
    related_name='region_managers',
    blank=True,
    help_text='Multiple region assignments (used for REGION_MANAGER role)'
)
```

**Existing Fields (Kept for Backward Compatibility):**
```python
branch = models.ForeignKey(...)  # For CONSULTANT (single branch)
region = models.ForeignKey(...)  # Legacy field
```

**New Helper Methods:**
```python
def get_all_branches(self):
    """Get all branches this user has access to."""

def get_all_regions(self):
    """Get all regions this user has access to."""
```

## API Changes

### User Creation/Update Endpoints

**New Request Fields:**

```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123",
  "role": "BRANCH_ADMIN",
  "tenant_id": 1,
  
  // For CONSULTANT (single branch)
  "branch_id": 1,
  
  // For BRANCH_ADMIN (multiple branches)
  "branch_ids": [1, 2, 3],
  
  // For REGION_MANAGER (multiple regions)
  "region_ids": [1, 2]
}
```

**Response Format:**

```json
{
  "id": 1,
  "username": "branch_admin_user",
  "role": "BRANCH_ADMIN",
  "branch": 1,  // Legacy field (first branch)
  "branches_data": [  // NEW: All assigned branches
    {"id": 1, "name": "Branch A"},
    {"id": 2, "name": "Branch B"},
    {"id": 3, "name": "Branch C"}
  ],
  "regions_data": []  // NEW: All assigned regions (empty for non-REGION_MANAGER)
}
```

## Permission Changes

### Updated Permissions

| Role | User Management | Notes |
|------|----------------|-------|
| **SUPER_SUPER_ADMIN** | view, add, change, delete | Full control |
| **SUPER_ADMIN** | view, add, change, delete | Can create users |
| **COUNTRY_MANAGER** | view, change, delete | No user creation |
| **REGION_MANAGER** | view, change | ❌ No add, no delete |
| **BRANCH_ADMIN** | view, change | ❌ No add, no delete |
| **CONSULTANT** | view | Read-only |

### Permission Matrix

```
                    Client  Visa  Task  Notification  Branch  Region  User
CONSULTANT          v,a,c   v,a,c v,a,c     v           -       -      v
BRANCH_ADMIN        CRUD    CRUD  CRUD      v,a         v       -      v,c
REGION_MANAGER      CRUD    CRUD  CRUD      v,a       v,a,c     v      v,c
COUNTRY_MANAGER     CRUD    CRUD  CRUD     v,a,c      CRUD     CRUD    v,c,d
SUPER_ADMIN         CRUD    CRUD  CRUD     CRUD       CRUD     CRUD    CRUD
SUPER_SUPER_ADMIN   CRUD    CRUD  CRUD     CRUD       CRUD     CRUD    CRUD

Legend: v=view, a=add, c=change, d=delete, CRUD=all operations
```

## Data Access Rules (UPDATED)

### CONSULTANT
- ✅ Can view data in their assigned branch ONLY
- ❌ Cannot view data from other branches

### BRANCH_ADMIN (NEW)
- ✅ Can view data from ALL assigned branches
- ✅ Can have multiple branch assignments
- ✅ Can manage users in those branches (view, update - no creation)
- ❌ Cannot view data from unassigned branches

### REGION_MANAGER (NEW)
- ✅ Can view data from ALL assigned regions
- ✅ Can have multiple region assignments
- ✅ Can view data from branches within those regions
- ✅ Can manage users in those regions (view, update - no creation)
- ❌ Cannot view data from unassigned regions

### SUPER_ADMIN
- ✅ Can view all data in their tenant
- ✅ Can create REGION_MANAGER, BRANCH_ADMIN, CONSULTANT
- ❌ Cannot view data from other tenants

### SUPER_SUPER_ADMIN
- ✅ Can view all data across all tenants
- ✅ Can create SUPER_ADMIN
- ✅ System-wide access

## Migration Guide

### 1. Database Migration

```bash
# Migration already created and applied
python manage.py migrate immigration
```

### 2. Update Permissions

```bash
# Run this command to update group permissions
python manage.py setup_role_permissions
```

### 3. Assign Multiple Branches/Regions

For existing BRANCH_ADMIN users who need multiple branches:

```python
from django.contrib.auth import get_user_model
from immigration.models import Branch

User = get_user_model()

# Get a BRANCH_ADMIN user
branch_admin = User.objects.get(username='admin_user')

# Assign multiple branches
branch_ids = [1, 2, 3]
branch_admin.branches.set(branch_ids)

# The single 'branch' field can remain for backward compatibility
# It should point to one of the assigned branches
branch_admin.branch_id = branch_ids[0]
branch_admin.save()
```

For REGION_MANAGER:

```python
# Get a REGION_MANAGER user
region_manager = User.objects.get(username='manager_user')

# Assign multiple regions
region_ids = [1, 2]
region_manager.regions.set(region_ids)
region_manager.save()
```

## Testing

### Run Tests

```bash
python test_multi_tenant_updates.py
```

### Test Results

✅ All tests passed:
- Role hierarchy correctly enforced
- Multiple branches/regions supported
- Permissions correctly assigned
- User creation restrictions working
- Model helper methods functional

## Backward Compatibility

### Preserved Features

1. **Single Branch Field:** The `branch` ForeignKey field is preserved for CONSULTANT users
2. **Single Region Field:** The `region` ForeignKey field is preserved (legacy)
3. **COUNTRY_MANAGER Role:** Kept for backward compatibility (deprecated, cannot create users)
4. **Existing API Endpoints:** All existing endpoints continue to work

### Migration Path

- Existing users with single branch/region assignments continue to work
- BRANCH_ADMIN and REGION_MANAGER can be gradually migrated to multiple assignments
- No breaking changes to existing functionality

## Security Considerations

### Enhanced Security

1. **Restricted User Creation:** Only top-level admins can create users
2. **Scope Isolation:** Users can only access data within their assigned scope
3. **Tenant Isolation:** All data access respects tenant boundaries
4. **Permission-Based Access:** Django's built-in permission system enforced

### Access Control Flow

```
Request → Authentication → Role Check → Permission Check → Scope Filter → Data Access
```

## API Examples

### Create BRANCH_ADMIN with Multiple Branches

```bash
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "multi_branch_admin",
    "email": "admin@example.com",
    "password": "securepass123",
    "first_name": "Admin",
    "last_name": "User",
    "role": "BRANCH_ADMIN",
    "tenant_id": 1,
    "branch_ids": [1, 2, 3]
  }'
```

### Create REGION_MANAGER with Multiple Regions

```bash
curl -X POST http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "multi_region_manager",
    "email": "manager@example.com",
    "password": "securepass123",
    "first_name": "Manager",
    "last_name": "User",
    "role": "REGION_MANAGER",
    "tenant_id": 1,
    "region_ids": [1, 2]
  }'
```

### Update User's Branch Assignments

```bash
curl -X PATCH http://localhost:8000/api/v1/users/123/ \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "branch_ids": [2, 3, 4, 5]
  }'
```

## Known Limitations

1. **No Hierarchical Creation:** REGION_MANAGER and BRANCH_ADMIN cannot create users under them
2. **Tenant Assignment:** Only SUPER_SUPER_ADMIN can change a user's tenant
3. **Role Changes:** Changing roles may require manual branch/region reassignment

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Assignment:** API endpoint for bulk branch/region assignments
2. **Inheritance Rules:** Auto-assign branches when region is assigned
3. **Assignment History:** Track historical assignments for audit purposes
4. **Delegation:** Allow BRANCH_ADMIN to delegate specific permissions
5. **Custom Scopes:** More granular permission scopes beyond branch/region

## Support

For issues or questions:
1. Check this documentation
2. Run `python test_multi_tenant_updates.py` to verify setup
3. Review migration files in `immigration/migrations/`
4. Check `ROLE_PERMISSIONS_IMPLEMENTATION.md` for permission details

---

**Last Updated:** 2024-12-10  
**Migration:** `0008_multi_tenant_role_updates`  
**Status:** ✅ Implemented and Tested

