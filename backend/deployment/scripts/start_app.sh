#!/usr/bin/env bash
set -e

PROJECT_MAIN_DIR_NAME="leopard"

# Validate variables
if [ -z "$PROJECT_MAIN_DIR_NAME" ]; then
    echo "Error: PROJECT_MAIN_DIR_NAME is not set. Please set it to your project directory name." >&2
    exit 1
fi

# Change ownership to ubuntu user
sudo chown -R ubuntu:ubuntu "/home/ubuntu/$PROJECT_MAIN_DIR_NAME"

# Change directory to the project backend directory
cd "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/backend"

# Ensure uv is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Run migrations
echo "Running migrations..."
uv run python manage.py migrate --noinput

# Run collectstatic command
echo "Running collectstatic command..."
uv run python manage.py collectstatic --noinput

# Restart Daphne and Nginx services
echo "Restarting Daphne and Nginx services..."
sudo service daphne restart
sudo service nginx restart

echo "Application started successfully."
