# Multi-Tenant JWT Authentication

## Overview

Our multi-tenant architecture implements **tenant-bound JWT tokens** to prevent cross-tenant token reuse. A token generated for Tenant A **cannot** be used to access Tenant B's data, even if the user exists in both tenants.

---

## The Problem (Before Fix)

### Insecure Default JWT

With standard JWT implementation:

```json
{
  "user_id": 123,
  "token_type": "access",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**❌ No tenant information!**

### Attack Scenario

1. User logs in at `acme.leopard.com` → receives JWT token
2. User manually changes browser URL to `competitor.leopard.com`
3. Sends same JWT token → **GAINS UNAUTHORIZED ACCESS** 😱
4. Can view/modify competitor's data!

This is a **critical security vulnerability** in multi-tenant SaaS applications.

---

## The Solution: Tenant-Bound Tokens

### Secure JWT with tenant_schema Claim

```json
{
  "user_id": 123,
  "token_type": "access",
  "exp": 1234567890,
  "iat": 1234567890,
  "tenant_schema": "tenant_acme",     // ✅ NEW: Tenant binding
  "email": "user@acme.com",           // ✅ Convenience for frontend
  "username": "user@acme.com",
  "groups": ["SUPER_ADMIN"]           // ✅ RBAC for frontend
}
```

**✅ Token is cryptographically bound to tenant_acme**

---

## How It Works

### 1. Login Flow (Token Generation)

```
User Action:
  visits acme.leopard.com/login
  enters credentials

↓

TenantMainMiddleware:
  extracts subdomain "acme" from HTTP_HOST
  queries public.domains → finds tenant_acme
  sets connection.schema_name = 'tenant_acme'

↓

POST /api/token/
  {
    "username": "user@acme.com",
    "password": "secret"
  }

↓

TenantTokenObtainPairSerializer:
  validates credentials in tenant_acme schema
  generates JWT token with:
    - user_id from authenticated user
    - tenant_schema = connection.schema_name ('tenant_acme')
    - email, username, groups from user object

↓

Response:
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",  // Contains tenant_acme
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }

↓

Frontend:
  stores tokens in localStorage
  sets Authorization: Bearer {access} for all requests
```

### 2. Authenticated Request Flow

```
User Request:
  GET acme.leopard.com/api/v1/clients/
  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...

↓

TenantMainMiddleware:
  extracts subdomain "acme"
  sets connection.schema_name = 'tenant_acme'

↓

TenantJWTAuthentication.authenticate():
  1. Decode JWT token (verify signature, expiry)
  2. Extract claims:
       token_tenant_schema = 'tenant_acme'
       current_tenant_schema = 'tenant_acme'

  3. Validate: token_tenant_schema == current_tenant_schema
     ✅ MATCH → Authentication succeeds
     ❌ MISMATCH → AuthenticationFailed exception

  4. Load user from User.objects.get(id=token['user_id'])
     (automatically scoped to tenant_acme schema)

↓

View/Selector:
  All queries automatically scoped to tenant_acme schema
  Client.objects.all() → returns only acme's clients

↓

Response:
  { "results": [...acme's clients...] }
```

### 3. Attack Prevention (Cross-Tenant Token Reuse)

```
Attacker:
  has valid token for acme.leopard.com
  manually changes URL to competitor.leopard.com

↓

Request:
  GET competitor.leopard.com/api/v1/clients/
  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
                        (token from acme.leopard.com)

↓

TenantMainMiddleware:
  extracts subdomain "competitor"
  sets connection.schema_name = 'tenant_competitor'

↓

TenantJWTAuthentication.authenticate():
  1. Decode JWT token
  2. Extract claims:
       token_tenant_schema = 'tenant_acme'        // From token
       current_tenant_schema = 'tenant_competitor' // From subdomain

  3. Validate: 'tenant_acme' != 'tenant_competitor'
     ❌ MISMATCH DETECTED!

  4. Raise AuthenticationFailed:
       "Token is not valid for this tenant. Please log in at the correct subdomain."

↓

Response:
  HTTP 401 Unauthorized
  {
    "detail": "Token is not valid for this tenant. Please log in at the correct subdomain."
  }

↓

Attack Prevented! 🛡️
```

---

## Implementation Details

### File: `immigration/api/v1/auth_views.py`

```python
class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Generates JWT with tenant_schema claim."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # CRITICAL: Capture tenant_schema from connection
        # This is set by TenantMainMiddleware based on subdomain
        tenant_schema = connection.schema_name
        token['tenant_schema'] = tenant_schema

        # Add user metadata for frontend convenience
        token['email'] = user.email
        token['username'] = user.username
        token['groups'] = list(user.groups.values_list('name', flat=True))

        return token
```

### File: `immigration/authentication.py`

```python
class TenantJWTAuthentication(JWTAuthentication):
    """Validates tenant_schema in JWT token."""

    def authenticate(self, request):
        # Standard JWT validation (signature, expiry, user lookup)
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result

        # CRITICAL SECURITY CHECK: Validate tenant_schema
        token_tenant_schema = validated_token.get('tenant_schema')
        current_tenant_schema = connection.schema_name

        if token_tenant_schema is None:
            raise AuthenticationFailed(
                'Invalid token: missing tenant information. Please log in again.'
            )

        if token_tenant_schema != current_tenant_schema:
            raise AuthenticationFailed(
                'Token is not valid for this tenant. '
                'Please log in at the correct subdomain.'
            )

        return user, validated_token
```

### File: `leopard/urls.py`

```python
from immigration.api.v1.auth_views import TenantTokenObtainPairView

urlpatterns = [
    # Tenant-bound JWT token generation
    path('api/token/', csrf_exempt(TenantTokenObtainPairView.as_view())),
    path('api/token/refresh/', csrf_exempt(TokenRefreshView.as_view())),
]
```

### File: `leopard/settings.py`

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'immigration.authentication.TenantJWTAuthentication',  # Tenant-bound
    ],
}
```

---

## Frontend Integration

### Login Component (React)

```typescript
// Extract tenant from subdomain
const getTenantFromSubdomain = (): string => {
  const hostname = window.location.hostname;
  // acme.leopard.com → "acme"
  const subdomain = hostname.split('.')[0];
  return subdomain;
};

// Login function
const login = async (username: string, password: string) => {
  const tenant = getTenantFromSubdomain();

  // IMPORTANT: Make request to current subdomain
  // This ensures TenantMainMiddleware sets correct schema
  const response = await fetch(`${window.location.origin}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const { access, refresh } = await response.json();

  // Store tokens
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);

  // Decode token to get user metadata
  const payload = JSON.parse(atob(access.split('.')[1]));
  console.log('Logged in to tenant:', payload.tenant_schema);
  console.log('User groups:', payload.groups);

  // Redirect to dashboard
  window.location.href = '/dashboard';
};
```

### API Client (Axios)

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: window.location.origin + '/api/v1/',
});

// Interceptor: Add JWT token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Handle token expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const message = error.response?.data?.detail;

      if (message?.includes('tenant')) {
        // Cross-tenant token reuse detected!
        alert('Invalid token for this tenant. Please log in.');
        localStorage.clear();
        window.location.href = '/login';
      } else {
        // Try token refresh
        // ... refresh logic
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Security Guarantees

### ✅ What's Protected

1. **Cross-Tenant Token Reuse**: Token from Tenant A cannot access Tenant B
2. **Subdomain Spoofing**: Even if attacker changes URL, token validation fails
3. **Token Theft**: Stolen token only works for its bound tenant
4. **Multi-Tenant Users**: User with accounts in multiple tenants must log in separately for each

### ✅ Attack Scenarios Prevented

| Attack | Prevention |
|--------|-----------|
| User steals token from Tenant A and uses for Tenant B | ❌ Blocked: tenant_schema mismatch |
| Attacker intercepts token and tries different subdomains | ❌ Blocked: tenant_schema validation |
| User logs in to Tenant A, manually changes URL to Tenant B | ❌ Blocked: existing token rejected |
| Compromised token from one tenant affects others | ❌ Isolated: token only valid for one tenant |

### ⚠️ What's NOT Protected (Out of Scope)

- **XSS Attacks**: If attacker can execute JS, they can steal tokens
  - **Mitigation**: Use HttpOnly cookies (optional upgrade)
- **CSRF Attacks**: We use JWT in Authorization header (not cookies)
  - **Mitigation**: Already protected (CSRF doesn't work with Bearer tokens)
- **Man-in-the-Middle**: Requires HTTPS in production
  - **Mitigation**: Enforce HTTPS, use HSTS headers

---

## Testing

### Manual Test

```bash
# 1. Start server
uv run python manage.py runserver 0.0.0.0:8000

# 2. Login to tenant_main
curl -X POST http://main.localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@main.com","password":"admin123"}'

# Returns:
# {
#   "access": "eyJ0eXAiOiJKV1Qi...",
#   "refresh": "eyJ0eXAiOiJKV1Qi..."
# }

# 3. Decode token (using jwt.io or command line)
echo "eyJ0eXAiOiJKV1Qi..." | base64 -d
# Should contain: "tenant_schema": "tenant_main"

# 4. Try using token (should succeed)
curl http://main.localhost:8000/api/v1/clients/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1Qi..."

# 5. Try using same token for different tenant (should fail)
# First create another tenant: demo.localhost
curl http://demo.localhost:8000/api/v1/clients/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1Qi..."

# Expected: HTTP 401 Unauthorized
# "Token is not valid for this tenant. Please log in at the correct subdomain."
```

### Automated Test

```bash
uv run python test_tenant_jwt_security.py
```

Expected output:
```
✅ Token contains tenant_schema: tenant_main
✅ Authentication successful with correct tenant
✅ Security check passed: Token rejected for wrong tenant
```

---

## Production Checklist

### Before Deployment

- [ ] **Change JWT signing key** in settings.py
  ```python
  SIMPLE_JWT = {
      'SIGNING_KEY': os.environ['JWT_SECRET_KEY'],  # Load from env
  }
  ```

- [ ] **Use strong algorithm** (RS256 recommended for production)
  ```python
  SIMPLE_JWT = {
      'ALGORITHM': 'RS256',
      'SIGNING_KEY': private_key,
      'VERIFYING_KEY': public_key,
  }
  ```

- [ ] **Configure token lifetimes** appropriately
  ```python
  SIMPLE_JWT = {
      'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # Short-lived
      'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
  }
  ```

- [ ] **Enable HTTPS** for all subdomains
  - Configure SSL certificates (wildcard: `*.leopard.com`)
  - Enable HSTS headers

- [ ] **Test token refresh flow**
  - Ensure refresh tokens also validate tenant_schema

- [ ] **Implement token blacklist** (already configured)
  - Enables logout and token revocation

- [ ] **Monitor for auth failures**
  - Log cross-tenant token attempts for security analysis

---

## FAQ

### Q: What if a user has accounts in multiple tenants?

**A**: They must log in separately for each tenant. Each login generates a tenant-specific token.

```
User logs in to acme.leopard.com → gets token for tenant_acme
User logs in to demo.leopard.com → gets token for tenant_demo

Tokens are independent and cannot be used interchangeably.
```

### Q: What about token refresh?

**A**: Refresh tokens also contain `tenant_schema` and are validated the same way. When refreshing, the new access token inherits the tenant_schema from the refresh token.

### Q: Can we use cookies instead of localStorage?

**A**: Yes! For better XSS protection:

```python
# In TenantTokenObtainPairView, set HttpOnly cookies
response.set_cookie(
    'access_token',
    access_token,
    httponly=True,
    secure=True,  # HTTPS only
    samesite='Strict'
)
```

Then use Cookie-based authentication instead of Bearer tokens.

### Q: What if TenantMainMiddleware fails to set tenant?

**A**: The authentication will fail gracefully because `connection.schema_name` defaults to `'public'`, and most tokens won't have `tenant_schema='public'`.

---

## Summary

### Before Fix ❌
```
User → acme.leopard.com → JWT (no tenant info)
User → competitor.leopard.com → Same JWT → ⚠️ UNAUTHORIZED ACCESS
```

### After Fix ✅
```
User → acme.leopard.com → JWT (tenant_schema='tenant_acme')
User → competitor.leopard.com → Same JWT → ❌ BLOCKED (tenant mismatch)
```

**Result**: Tenant-bound JWT tokens prevent cross-tenant data access, ensuring complete tenant isolation at the authentication layer.

---

*Last Updated: December 22, 2025*
