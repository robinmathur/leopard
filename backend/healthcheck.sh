#!/bin/bash

# Health check script for backend container
# Checks if the Django application is responding

curl -f http://localhost:8000/api/v1/health/ || exit 1
