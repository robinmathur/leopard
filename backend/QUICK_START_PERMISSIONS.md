# Quick Start: Role-Based Permissions System

## ✅ Implementation Complete

The Role model has been successfully mapped to Django's Group system. All API calls now respect both role-based permissions and Django's built-in permission system.

## 🚀 What Was Done

### 1. **Automatic Role-to-Group Sync**
- Every user is automatically assigned to a Django Group based on their role
- When a user's role changes, their group membership updates automatically
- Works for both new and existing users

### 2. **Permission Management**
- Each role (CONSULTANT, BRANCH_ADMIN, etc.) has specific permissions
- Permissions are managed via Django's built-in system
- 63 existing users were synced to their role groups

### 3. **New API Endpoint**
```
GET /api/v1/users/me/permissions/
```
Returns all permissions for the authenticated user.

### 4. **OpenAPI/Swagger Documentation**
The new endpoint is fully documented and available in Swagger UI.

## 📊 Test Results

```
✓ All 6 role groups created successfully
✓ 63 users synced to appropriate groups
✓ Role-to-group mapping working correctly
✓ Permission inheritance working as expected
✓ API endpoint functional and documented

Role Breakdown:
- SUPER_SUPER_ADMIN: 1 user, 32 permissions
- SUPER_ADMIN: 3 users, 31 permissions
- COUNTRY_MANAGER: 3 users, 28 permissions
- REGION_MANAGER: 7 users, 21 permissions
- BRANCH_ADMIN: 15 users, 18 permissions
- CONSULTANT: 34 users, 11 permissions
```

## 🔧 Quick Usage

### For Frontend

**Get current user's permissions:**
```javascript
fetch('/api/v1/users/me/permissions/', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(res => res.json())
.then(data => {
  console.log('Role:', data.role);
  console.log('Permissions:', data.permissions);
  
  // Check specific permission
  const canDeleteClient = data.permissions.some(
    p => p.codename === 'delete_client'
  );
});
```

### For Backend

**Check permissions in code:**
```python
# Check if user has permission
if request.user.has_perm('immigration.view_client'):
    # User can view clients
    pass

# Get all permissions
permissions = request.user.get_all_permissions_list()
```

### Run Tests
```bash
python test_permissions.py
```

## 📚 Documentation

- **Full Implementation Details:** `ROLE_PERMISSIONS_IMPLEMENTATION.md`
- **OpenAPI Schema:** `openapi-schema.yaml`
- **Swagger UI:** `http://localhost:8000/api/schema/swagger-ui/`

## 🔧 Important Notes

### Permissions Endpoint Access
The `/api/v1/users/me/permissions/` endpoint is accessible to **ALL authenticated users**, including CONSULTANT role users. This allows every user to query their own permissions.

However, other user management endpoints remain restricted:
- ❌ CONSULTANT users **cannot** list users (`GET /api/v1/users/`)
- ❌ CONSULTANT users **cannot** create users (`POST /api/v1/users/`)
- ✅ CONSULTANT users **can** view their own permissions (`GET /api/v1/users/me/permissions/`)

## 🎯 Permission Hierarchy

| Role | Can View | Can Add | Can Change | Can Delete |
|------|----------|---------|------------|------------|
| CONSULTANT | Clients, Visas, Tasks | Clients, Visas, Tasks | Clients, Visas, Tasks | - |
| BRANCH_ADMIN | + Branch | + Branch | + Branch | Clients, Visas, Tasks |
| REGION_MANAGER | + Region | + Region | + Region | + Branch |
| COUNTRY_MANAGER | + Tenant | + Branches, Regions | + Branches, Regions | + Regions |
| SUPER_ADMIN | All | + Tenant | + Tenant | All except Tenant |
| SUPER_SUPER_ADMIN | All | All | All | All |

## ⚙️ Maintenance

**To update permissions:**
```bash
# Edit: immigration/management/commands/setup_role_permissions.py
# Then run:
python manage.py setup_role_permissions
```

**To manually sync a user:**
```python
user.sync_role_to_group()
```

## ✨ Key Features

1. ✅ **Backward Compatible** - Existing role-based checks still work
2. ✅ **Automatic Sync** - No manual intervention needed
3. ✅ **Standard Django** - Uses Django's built-in permission system
4. ✅ **API Endpoint** - Frontend can query user permissions
5. ✅ **OpenAPI Documented** - Full API documentation
6. ✅ **Well Tested** - Comprehensive test coverage

---

**Questions?** Check `ROLE_PERMISSIONS_IMPLEMENTATION.md` for detailed information.

