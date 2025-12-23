# Docker Deployment Guide for Leopard Immigration CRM

This guide covers deploying the Leopard Immigration CRM using Docker with production-ready configurations including SSL, automated deployments, and monitoring.

## Quick Start

### Development Environment

```bash
# 1. Start development environment
docker-compose -f docker-compose.dev.yml up -d

# 2. Access the application
# Backend API: http://localhost:8000/api/
# Frontend: http://localhost:5173
# PostgreSQL: localhost:5432

# 3. View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production Deployment

```bash
# 1. Create environment file
cp .env.docker.example .env
nano .env  # Edit with your production values

# 2. Build and start services
docker-compose up -d

# 3. Setup SSL certificates (first time only)
./backend/deployment/certbot/init-letsencrypt.sh

# 4. Verify deployment
docker-compose ps
curl https://your-domain.com/api/v1/health/
```

---

## Architecture Overview

```
Internet (HTTPS:443)
    ↓
Nginx Reverse Proxy (SSL Termination)
    ├─→ /api/* → Backend Container (Daphne:8000)
    ├─→ /admin/* → Backend Container
    ├─→ /static/* → Shared Volume (staticfiles)
    ├─→ /api/v1/notifications/stream/ → Backend (SSE, no buffering)
    └─→ /* → Frontend Container (nginx:80)

Backend Container ↔ PostgreSQL Container (internal network)
```

**Services:**
- `postgres`: PostgreSQL 15 database with persistent volumes
- `backend`: Django + Daphne ASGI server (Python 3.11)
- `frontend`: React build served by nginx alpine
- `nginx`: Main reverse proxy with SSL termination
- `certbot`: Automated SSL certificate renewal

**Networks:** Single bridge network `leopard-network`
**Volumes:** pgdata, staticfiles, mediafiles, certbot-conf, certbot-www

---

## Files Created

### Docker Configuration
- `backend/Dockerfile` - Multi-stage build for Django backend
- `backend/Dockerfile.dev` - Development backend with hot-reload
- `backend/entrypoint.sh` - Container startup script (migrations + Daphne)
- `backend/healthcheck.sh` - Health check script for Docker
- `frontend/Dockerfile` - Multi-stage build for React frontend
- `frontend/Dockerfile.dev` - Development frontend with Vite dev server
- `frontend/nginx.conf` - Nginx config for serving React SPA
- `frontend/.dockerignore` - Docker ignore rules for frontend
- `nginx/Dockerfile` - Main reverse proxy Dockerfile
- `nginx/nginx.conf` - Reverse proxy config with SSE support
- `nginx/conf.d/default.conf` - Additional nginx configurations

### Orchestration
- `docker-compose.yml` - Production orchestration (5 services)
- `docker-compose.dev.yml` - Development orchestration

### Configuration
- `.env.docker.example` - Environment variables template
- `backend/deployment/certbot/init-letsencrypt.sh` - SSL certificate setup

### CI/CD
- `.github/workflows/deploy-production.yml` - Production deployment workflow
- `.github/workflows/deploy-development.yml` - Development deployment workflow

### Django Updates
- `backend/immigration/api/v1/views/health.py` - Health check endpoint
- `backend/immigration/api/v1/urls.py` - Registered health check route
- `backend/leopard/settings.py` - Added Docker security settings and connection pooling

---

## Environment Configuration

### Required Environment Variables

Create `.env` file from template:
```bash
cp .env.docker.example .env
```

**Critical Variables:**
```bash
# Application
DJANGO_ENV=production  # or development, staging
SECRET_KEY=<generate-strong-secret-key>
DEBUG=False

# Database
DB_NAME=leopard_production
DB_USER=leopard_user
DB_PASSWORD=<strong-password>
DB_HOST=postgres
DB_PORT=5432

# Domain
APP_SUBDOMAIN=immigrate
BASE_DOMAIN=company.com  # Change to your domain

# Frontend
VITE_APP_SUBDOMAIN=immigrate
VITE_BASE_DOMAIN=company.com
VITE_ENVIRONMENT=production

# SSL
CERTBOT_EMAIL=admin@company.com
CERTBOT_DOMAIN=immigrate.company.com
```

**Generate Secret Key:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

---

## SSL Certificate Setup

### Prerequisites
1. DNS A record pointing to your server IP
2. Ports 80 and 443 accessible from internet
3. Domain configured in `.env` file

### Initial Setup

```bash
# Test with staging certificates first (recommended)
./backend/deployment/certbot/init-letsencrypt.sh --staging

# If successful, get real certificates
./backend/deployment/certbot/init-letsencrypt.sh
```

**Manual Setup:**
```bash
# Start nginx
docker-compose up -d nginx

# Request certificate
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@company.com \
  --agree-tos \
  -d immigrate.company.com -d "*.immigrate.company.com"

# Reload nginx
docker-compose exec nginx nginx -s reload
```

### Auto-Renewal
Certificates are automatically renewed by the `certbot` container every 12 hours. Nginx reloads every 6 hours to pick up new certificates.

---

## GitHub Actions CI/CD

### Setup Self-Hosted Runner

```bash
# On your production server
mkdir actions-runner && cd actions-runner

# Download latest runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure
./config.sh --url https://github.com/YOUR_ORG/leopard --token YOUR_TOKEN

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Deployment Workflows

**Production Deployment** (`.github/workflows/deploy-production.yml`)
- Triggered by push to `main` branch
- Builds Docker images on server
- Runs migrations
- Health checks
- Auto-cleanup

**Development Deployment** (`.github/workflows/deploy-development.yml`)
- Triggered by push to `develop` branch
- Uses `docker-compose.dev.yml`
- Exposes ports for debugging

---

## Health Checks

### Endpoint
```
GET /api/v1/health/
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": 1234567890.123,
  "checks": {
    "database": "connected",
    "cache": "connected"
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": 1234567890.123,
  "checks": {
    "database": "error: connection refused",
    "cache": "not configured"
  }
}
```

### Docker Health Checks

All services have built-in Docker health checks:

```bash
# View health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check specific service
docker inspect leopard-backend | grep -A 5 Health
```

---

## Common Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Operations
```bash
# Backup database
docker-compose exec -T postgres pg_dump -U leopard leopard > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U leopard leopard < backup.sql

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### Container Management
```bash
# Restart specific service
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (DANGER: deletes data)
docker-compose down -v
```

### Resource Monitoring
```bash
# Real-time stats
docker stats

# Container resource usage
docker-compose top

# Disk usage
docker system df
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait for postgres health check
# 2. Migration errors - check database schema
# 3. Missing .env file - verify environment variables

# Verify database connection
docker-compose exec backend python manage.py dbshell
```

### Frontend build fails
```bash
# Check build logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend

# Common issues:
# 1. npm install failures - check package.json
# 2. Environment variables missing - verify build args
# 3. Memory issues - increase Docker memory limit
```

### SSL certificate issues
```bash
# Check nginx config
docker-compose exec nginx nginx -t

# View certificate status
docker-compose exec nginx ls -la /etc/letsencrypt/live/

# Test renewal
docker-compose run --rm certbot renew --dry-run

# Check DNS
dig immigrate.company.com
```

### Health check failures
```bash
# Test health endpoint
curl http://localhost:8000/api/v1/health/

# Check backend connectivity
docker-compose exec backend curl localhost:8000/api/v1/health/

# Verify database connection
docker-compose exec postgres pg_isready -U leopard
```

---

## Performance Optimization

### Database Connection Pooling
Already configured in `settings.py`:
```python
DATABASES['default']['CONN_MAX_AGE'] = 600  # 10 minutes
```

### Nginx Caching
Static assets cached for 1 year:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Docker Resource Limits
Add to `docker-compose.yml`:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

---

## Security Checklist

### Pre-Deployment
- [ ] Strong SECRET_KEY generated
- [ ] DEBUG=False in production
- [ ] Database password changed from default
- [ ] .env file not in version control
- [ ] DNS records configured
- [ ] Firewall allows ports 80, 443

### Post-Deployment
- [ ] SSL certificate obtained and valid
- [ ] HTTPS redirect working
- [ ] HSTS headers present
- [ ] CORS restricted to tenant domains
- [ ] Health checks passing
- [ ] Backups configured
- [ ] Monitoring setup

---

## Backup Strategy

### Automated Daily Backups
Add to crontab on server:
```bash
# Daily database backup at 2 AM
0 2 * * * cd /path/to/leopard && docker-compose exec -T postgres pg_dump -U leopard leopard | gzip > /backups/leopard_$(date +\%Y\%m\%d).sql.gz

# Keep only last 30 days
0 3 * * * find /backups -name "leopard_*.sql.gz" -mtime +30 -delete
```

### Manual Backup
```bash
# Full backup (database + volumes)
./backup.sh

# Database only
docker-compose exec -T postgres pg_dump -U leopard leopard > backup.sql
```

---

## Migration from Systemd to Docker

### Prerequisites
1. Backup existing database
2. Install Docker and docker-compose
3. Create .env file

### Migration Steps
```bash
# 1. Backup database
pg_dump -U leopard leopard > /home/ubuntu/backup_$(date +%Y%m%d).sql

# 2. Stop systemd services
sudo systemctl stop daphne nginx
sudo systemctl disable daphne nginx

# 3. Start Docker stack
cd /home/ubuntu/leopard
docker-compose up -d

# 4. Setup SSL
./backend/deployment/certbot/init-letsencrypt.sh

# 5. Verify
docker-compose ps
curl https://your-domain.com/api/v1/health/
```

### Rollback Plan
```bash
docker-compose down
sudo systemctl start daphne nginx
psql -U leopard leopard < backup.sql
```

---

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review health checks: `curl http://localhost:8000/api/v1/health/`
- GitHub Issues: https://github.com/YOUR_ORG/leopard/issues
- Documentation: `CLAUDE.md` for project overview

---

## Next Steps

1. **Setup Monitoring**: Consider Prometheus + Grafana
2. **Log Aggregation**: Ship logs to CloudWatch or ELK
3. **CDN**: Add CloudFront for static assets
4. **Scaling**: Migrate to AWS ECS/EKS if needed
5. **Database**: Consider migrating to RDS for production
