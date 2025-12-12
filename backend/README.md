# Leopard Backend - Django REST API

Immigration CRM Backend built with Django REST Framework.

## Prerequisites

- Python 3.11+
- PostgreSQL (or use Docker)
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager

### Install uv

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Quick Start

```bash
# Install dependencies
uv sync

# Run migrations
uv run python manage.py migrate

# Create admin user
uv run python manage.py createsuperuser --username admin --email admin@example.com

# Start development server
uv run python manage.py runserver
```

## Commands

### Package Management

```bash
# Install all dependencies (including dev)
uv sync

# Install production dependencies only
uv sync --no-dev

# Add a new package
uv add <package-name>

# Add a dev dependency
uv add --dev <package-name>

# Remove a package
uv remove <package-name>

# Update all packages
uv lock --upgrade

# Export to requirements.txt (for compatibility)
uv export > requirements.txt
```

### Django Commands

```bash
# Run development server
uv run python manage.py runserver

# Make migrations
uv run python manage.py makemigrations

# Apply migrations
uv run python manage.py migrate

# Create superuser
uv run python manage.py createsuperuser --username admin --email admin@example.com

# Create new Django app
uv run python manage.py startapp <app-name>

# Collect static files
uv run python manage.py collectstatic

# Django shell
uv run python manage.py shell
```

### Database Seeding

Seed the database with realistic test data for development and testing:

```bash
# Setup role permissions (required before seeding)
uv run python manage.py setup_role_permissions

# Seed database with test data
uv run python manage.py seed_data

# Clear existing data and re-seed
uv run python manage.py seed_data --clear
```

The `seed_data` command creates:
- **3 Tenants** (organizations)
- **7 Regions** across tenants
- **14 Branches** (2 per region)
- **61 Users** with different roles (Super Admin, Region Manager, Branch Admin, Consultant)
- **6 Visa Categories** (Work, Student, PR, Family, Visitor, Business)
- **13 Visa Types** under categories
- **5 External Agents**
- **60 Clients** distributed across branches
- **~48 Visa Applications**
- **~142 Tasks** assigned to consultants

**Test Credentials:**
- Super Admin: `superadmin` / `password123`
- Tenant Admins: `admin_global_imm`, `admin_visa_expre`, `admin_migration_` / `password123`
- All other users: `password123`

### Code Quality

```bash
# Format code with black
uv run black .

# Lint with ruff
uv run ruff check .

# Lint and fix
uv run ruff check --fix .

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=immigration
```

### Production Server

```bash
# Run with Gunicorn
uv run gunicorn leopard.wsgi:application --bind 0.0.0.0:8000

# Run with Daphne (ASGI - for WebSocket support)
uv run daphne -b 0.0.0.0 -p 8000 leopard.asgi:application

# Run with Uvicorn
uv run uvicorn leopard.asgi:application --host 0.0.0.0 --port 8000
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://leopard:leopard@localhost:5432/leopard
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Or pass directly:

```bash
DB_PASSWORD="xyz" uv run python manage.py runserver
```

## API Endpoints

- REST API: `http://localhost:8000/api/`
- Admin Panel: `http://localhost:8000/admin/`
- API Auth Login: `http://localhost:8000/api-auth/login`
- API Auth Logout: `http://localhost:8000/api-auth/logout`
- OpenAPI Schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/docs/`

## Project Structure

```
backend/
├── leopard/              # Django project settings
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── immigration/          # Main Django app
│   ├── models.py
│   ├── views.py
│   ├── serializer.py
│   ├── permissions.py
│   ├── selectors/        # Query logic
│   ├── services/         # Business logic
│   └── migrations/
├── pyproject.toml        # Dependencies (uv)
├── uv.lock              # Lock file (auto-generated)
└── manage.py
```

## Deployment

See `deployment/` directory for:
- Nginx configuration
- Daphne (ASGI) service files
- AWS deployment scripts

For CI/CD, see the GitHub Actions gist:
https://gist.github.com/rmiyazaki6499/92a7dc283e160333defbae97447c5a83
