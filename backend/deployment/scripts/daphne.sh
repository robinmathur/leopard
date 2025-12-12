#!/usr/bin/bash

# Replace {YOUR_PROJECT_MAIN_DIR_NAME} with your actual project directory name
PROJECT_MAIN_DIR_NAME="leopard"

# Copy daphne socket and service files
#sudo cp "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/deployment/daphne/daphne.socket" "/etc/systemd/system/daphne.socket"
sudo cp "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/deployment/daphne/daphne.service" "/etc/systemd/system/daphne.service"

# Start and enable Daphne service
sudo systemctl start daphne.service
sudo systemctl enable daphne.service
