# Creating Your First Tenant in Production

This guide walks you through creating your first tenant in a production environment using the flattened subdomain architecture: `tenant-app.company.com`

## Prerequisites

### 1. Environment Variables

Ensure your production environment has these variables set:

```bash
# Required for tenant creation
BASE_DOMAIN=yourcompany.com          # Your production domain
APP_SUBDOMAIN=immigrate              # Application subdomain (default: 'immigrate')
SECRET_KEY=your-secret-key
DEBUG=False
```

**Example:**
- If your production domain is `example.com` and you want tenants like `acme-immigrate.example.com`
- Set: `BASE_DOMAIN=example.com` and `APP_SUBDOMAIN=immigrate`

### 2. DNS Configuration

Before creating tenants, ensure your DNS is configured for wildcard subdomains:

**DNS Record (A or CNAME):**
```
*.immigrate.yourcompany.com  →  Your server IP (or CNAME to your load balancer)
```

This allows any tenant subdomain (e.g., `acme-immigrate.yourcompany.com`) to resolve to your server.

### 3. Database Migrations

Ensure all migrations are applied to the public schema:

```bash
# In your production environment
python manage.py migrate_schemas --shared
```

## Step-by-Step: Create Your First Tenant

### Step 1: Access Your Production Server

SSH into your production server or access your Docker container:

```bash
# If using Docker
docker exec -it leopard-backend bash

# Or SSH into your server
ssh user@your-production-server.com
```

### Step 2: Navigate to Backend Directory

```bash
cd /path/to/your/backend
# Or if in Docker container:
cd /app
```

### Step 3: Run the Create Tenant Command

**Important for Docker:** The container uses `uv` with a virtual environment. You must use the venv's Python or activate it first.

**Option A: Use the virtual environment Python directly (Recommended for Docker):**

```bash
# In Docker container
/app/.venv/bin/python manage.py register_tenant \
  --name "Your Company Name" \
  --subdomain "yourtenant" \
  --admin-email "admin@yourcompany.com" \
  --admin-password "SecurePassword123!"
```

**Option B: Activate the virtual environment first:**

```bash
# In Docker container
source /app/.venv/bin/activate
python manage.py register_tenant \
  --name "Your Company Name" \
  --subdomain "yourtenant" \
  --admin-email "admin@yourcompany.com" \
  --admin-password "SecurePassword123!"
```

**Option C: Run directly from host (Docker one-liner):**

```bash
# From your host machine (not inside container)
docker exec -it leopard-backend /app/.venv/bin/python manage.py register_tenant \
  --name "Your Company Name" \
  --subdomain "yourtenant" \
  --admin-email "admin@yourcompany.com" \
  --admin-password "SecurePassword123!"
```

**Parameters:**
- `--name`: Company/Organization name (display name)
- `--subdomain`: Tenant identifier (e.g., "acme", "demo", "company1")
  - This will create: `yourtenant-immigrate.yourcompany.com`
  - Must be lowercase, alphanumeric, no spaces
- `--admin-email`: Email for the tenant's super admin user
- `--admin-password`: Password for the tenant admin (use a strong password!)

**Example (Docker):**
```bash
# Inside container
/app/.venv/bin/python manage.py register_tenant \
  --name "Acme Corporation" \
  --subdomain "acme" \
  --admin-email "admin@acme.com" \
  --admin-password "AcmeSecure2024!"

# Or from host
docker exec -it leopard-backend /app/.venv/bin/python manage.py register_tenant \
  --name "Acme Corporation" \
  --subdomain "acme" \
  --admin-email "admin@acme.com" \
  --admin-password "AcmeSecure2024!"
```

### Step 4: Run Migrations for the New Tenant

After creating the tenant, run migrations for its schema:

**For Docker:**
```bash
# Migrate the specific tenant schema
/app/.venv/bin/python manage.py migrate_schemas --schema=tenant_yourtenant

# Or migrate all tenant schemas
/app/.venv/bin/python manage.py migrate_schemas --tenant

# Or from host
docker exec -it leopard-backend /app/.venv/bin/python manage.py migrate_schemas --schema=tenant_yourtenant
```

**For non-Docker (regular server):**
```bash
# Migrate the specific tenant schema
python manage.py migrate_schemas --schema=tenant_yourtenant

# Or migrate all tenant schemas
python manage.py migrate_schemas --tenant
```

**Note:** The tenant schema is automatically created, but you need to run migrations to set up all the tables.

### Step 5: Verify Tenant Creation

Check that everything was created correctly:

**For Docker:**
```bash
# List all tenants
/app/.venv/bin/python manage.py shell

# Or from host
docker exec -it leopard-backend /app/.venv/bin/python manage.py shell
```

**For non-Docker:**
```bash
python manage.py shell
```

```python
from tenants.models import Tenant, Domain

# List all tenants
tenants = Tenant.objects.all()
for tenant in tenants:
    print(f"Tenant: {tenant.name} (Schema: {tenant.schema_name})")
    domains = Domain.objects.filter(tenant=tenant)
    for domain in domains:
        print(f"  Domain: {domain.domain} (Primary: {domain.is_primary})")
```

## What Gets Created

When you run `register_tenant`, the following is created:

1. **Tenant Record** (in `public` schema)
   - Schema name: `tenant_yourtenant`
   - Company name, subscription status (defaults to TRIAL)
   - Active status

2. **PostgreSQL Schema** (automatically created)
   - Schema: `tenant_yourtenant`
   - Isolated database schema for this tenant's data

3. **Domain Mapping** (in `public` schema)
   - Domain: `yourtenant-immigrate.yourcompany.com`
   - Links the subdomain to the tenant

4. **Admin User** (in tenant schema)
   - Superuser account in the tenant's schema
   - Can log in and manage the tenant

## Accessing Your Tenant

After creation, your tenant will be accessible at:

```
https://yourtenant-immigrate.yourcompany.com
```

**Login Credentials:**
- Email: The `--admin-email` you provided
- Password: The `--admin-password` you provided

## Using Wildcard Domains (Optional)

**Note:** The `register_tenant` command creates a specific subdomain for the tenant. Wildcard domains are not supported in the current implementation.

## Troubleshooting

### Error: "ModuleNotFoundError: No module named 'django'"

**Cause:** In Docker containers, you're not using the virtual environment where Django is installed.

**Solution:**
- Use the full path to the venv Python: `/app/.venv/bin/python manage.py register_tenant ...`
- Or activate the venv first: `source /app/.venv/bin/activate`
- Or run from host: `docker exec -it leopard-backend /app/.venv/bin/python manage.py register_tenant ...`

**Quick Fix:**
```bash
# Instead of: python manage.py register_tenant ...
# Use: /app/.venv/bin/python manage.py register_tenant ...
```

### Error: "No tenant found for domain"

**Cause:** DNS not configured or domain doesn't match the pattern.

**Solution:**
1. Verify DNS: `dig yourtenant-immigrate.yourcompany.com`
2. Check `BASE_DOMAIN` and `APP_SUBDOMAIN` environment variables
3. Verify domain in database:
   ```python
   from tenants.models import Domain
   Domain.objects.all()
   ```

### Error: "Schema already exists"

**Cause:** Tenant with this subdomain already exists.

**Solution:**
- Use a different `--subdomain` value
- Or delete the existing tenant first (if safe to do so)

### Error: "Database connection failed"

**Cause:** Database not accessible or credentials incorrect.

**Solution:**
- Check database connection settings
- Verify database is running
- Check firewall rules

### Tenant Created But Can't Access

1. **Check DNS:** Ensure `*.immigrate.yourcompany.com` resolves to your server (wildcard DNS)
2. **Check Nginx/Reverse Proxy:** Ensure it's configured to handle flattened subdomain pattern (`tenant-immigrate.yourcompany.com`)
3. **Check Migrations:** Run `migrate_schemas --schema=tenant_yourtenant`
4. **Check Logs:** Review application logs for errors

## Next Steps

After creating your first tenant:

1. **Test Login:** Access the tenant URL and log in with admin credentials
2. **Configure Tenant:** Set up tenant-specific settings, users, etc.
3. **Create Additional Tenants:** Repeat the process for more tenants
4. **Monitor:** Check application logs and database for any issues

## Security Best Practices

1. **Strong Passwords:** Use complex passwords for tenant admins
2. **Environment Variables:** Never commit secrets to version control
3. **SSL/TLS:** Ensure HTTPS is configured for all tenant subdomains
4. **Regular Backups:** Backup tenant schemas regularly
5. **Access Control:** Limit who can create tenants (consider API-based creation with authentication)

## Additional Resources

- [Multi-Tenant Migration Summary](../docs/MULTI_TENANT_MIGRATION_SUMMARY.md)
- [4-Level Subdomain Architecture](../../../docs/FOUR_LEVEL_SUBDOMAIN_ARCHITECTURE.md)
- [Docker Deployment Guide](../../../DOCKER_DEPLOYMENT.md)

