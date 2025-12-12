# Leopard - Immigration CRM Platform

A comprehensive Multi-Tenant SaaS CRM system designed for Immigration and Study Abroad agents with robust Role-Based Access Control (RBAC).

## Project Structure

```
leopard/
├── backend/          # Django REST API (Python)
├── frontend/         # React SPA (TypeScript)
├── docker-compose.yml
└── README.md
```

## Features

- **Multi-Tenant Architecture**: Supports multiple organizations with complete data isolation
- **Role-Based Access Control**: Granular permissions for Super Admin, Branch Manager, Agent, and Intern roles
- **Compact UI**: High-density interface optimized for maximum data visibility
- **RESTful API**: Django-based backend with comprehensive API endpoints
- **Real-time Updates**: WebSocket support via Django Channels

## Tech Stack

### Backend
- **Python 3.11+** with Django 4.2
- **Django REST Framework** for API
- **Django Channels** for WebSocket support
- **PostgreSQL** for database
- **Daphne** for ASGI server
- **uv** for fast package management

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI v5** for component library
- **React Router DOM v6** for routing
- **Zustand** for state management

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager
- PostgreSQL (or use Docker)

### Install uv (Python Package Manager)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with Homebrew
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Quick Start with Docker

```bash
# Start PostgreSQL database
docker-compose up -d

# Setup backend
cd backend
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser --username admin --email admin@example.com
uv run python manage.py runserver

# In another terminal, setup frontend
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend

# Install dependencies with uv
uv sync

# Run migrations
uv run python manage.py migrate

# Create admin user
uv run python manage.py createsuperuser --username admin --email admin@example.com

# Run development server
uv run python manage.py runserver
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Frontend will be available at `http://localhost:5173`

## API Endpoints

- REST API: `http://localhost:8000/api/`
- Admin Panel: `http://localhost:8000/admin/`
- API Auth: `http://localhost:8000/api-auth/login`
- OpenAPI Schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/docs/`

## RBAC Roles

- **Super Admin**: Full system access
- **Branch Manager**: Branch-level management and oversight
- **Agent**: Client and application management
- **Intern**: Limited read access

## Development

### Backend Commands

```bash
# Install dependencies
uv sync

# Add a package
uv add <package-name>

# Add a dev dependency
uv add --dev <package-name>

# Run Django commands
uv run python manage.py <command>

# Create new Django app
uv run python manage.py startapp <app-name>

# Make migrations
uv run python manage.py makemigrations

# Apply migrations
uv run python manage.py migrate

# Format code
uv run black .

# Lint code
uv run ruff check .

# Run tests
uv run pytest
```

### Frontend Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

## Deployment

See `backend/deployment/` for deployment scripts and configurations:
- Nginx configuration
- Daphne (ASGI) service files
- AWS deployment scripts

## License

Proprietary - All rights reserved
