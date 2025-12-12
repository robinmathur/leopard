# Fix: CONSULTANT Access to Permissions Endpoint

## Issue
CONSULTANT role users were unable to access the new permissions endpoint (`GET /api/v1/users/me/permissions/`) due to the `CanCreateUsers` permission class being applied to the entire `UserViewSet`.

## Root Cause
The `UserViewSet` had `permission_classes = [CanCreateUsers]` which blocked CONSULTANT users from accessing ANY endpoint in that viewset, including the permissions endpoint. The `CanCreateUsers` permission only allows users who can create other users (i.e., roles higher than CONSULTANT).

## Solution
Added a `get_permissions()` method to the `UserViewSet` that overrides the permission check for the `my_permissions` action, allowing all authenticated users to access their own permissions.

### Code Changes

**File:** `immigration/api/v1/views/users.py`

1. **Added import:**
```python
from rest_framework.permissions import IsAuthenticated
```

2. **Added method to UserViewSet:**
```python
def get_permissions(self):
    """
    Override to allow all authenticated users to access my_permissions endpoint.
    """
    if self.action == 'my_permissions':
        # Allow any authenticated user to view their own permissions
        return [IsAuthenticated()]
    # For all other actions, use the default CanCreateUsers permission
    return super().get_permissions()
```

## Verification Results

### ✅ All Tests Passed

**Test 1: CONSULTANT Can Access Permissions Endpoint**
```
CONSULTANT (consultant_99_1):
  Status Code: 200
  ✓ SUCCESS - Can access endpoint
  Role in response: CONSULTANT
  Permissions count: 11
  Sample permissions: ['add_client', 'change_client', 'view_client']
```

**Test 2: CONSULTANT Still Cannot List Users**
```
CONSULTANT (consultant_99_1) accessing GET /api/v1/users/:
  Status Code: 403
  ✓ CORRECT - CONSULTANT properly blocked from listing users
```

**Test 3: Other Roles Still Work**
- ✅ BRANCH_ADMIN can access both endpoints
- ✅ REGION_MANAGER can access both endpoints
- ✅ COUNTRY_MANAGER can access both endpoints
- ✅ SUPER_ADMIN can access both endpoints

## Permission Matrix

| Role | GET /users/me/permissions/ | GET /users/ | POST /users/ |
|------|---------------------------|-------------|--------------|
| **CONSULTANT** | ✅ Allowed | ❌ Forbidden | ❌ Forbidden |
| **BRANCH_ADMIN** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **REGION_MANAGER** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **COUNTRY_MANAGER** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **SUPER_ADMIN** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **SUPER_SUPER_ADMIN** | ✅ Allowed | ✅ Allowed | ✅ Allowed |

## Testing Commands

### Manual API Test
```bash
# 1. Get JWT token for a CONSULTANT user
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "consultant_username", "password": "password"}'

# 2. Use token to access permissions endpoint
curl -X GET http://localhost:8000/api/v1/users/me/permissions/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: 200 OK with permissions data

# 3. Try to list users (should fail)
curl -X GET http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: 403 Forbidden
```

### Run Integration Tests
```bash
python test_permissions.py
```

## OpenAPI/Swagger Documentation

The endpoint is fully documented in the OpenAPI schema and available at:
- **Swagger UI:** `http://localhost:8000/api/schema/swagger-ui/`
- **Endpoint:** Look for `GET /api/v1/users/me/permissions/` under the "users" section

## Impact

### ✅ Benefits
1. **CONSULTANT users can now check their own permissions** - Essential for frontend permission-based UI rendering
2. **Security maintained** - CONSULTANT users still cannot list or create other users
3. **Backward compatible** - No breaking changes to existing functionality
4. **Well documented** - Available in OpenAPI/Swagger spec

### ⚠️ No Breaking Changes
- All existing permission checks remain intact
- Only the specific `my_permissions` action is accessible to all authenticated users
- No changes to other endpoints' access control

## Summary

✅ **Issue Fixed:** CONSULTANT users can now access `GET /api/v1/users/me/permissions/`  
✅ **Security Maintained:** CONSULTANT users still cannot list or create users  
✅ **Tests Passed:** All integration tests pass successfully  
✅ **Documentation Updated:** OpenAPI schema reflects the change  

---

**Date:** 2024-12-09  
**Status:** ✅ Verified and Deployed

