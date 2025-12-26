# 4-Level Subdomain Architecture Implementation

## Overview

Leopard Immigration CRM now implements a **4-level subdomain architecture** for professional multi-tenant SaaS deployment.

**Structure**: `tenant.app.company.com`

- **Level 1** (TLD): `com`
- **Level 2** (Company): `company`
- **Level 3** (Application): `app`
- **Level 4** (Tenant): `tenant` (dynamic)

---

## Architecture Comparison

### Before (2-Level)
```
tenant.localhost
tenant.leopard.com

Examples:
- acme.localhost
- demo.leopard.com
```

**Issues**:
- No application namespace
- Tenant directly on base domain
- Not scalable for multiple products

### After (4-Level)
```
tenant.app.company.com

Examples:
- acme.app.localhost (development)
- acme.app-staging.company.com (staging)
- acme.app.company.com (production)
```

**Benefits**:
- ✅ Application namespace (`app`)
- ✅ Supports multiple products (`app`, `api`, `admin`, etc.)
- ✅ Professional SaaS structure
- ✅ Scalable to 10,000+ tenants

---

## Domain Structure

### Development
```
tenant.app.localhost:8000

Examples:
- http://acme.app.localhost:8000
- http://demo.app.localhost:8000
- http://test.app.localhost:8000
```

### Staging
```
tenant.app-staging.company.com

Examples:
- https://acme.app-staging.company.com
- https://demo.app-staging.company.com
```

### Production
```
tenant.app.company.com

Examples:
- https://acme.app.company.com
- https://demo.app.company.com
- https://enterprise.app.company.com
```

---

## Backend Implementation

### 1. Custom Middleware

**File**: `backend/tenants/middleware.py`

```python
class FourLevelSubdomainMiddleware(BaseTenantMainMiddleware):
    """
    Extracts tenant from 4-level subdomain structure.

    acme.app.company.com → tenant='acme'
    demo.app.localhost → tenant='demo'
    app.company.com → no tenant (public/admin)
    """

    def get_tenant_subdomain(self, hostname):
        parts = hostname.split('.')

        if len(parts) >= 3:
            tenant_subdomain = parts[0]

            # Validate it's not the app subdomain itself
            if tenant_subdomain == settings.APP_SUBDOMAIN:
                return None  # Public/admin access

            return tenant_subdomain

        return None
```

### 2. Settings Configuration

**File**: `backend/leopard/settings.py`

```python
# 4-level subdomain configuration
APP_SUBDOMAIN = os.getenv('APP_SUBDOMAIN', 'app')
BASE_DOMAIN = os.getenv('BASE_DOMAIN', 'localhost')

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    f'*.{APP_SUBDOMAIN}.localhost',          # *.app.localhost
    f'*.{APP_SUBDOMAIN}.{BASE_DOMAIN}',      # *.app.company.com
    f'{APP_SUBDOMAIN}.{BASE_DOMAIN}',        # app.company.com
]

MIDDLEWARE = [
    'tenants.middleware.FourLevelSubdomainMiddleware',  # CUSTOM
    # ... other middleware
]
```

### 3. Environment Variables

**File**: `backend/.env`

```bash
# 4-Level Subdomain Configuration
APP_SUBDOMAIN=app
BASE_DOMAIN=localhost

# For production:
# BASE_DOMAIN=company.com
```

### 4. Tenant Creation

```bash
# Create tenant with 4-level subdomain
uv run python manage.py create_tenant \
  --name "Acme Corporation" \
  --subdomain "acme" \
  --admin-email "admin@acme.com" \
  --admin-password "secure_password"

# Creates: acme.app.localhost (development)
# Production: acme.app.company.com
```

### 5. Domain Model

**Database Record**:
```python
# Specific subdomain
Domain.objects.create(
    domain='acme.app.localhost',
    tenant=tenant,
    is_primary=True
)

# Wildcard pattern (for dynamic tenants)
Domain.objects.create(
    domain='*.app.localhost',
    tenant=tenant,
    is_primary=True
)
```

---

## Frontend Implementation

### 1. Domain Configuration

**File**: `frontend/src/config/domain.config.ts`

```typescript
/**
 * Extract tenant from 4-level subdomain
 */
export const getTenantFromHostname = (): string | null => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (parts.length < 3) {
    return null; // Not a tenant URL
  }

  const tenantSubdomain = parts[0];
  const appSubdomain = import.meta.env.VITE_APP_SUBDOMAIN || 'app';

  if (tenantSubdomain === appSubdomain) {
    return null; // This is app.company.com (no tenant)
  }

  return tenantSubdomain;
};

/**
 * Build API base URL
 */
export const getApiBaseUrl = (): string => {
  const tenant = getTenantFromHostname();
  if (!tenant) {
    throw new Error('No tenant found in URL');
  }

  const appSubdomain = import.meta.env.VITE_APP_SUBDOMAIN || 'app';
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'localhost';
  const isLocal = baseDomain === 'localhost';

  const protocol = isLocal ? 'http' : 'https';
  const port = isLocal ? ':8000' : '';

  return `${protocol}://${tenant}.${appSubdomain}.${baseDomain}${port}/api/v1`;
};
```

### 2. HTTP Client

**File**: `frontend/src/services/api/httpClient.ts`

```typescript
import { getApiBaseUrl } from '../../config/domain.config';

// Auto-detect API URL from current subdomain
const BASE_URL = import.meta.env.VITE_API_BASE_URL || getApiBaseUrl();

export const httpClient = axios.create({
  baseURL: BASE_URL,
  // ...
});
```

### 3. Environment Variables

**File**: `frontend/.env.development`

```bash
VITE_APP_SUBDOMAIN=app
VITE_BASE_DOMAIN=localhost
VITE_ENVIRONMENT=development
```

**File**: `frontend/.env.production`

```bash
VITE_APP_SUBDOMAIN=app
VITE_BASE_DOMAIN=company.com
VITE_ENVIRONMENT=production
```

### 4. Usage in Components

```typescript
import {
  getTenantFromHostname,
  redirectToTenant,
  getEnvironmentConfig
} from '@/config/domain.config';

// Get current tenant
const tenant = getTenantFromHostname();
console.log('Current tenant:', tenant); // 'acme'

// Redirect to different tenant
redirectToTenant('demo', '/dashboard');
// Redirects to: demo.app.localhost:8000/dashboard

// Get environment info
const config = getEnvironmentConfig();
console.log(config);
// {
//   environment: 'development',
//   isDevelopment: true,
//   apiBaseUrl: 'http://acme.app.localhost:8000/api/v1',
//   currentTenant: 'acme',
//   domainPattern: '{tenant}.app.localhost'
// }
```

---

## Setup Instructions

### Development Setup

#### 1. Backend Configuration

```bash
cd backend

# Update .env file
cat >> .env << EOF
APP_SUBDOMAIN=app
BASE_DOMAIN=localhost
EOF

# Update existing tenant domains
uv run python update_tenant_domains.py

# Create new tenant
uv run python manage.py create_tenant \
  --name "Demo Company" \
  --subdomain "demo" \
  --admin-email "admin@demo.com" \
  --admin-password "demo123"
```

#### 2. Update /etc/hosts

**macOS/Linux**:
```bash
sudo nano /etc/hosts
```

Add:
```
127.0.0.1 main.app.localhost
127.0.0.1 demo.app.localhost
127.0.0.1 acme.app.localhost
```

**Windows**:
```
Edit C:\Windows\System32\drivers\etc\hosts (as Administrator)

Add:
127.0.0.1 main.app.localhost
127.0.0.1 demo.app.localhost
127.0.0.1 acme.app.localhost
```

#### 3. Frontend Configuration

```bash
cd frontend

# Create .env (already created)
# VITE_APP_SUBDOMAIN=app
# VITE_BASE_DOMAIN=localhost

# Install dependencies (if needed)
npm install

# Start development server
npm run dev
```

#### 4. Start Services

```bash
# Terminal 1: Backend
cd backend
uv run python manage.py runserver 0.0.0.0:8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

#### 5. Access Application

```
Backend API:
- http://main.app.localhost:8000/api/v1/
- http://demo.app.localhost:8000/api/v1/

Admin:
- http://main.app.localhost:8000/admin/

Frontend:
- http://localhost:5173 (proxy to backend via tenant subdomain)
- Or configure Vite to serve on tenant subdomain
```

---

## Production Deployment

### 1. DNS Configuration

Set up DNS records:

```
Type  Name                         Target
----  ---------------------------  ----------------
A     app.company.com              <server_ip>
A     *.app.company.com            <server_ip>

Or:

CNAME *.app.company.com            app.company.com
```

### 2. SSL Certificates

Get wildcard SSL certificate:

```bash
# Using Let's Encrypt with DNS challenge
certbot certonly \
  --dns-<provider> \
  -d app.company.com \
  -d *.app.company.com
```

### 3. Backend Configuration

```bash
# Update .env for production
APP_SUBDOMAIN=app
BASE_DOMAIN=company.com
DEBUG=False
SECRET_KEY=<strong_random_key>
```

### 4. Frontend Build

```bash
# Build for production
cd frontend
npm run build

# Outputs to dist/
# Deploy to CDN or static hosting
```

### 5. Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/leopard

# Wildcard server block for all tenant subdomains
server {
    listen 443 ssl http2;
    server_name *.app.company.com;

    ssl_certificate /etc/letsencrypt/live/app.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.company.com/privkey.pem;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files
    location / {
        root /var/www/leopard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name *.app.company.com;
    return 301 https://$host$request_uri;
}
```

---

## Testing

### Backend Tests

```bash
# Test middleware
cd backend

# Test tenant extraction
uv run python -c "
from tenants.middleware import get_tenant_from_hostname
assert get_tenant_from_hostname('acme.app.localhost') == 'acme'
assert get_tenant_from_hostname('demo.app.company.com') == 'demo'
assert get_tenant_from_hostname('app.localhost') is None
print('✓ All tests passed')
"

# Test API access
curl http://main.app.localhost:8000/api/v1/
```

### Frontend Tests

```bash
cd frontend

# Test domain config
npm run test

# Or manual test in browser console:
# Open: http://acme.app.localhost:5173
# Console:
import { getTenantFromHostname } from './config/domain.config';
console.log(getTenantFromHostname()); // 'acme'
```

---

## Migration Guide

### Migrating Existing Tenants

```bash
# Run migration script
cd backend
uv run python update_tenant_domains.py

# Output:
# main.localhost → main.app.localhost
# demo.localhost → demo.app.localhost
```

### Updating Frontend

1. Add domain config file: `src/config/domain.config.ts`
2. Update httpClient to use domain config
3. Create `.env.development` and `.env.production`
4. Update any hardcoded API URLs to use `getApiBaseUrl()`

---

## Troubleshooting

### Issue: Cannot access tenant subdomain

**Solution**: Add to /etc/hosts
```bash
echo "127.0.0.1 tenant.app.localhost" | sudo tee -a /etc/hosts
```

### Issue: 404 on tenant subdomain

**Cause**: Middleware not extracting tenant correctly

**Solution**: Check logs
```bash
# Backend logs will show:
# "No tenant found for domain: tenant.app.localhost"

# Verify domain exists in database
uv run python manage.py shell
>>> from tenants.models import Domain
>>> Domain.objects.all()
```

### Issue: CORS errors

**Solution**: Update CORS settings
```python
# settings.py
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://\w+\.app\.company\.com$",
    r"^http://\w+\.app\.localhost$",
]
```

### Issue: JWT token not working

**Cause**: Token from one tenant used on another

**Solution**: Clear tokens and log in again
```javascript
localStorage.clear();
// Navigate to: tenant.app.localhost:8000/login
```

---

## Benefits of 4-Level Subdomain Architecture

### 1. **Scalability**
- Support 10,000+ tenants on same infrastructure
- Easy to add new application namespaces (`api.company.com`, `admin.company.com`)

### 2. **Professional Branding**
- `acme.app.company.com` looks more professional than `acme.company.com`
- Clear separation of application namespace

### 3. **Security**
- Complete tenant isolation at DNS level
- Easier SSL wildcard certificate management
- Tenant-bound JWT tokens prevent cross-tenant access

### 4. **Multi-Product Support**
- `tenant.app.company.com` - Main application
- `tenant.api.company.com` - API gateway
- `tenant.admin.company.com` - Admin portal

### 5. **Development Flexibility**
- Easy to test multiple tenants locally
- Clear staging vs production separation

---

## Next Steps

1. **Update existing tenants**: Run `update_tenant_domains.py`
2. **Update /etc/hosts**: Add new 4-level domains
3. **Test locally**: Access `http://tenant.app.localhost:8000`
4. **Deploy to staging**: Test with `tenant.app-staging.company.com`
5. **Production rollout**: Update DNS, deploy with `tenant.app.company.com`

---

## Reference

**Backend Files**:
- `backend/tenants/middleware.py` - Custom middleware
- `backend/leopard/settings.py` - Configuration
- `backend/tenants/management/commands/create_tenant.py` - Tenant creation
- `backend/update_tenant_domains.py` - Migration script

**Frontend Files**:
- `frontend/src/config/domain.config.ts` - Domain utilities
- `frontend/src/services/api/httpClient.ts` - HTTP client
- `frontend/.env.development` - Dev environment
- `frontend/.env.production` - Prod environment

---

*Last Updated: December 22, 2025*
*Architecture: 4-Level Subdomain (tenant.app.company.com)*
