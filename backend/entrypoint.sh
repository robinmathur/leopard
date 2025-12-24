#!/bin/bash

# Entrypoint script for Leopard backend container
# Handles database migrations and starts Daphne ASGI server

set -e

echo "=== Leopard Backend Entrypoint ==="

# Check if virtual environment exists
if [ ! -d "/app/.venv" ]; then
    echo "ERROR: Virtual environment not found at /app/.venv"
    echo "Listing /app directory:"
    ls -la /app
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source /app/.venv/bin/activate

# Verify Python and Django are available
echo "Verifying Python installation..."
python --version
echo "Python path: $(which python)"
echo "Checking Django installation..."
python -c "import django; print(f'Django version: {django.get_version()}')" || {
    echo "ERROR: Django not found in virtual environment"
    echo "Installed packages:"
    pip list
    exit 1
}

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until pg_isready -h ${DB_HOST:-postgres} -p ${DB_PORT:-5432} -U ${DB_USER:-leopard}; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

echo "PostgreSQL is up - continuing"

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Create superuser if needed (optional, controlled by env variable)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py shell << END
from immigration.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
END
fi

# Collect static files (if not done during build)
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files already collected"

# Start Daphne ASGI server
echo "Starting Daphne ASGI server on 0.0.0.0:8000..."
exec daphne -b 0.0.0.0 -p 8000 leopard.asgi:application
