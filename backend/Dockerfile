# Multi-stage Dockerfile for Leopard Backend (Django + Daphne)
# Production optimized with uv package manager

# Stage 1: Builder - Install dependencies
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager to user location
RUN pip install --user --no-cache-dir uv

# Add uv to PATH for builder stage
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv (no dev dependencies)
RUN uv sync --no-dev

# Stage 2: Runtime - Minimal production image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/root/.local/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r django && useradd -r -g django django

# Set working directory
WORKDIR /app

# Copy uv from builder
COPY --from=builder /root/.local /root/.local

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy uv.lock and pyproject.toml
COPY pyproject.toml uv.lock ./

# Copy application code
COPY . .

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Collect static files during build using venv
RUN /app/.venv/bin/python manage.py collectstatic --noinput || echo "collectstatic skipped"

# Change ownership to django user
RUN chown -R django:django /app

# Copy entrypoint and health check scripts
COPY entrypoint.sh healthcheck.sh /app/
RUN chmod +x /app/entrypoint.sh /app/healthcheck.sh

# Switch to non-root user
USER django

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD bash /app/healthcheck.sh

# Run entrypoint script
CMD ["bash", "/app/entrypoint.sh"]
