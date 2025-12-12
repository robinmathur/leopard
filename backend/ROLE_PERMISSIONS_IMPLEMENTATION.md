# Role-to-Group Mapping and Permissions Implementation

## Summary

This document describes the implementation of Django Group-based permissions for the multi-tenant CRM system, mapping the custom Role field to Django's built-in permission system.

## Changes Implemented

### 1. User Model Updates (`immigration/models/user.py`)

**Added:**
- `sync_role_to_group()` method: Automatically syncs user's role to corresponding Django Group
- `get_all_permissions_list()` method: Returns all permissions (direct + group-based) for a user
- Post-save signal handler: Automatically syncs role changes to groups

**How it works:**
- When a user's role is saved, the system automatically:
  1. Gets or creates a Django Group with the role name
  2. Removes the user from all other role-based groups
  3. Adds the user to the appropriate group

### 2. Management Command (`immigration/management/commands/setup_role_permissions.py`)

**Purpose:** Set up role-based groups and assign permissions based on the role hierarchy.

**What it does:**
1. Creates Django Groups for each role (CONSULTANT, BRANCH_ADMIN, etc.)
2. Assigns model-specific permissions to each group based on role level
3. Syncs all existing users to their role-based groups

**Permission Mapping:**

| Role | Models with Permissions |
|------|------------------------|
| **CONSULTANT** | Client (view, add, change), VisaApplication (view, add, change), Task (view, add, change), Notification (view), User (view) |
| **BRANCH_ADMIN** | All CONSULTANT permissions + Client/Visa/Task (delete), Notification (add), Branch (view), User (add, change) |
| **REGION_MANAGER** | All BRANCH_ADMIN permissions + Branch (add, change), Region (view) |
| **COUNTRY_MANAGER** | All REGION_MANAGER permissions + Branch/Region (delete), Tenant (view), User (delete), Notification (change) |
| **SUPER_ADMIN** | All COUNTRY_MANAGER permissions + Tenant (add, change), Notification (delete) |
| **SUPER_SUPER_ADMIN** | Full permissions on all models including Tenant (delete) |

**Usage:**
```bash
python manage.py setup_role_permissions
```

### 3. Permission Classes Update (`immigration/api/v1/permissions.py`)

**Enhanced RoleBasedPermission class:**
- Now integrates Django's permission system alongside role-based checks
- Added `required_permission` attribute for Django permission checks
- Maintains backward compatibility with existing role-based checks

**Updated permission classes:**
- `CanManageClients`: Now requires `immigration.view_client` permission
- `CanManageApplications`: Now requires `immigration.view_visaapplication` permission

**How it works:**
1. Checks if user has the required role (legacy system)
2. Checks if user has the Django permission via Group membership
3. Both checks must pass for access to be granted

### 4. New API Endpoint (`immigration/api/v1/views/users.py`)

**Endpoint:** `GET /api/v1/users/me/permissions/`

**Purpose:** Returns all distinct permissions associated with the authenticated user.

**Access Control:** This endpoint uses `IsAuthenticated` permission, allowing **ALL authenticated users** (including CONSULTANT role) to view their own permissions. This is different from other UserViewSet endpoints which use `CanCreateUsers` permission.

**Response format:**
```json
{
  "permissions": [
    {
      "codename": "view_client",
      "name": "Can view client",
      "content_type": "immigration.client"
    },
    {
      "codename": "add_client",
      "name": "Can add client",
      "content_type": "immigration.client"
    }
  ],
  "role": "BRANCH_ADMIN",
  "role_display": "Branch Admin"
}
```

**Features:**
- Combines direct user permissions and group-based permissions
- Returns distinct permissions (no duplicates)
- Includes user's role information
- Fully documented in OpenAPI/Swagger spec

### 5. Database Migration

**Migration:** `immigration/migrations/0007_sync_role_to_group.py`

Created to support the model changes and ensure database schema is up to date.

## How to Use

### Initial Setup

1. **Run migrations:**
   ```bash
   python manage.py migrate immigration
   ```

2. **Set up role-based groups and permissions:**
   ```bash
   python manage.py setup_role_permissions
   ```

### For Frontend Developers

**To get user permissions:**
```javascript
// GET /api/v1/users/me/permissions/
fetch('/api/v1/users/me/permissions/', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
})
.then(response => response.json())
.then(data => {
  console.log('User role:', data.role);
  console.log('Permissions:', data.permissions);
  
  // Check if user has specific permission
  const canAddClient = data.permissions.some(
    p => p.codename === 'add_client' && p.content_type === 'immigration.client'
  );
});
```

### For Backend Developers

**Checking permissions in views:**
```python
# Role-based check (legacy)
if request.user.role in ['BRANCH_ADMIN', 'CONSULTANT']:
    # ...

# Django permission check (new)
if request.user.has_perm('immigration.add_client'):
    # ...

# Get all permissions
permissions = request.user.get_all_permissions_list()
```

**Adding new permissions to a role:**
Edit `setup_role_permissions.py` and update the `role_permissions` dictionary, then run:
```bash
python manage.py setup_role_permissions
```

## Testing

### Test the endpoint:
```bash
# Get JWT token first
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Get user permissions
curl -X GET http://localhost:8000/api/v1/users/me/permissions/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Verify OpenAPI documentation:
Visit: http://localhost:8000/api/schema/swagger-ui/

Look for the endpoint under "users" section: `GET /api/v1/users/me/permissions/`

## Benefits

1. **Standard Django Permissions:** Uses Django's built-in permission system for consistency
2. **Group-based Management:** Easy to manage permissions via Django admin
3. **Automatic Sync:** User role changes automatically sync with group membership
4. **Frontend Integration:** New endpoint allows frontends to check user capabilities
5. **Backward Compatible:** Existing role-based checks still work
6. **Auditable:** All permission changes can be tracked through Django's admin interface

## Future Enhancements

1. **Custom Permissions:** Add custom permissions beyond CRUD operations
2. **Object-level Permissions:** Implement fine-grained object-level permission checks
3. **Permission Caching:** Cache permission lookups for better performance
4. **Audit Logging:** Track permission usage and changes

## Notes

- The system maintains both role-based checks (for backward compatibility) and Django permissions
- All existing users have been synced to groups automatically
- The permission system respects tenant/branch/region scope restrictions
- Changes to user roles automatically update group membership

