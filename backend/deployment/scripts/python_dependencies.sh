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

# Change to project directory
cd "/home/ubuntu/$PROJECT_MAIN_DIR_NAME/backend"

# Install uv if not present
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install dependencies with uv
echo "Installing Python dependencies with uv..."
uv sync --no-dev

echo "Dependencies installed successfully."
