#!/bin/bash
set -e

PROJECT_MAIN_DIR_NAME="leopard"

cd "/home/ubuntu/$PROJECT_MAIN_DIR_NAME"

# pull repository, its a temporary solution
git pull

# Change ownership to ubuntu user
sudo chown -R ubuntu:ubuntu "/home/ubuntu/$PROJECT_MAIN_DIR_NAME"

# Activate virtual environment
echo "Activating virtual environment..."
source "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/venv/bin/activate"

# Install dependencies
echo "Installing Python dependencies..."
pip install -r "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/requirements.txt"

#Run new migration
python manage.py migrate

./deployment/scripts/start_app.sh