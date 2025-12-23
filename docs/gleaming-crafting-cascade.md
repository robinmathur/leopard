# Docker Deployment Plan for Leopard Immigration CRM

## Overview

Migrate Leopard from systemd + nginx deployment to fully containerized Docker architecture with:
- Backend: Django + Daphne ASGI in Docker
- Frontend: React + Vite (built) served by nginx in Docker
- Database: PostgreSQL in Docker with persistent volumes
- Reverse Proxy: Nginx with Let's Encrypt SSL and SSE support
- CI/CD: GitHub Actions with self-hosted runner

**Deployment Strategy**: Build images on server, no registry, .env files for secrets, automated SSL with certbot.

---

## Architecture

```
Internet (HTTPS)
    ↓
Nginx Reverse Proxy (SSL Termination, Port 443)
    ├─→ /api/* → Backend Container (Daphne:8000)
    ├─→ /admin/* → Backend Container (Daphne:8000)
    ├─→ /static/* → Shared Volume (staticfiles)
    ├─→ /api/v1/notifications/stream/ → Backend (SSE, no buffering)
    └─→ /* → Frontend Container (nginx:80)

Backend Container ↔ PostgreSQL Container (internal network)
```

**Networks**: Single bridge network `leopard-network`
**Volumes**: pgdata, staticfiles, mediafiles, certbot-conf, certbot-www

---

## Implementation Steps

### 1. Create Docker Configuration Files

#### 1.1 Backend Dockerfile (`backend/Dockerfile`)
- Multi-stage build: builder + runtime
- Base: `python:3.11-slim`
- Install uv package manager
- Copy dependencies and install with `uv sync --no-dev`
- Create non-root user `django:django`
- Copy application code
- Run `collectstatic` during build
- Expose port 8000
- Health check: `curl localhost:8000/api/v1/health/`
- CMD: `bash entrypoint.sh`

#### 1.2 Backend Entrypoint Script (`backend/entrypoint.sh`)
1. Wait for PostgreSQL (pg_isready loop)
2. Run migrations: `uv run python manage.py migrate --noinput`
3. Start Daphne: `uv run daphne -b 0.0.0.0 -p 8000 leopard.asgi:application`

**Critical**: Daphne must bind to `0.0.0.0:8000` (not Unix socket)

#### 1.3 Backend Health Check (`backend/healthcheck.sh`)
```bash
#!/bin/bash
curl -f http://localhost:8000/api/v1/health/ || exit 1
```

#### 1.4 Frontend Dockerfile (`frontend/Dockerfile`)
- Multi-stage build: Node 18 builder + nginx alpine runtime
- Builder stage:
  - Copy package*.json, run `npm ci`
  - Copy source code
  - Set build args: `VITE_APP_SUBDOMAIN`, `VITE_BASE_DOMAIN`, `VITE_ENVIRONMENT`
  - Run `npm run build` → output to `/app/dist`
- Runtime stage:
  - Copy custom nginx.conf
  - Copy build from builder: `/app/dist` → `/usr/share/nginx/html`
  - Expose port 80
  - CMD: `nginx -g 'daemon off;'`

#### 1.5 Frontend Nginx Config (`frontend/nginx.conf`)
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache for index.html
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
}
```

#### 1.6 Frontend .dockerignore (`frontend/.dockerignore`)
```
node_modules
dist
.env.local
.env.*.local
npm-debug.log*
.DS_Store
```

#### 1.7 Main Nginx Reverse Proxy Config (`nginx/nginx.conf`)

**Critical SSE Configuration**:
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name .immigrate.company.com;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS main server
server {
    listen 443 ssl http2;
    server_name .immigrate.company.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/immigrate.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/immigrate.company.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SSE endpoint - CRITICAL: No buffering
    location /api/v1/notifications/stream/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE-specific
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;  # 24 hours
        proxy_set_header X-Accel-Buffering no;

        # CORS for SSE
        add_header Access-Control-Allow-Origin * always;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade (future-proof)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Admin panel
    location /admin/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (Django)
    location /static/ {
        alias /app/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /app/mediafiles/;
        expires 30d;
    }

    # Frontend (React SPA)
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 1.8 Nginx Dockerfile (`nginx/Dockerfile`)
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
RUN mkdir -p /app/staticfiles /app/mediafiles /var/www/certbot
EXPOSE 80 443
```

#### 1.9 Production Docker Compose (`docker-compose.yml`)

**Key Services**:
- `postgres`: PostgreSQL 15 with health check, named volume `pgdata`
- `backend`: Django + Daphne, depends on postgres, shares staticfiles volume
- `frontend`: React build served by nginx
- `nginx`: Main reverse proxy, SSL termination, ports 80/443
- `certbot`: Auto-renews SSL certificates every 12 hours

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: leopard-postgres
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - leopard-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: leopard-backend
    restart: always
    env_file:
      - ./backend/.env.${DJANGO_ENV:-production}
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - staticfiles:/app/staticfiles
      - mediafiles:/app/media
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - leopard-network
    healthcheck:
      test: ["CMD", "bash", "/app/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_APP_SUBDOMAIN: ${VITE_APP_SUBDOMAIN}
        VITE_BASE_DOMAIN: ${VITE_BASE_DOMAIN}
        VITE_ENVIRONMENT: ${VITE_ENVIRONMENT}
    container_name: leopard-frontend
    restart: always
    networks:
      - leopard-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: leopard-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - staticfiles:/app/staticfiles:ro
      - mediafiles:/app/mediafiles:ro
      - certbot-conf:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    depends_on:
      - backend
      - frontend
    networks:
      - leopard-network
    command: "/bin/sh -c 'while :; do sleep 6h & wait $${!}; nginx -s reload; done & nginx -g \"daemon off;\"'"

  certbot:
    image: certbot/certbot
    container_name: leopard-certbot
    restart: unless-stopped
    volumes:
      - certbot-conf:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

networks:
  leopard-network:
    driver: bridge

volumes:
  pgdata:
  staticfiles:
  mediafiles:
  certbot-conf:
  certbot-www:
```

#### 1.10 Development Docker Compose (`docker-compose.dev.yml`)
- Bind mounts for hot reload: `./backend:/app`, `./frontend:/app`
- Exposed ports: 5432, 8000, 5173
- No SSL/certbot
- DEBUG=True
- Simplified configuration for local development

### 2. Add Django Health Check Endpoint

**File**: `backend/immigration/api/v1/views/health.py`

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "healthy", "database": "connected"})
    except Exception as e:
        return Response({"status": "unhealthy", "error": str(e)}, status=503)
```

**Register in**: `backend/immigration/api/v1/urls.py`
```python
path('health/', health_check, name='health-check'),
```

### 3. Update Django Settings for Docker

**File**: `backend/leopard/settings.py`

Add production security settings:
```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000

    # Trust nginx proxy headers
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # CORS for production
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https://\w+\.immigrate\.company\.com$",
    ]
    CORS_ALLOW_ALL_ORIGINS = False

# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600  # 10 minutes
```

### 4. SSL Certificate Setup Script

**File**: `backend/deployment/certbot/init-letsencrypt.sh`

Script to obtain initial Let's Encrypt certificate:
```bash
#!/bin/bash

DOMAIN="immigrate.company.com"
EMAIL="admin@company.com"
STAGING=0  # Set to 1 for testing

# Request certificate
if [ $STAGING = 1 ]; then
  docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --staging \
    -d $DOMAIN -d "*.$DOMAIN"
else
  docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN -d "*.$DOMAIN"
fi

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### 5. GitHub Actions CI/CD Workflow

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: self-hosted
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set environment variables
        run: |
          echo "DJANGO_ENV=production" >> $GITHUB_ENV
          echo "COMPOSE_PROJECT_NAME=leopard" >> $GITHUB_ENV

      - name: Build Docker images
        run: docker-compose build --no-cache

      - name: Stop existing containers
        run: docker-compose down

      - name: Start containers
        run: docker-compose up -d

      - name: Wait for backend to be healthy
        run: |
          sleep 30
          docker-compose exec -T backend python manage.py migrate --noinput

      - name: Health check - Backend
        run: |
          docker-compose exec -T backend curl -f http://localhost:8000/api/v1/health/

      - name: Health check - Frontend
        run: |
          curl -f https://main.immigrate.company.com/

      - name: Clean up Docker resources
        run: docker system prune -f
```

**File**: `.github/workflows/deploy-development.yml`
- Similar structure but uses `docker-compose.dev.yml`
- Triggers on `develop` branch

### 6. Environment Configuration

**File**: `.env.docker.example`

```bash
# Docker Compose Environment
DJANGO_ENV=production
COMPOSE_PROJECT_NAME=leopard

# Database
DB_NAME=leopard_production
DB_USER=leopard_user
DB_PASSWORD=CHANGE_STRONG_PASSWORD
DB_HOST=postgres
DB_PORT=5432

# Django
SECRET_KEY=GENERATE_STRONG_SECRET_KEY
DEBUG=False

# Domain
APP_SUBDOMAIN=immigrate
BASE_DOMAIN=company.com

# Frontend
VITE_APP_SUBDOMAIN=immigrate
VITE_BASE_DOMAIN=company.com
VITE_ENVIRONMENT=production

# SSL
CERTBOT_EMAIL=admin@company.com
CERTBOT_DOMAIN=immigrate.company.com
```

---

## Migration from Systemd to Docker

### Prerequisites
1. DNS A record: `*.immigrate.company.com` → server IP
2. Docker installed on server: `sudo apt install docker.io docker-compose-plugin`
3. .env files created on server from template

### Cutover Steps (15-minute downtime window)

1. **Stop systemd services**:
   ```bash
   sudo systemctl stop daphne nginx
   sudo systemctl disable daphne nginx
   ```

2. **Backup database**:
   ```bash
   pg_dump -U leopard leopard > /home/ubuntu/backup_$(date +%Y%m%d).sql
   ```

3. **Start Docker stack**:
   ```bash
   cd /home/ubuntu/leopard
   docker-compose up -d
   ```

4. **Setup SSL certificates**:
   ```bash
   ./backend/deployment/certbot/init-letsencrypt.sh
   ```

5. **Verify deployment**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   curl -f https://main.immigrate.company.com/
   ```

### Rollback Plan
If issues occur:
```bash
docker-compose down
sudo systemctl start daphne nginx
psql -U leopard leopard < /home/ubuntu/backup_TIMESTAMP.sql
```

---

## Critical Files Summary

### New Files to Create (17 files)
1. `backend/Dockerfile` - Backend multi-stage build
2. `backend/Dockerfile.dev` - Backend development
3. `backend/entrypoint.sh` - Container startup script
4. `backend/healthcheck.sh` - Health check script
5. `frontend/Dockerfile` - Frontend multi-stage build
6. `frontend/Dockerfile.dev` - Frontend development
7. `frontend/.dockerignore` - Docker ignore rules
8. `frontend/nginx.conf` - Frontend nginx config
9. `nginx/Dockerfile` - Main reverse proxy Dockerfile
10. `nginx/nginx.conf` - Main nginx configuration with SSE support
11. `docker-compose.yml` - Production orchestration
12. `docker-compose.dev.yml` - Development orchestration
13. `.env.docker.example` - Environment template
14. `backend/deployment/certbot/init-letsencrypt.sh` - SSL setup script
15. `.github/workflows/deploy-production.yml` - Production CI/CD
16. `.github/workflows/deploy-development.yml` - Development CI/CD
17. `backend/immigration/api/v1/views/health.py` - Health check endpoint

### Files to Modify (2 files)
1. `backend/leopard/settings.py` - Add Docker security settings, connection pooling
2. `backend/immigration/api/v1/urls.py` - Register health check endpoint

---

## Key Configuration Decisions

1. **Daphne TCP (0.0.0.0:8000)** instead of Unix socket - Docker networking requirement
2. **Multi-stage builds** - Smaller images, better security
3. **PostgreSQL in Docker** - Persistent named volumes, easy to migrate to RDS later
4. **Let's Encrypt + Certbot** - Automated SSL renewal every 12 hours
5. **Build on server** - No registry needed, faster deployments
6. **Shared staticfiles volume** - Nginx serves static files directly
7. **SSE-specific nginx config** - `proxy_buffering off` for `/api/v1/notifications/stream/`

---

## Post-Deployment Tasks

1. Setup daily PostgreSQL backups:
   ```bash
   0 2 * * * docker-compose exec -T postgres pg_dump -U leopard leopard > /backups/leopard_$(date +\%Y\%m\%d).sql
   ```

2. Configure log rotation in docker-compose:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

3. Setup GitHub Actions self-hosted runner on production server

4. Monitor container health: `docker stats` and `docker-compose logs -f`

---

## Testing Checklist

**Development**:
- [ ] `docker-compose -f docker-compose.dev.yml up` starts all services
- [ ] Backend API accessible at http://localhost:8000/api/
- [ ] Frontend accessible at http://localhost:5173
- [ ] Hot reload works for backend and frontend

**Production**:
- [ ] SSL certificate obtained and valid
- [ ] HTTPS redirect works (http → https)
- [ ] API endpoints respond correctly
- [ ] SSE notifications work on `/api/v1/notifications/stream/`
- [ ] Multi-tenant subdomains route correctly
- [ ] Admin panel accessible at https://main.immigrate.company.com/admin/
- [ ] Static files cached correctly
- [ ] Container health checks passing
- [ ] Auto-restart on failure works
- [ ] GitHub Actions deployment succeeds
