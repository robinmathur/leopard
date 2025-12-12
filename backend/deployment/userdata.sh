#!/bin/bash
set -e

# Replace {YOUR_GIT_REOPO_URL} with your actual Git repository URL
# GIT_REPO_URL="https://github.com/robinmathur/leopard.git"

# If using Private Repo
GIT_REPO_URL="https://robinmathur:<PAT>@github.com/robinmathur/leopard.git"

# Replace {YOUR_PROJECT_MAIN_DIR_NAME} with your actual project directory name
PROJECT_MAIN_DIR_NAME="leopard"

# Clone repository
git clone "$GIT_REPO_URL" "/home/ubuntu/$PROJECT_MAIN_DIR_NAME"

cd "/home/ubuntu/$PROJECT_MAIN_DIR_NAME"

# Make all .sh files executable
chmod +x deployment/scripts/*.sh

# Execute scripts for OS dependencies, Python dependencies, Daphne, Nginx, and starting the application
./deployment/scripts/instance_os_dependencies.sh
./deployment/scripts/python_dependencies.sh
# TODO: for aws deployment add password in daphne.service file
./deployment/scripts/daphne.sh
./deployment/scripts/nginx.sh
./deployment/scripts/start_app.sh
