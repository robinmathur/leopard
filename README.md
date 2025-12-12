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
- **Python 3.x** with Django
- **Django REST Framework** for API
- **Django Channels** for WebSocket support
- **PostgreSQL** for database
- **Daphne** for ASGI server

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Material-UI v5** for component library
- **React Router DOM v6** for routing
- **Zustand** for state management

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL (or use Docker)

### Quick Start with Docker

```bash
# Start PostgreSQL database
docker-compose up -d

# Setup backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser --username admin --email admin@example.com
python manage.py runserver

# In another terminal, setup frontend
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser --username admin --email admin@example.com

# Run development server
python manage.py runserver
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

## RBAC Roles

- **Super Admin**: Full system access
- **Branch Manager**: Branch-level management and oversight
- **Agent**: Client and application management
- **Intern**: Limited read access

## Development

### Backend Commands

```bash
# Create new Django app
python manage.py startapp <app-name>

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
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
