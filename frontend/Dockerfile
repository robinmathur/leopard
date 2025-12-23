# Multi-stage Dockerfile for Leopard Frontend (React + Vite)
# Production optimized with nginx serving static files

# Stage 1: Builder - Build React application
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_APP_SUBDOMAIN=immigrate
ARG VITE_BASE_DOMAIN=localhost
ARG VITE_ENVIRONMENT=production
ARG VITE_API_BASE_URL

# Set environment variables for build
ENV VITE_APP_SUBDOMAIN=${VITE_APP_SUBDOMAIN}
ENV VITE_BASE_DOMAIN=${VITE_BASE_DOMAIN}
ENV VITE_ENVIRONMENT=${VITE_ENVIRONMENT}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the application
RUN npm run build

# Stage 2: Runtime - Nginx to serve static files
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --spider -q http://localhost || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
