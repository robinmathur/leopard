# Dockerfile for Leopard Main Reverse Proxy (Nginx)
# Handles SSL termination, routing to backend and frontend containers

FROM nginx:alpine

# Copy main nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy additional configurations
COPY conf.d/ /etc/nginx/conf.d/

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/mediafiles /var/www/certbot && \
    chown -R nginx:nginx /app/staticfiles /app/mediafiles /var/www/certbot

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --spider -q http://localhost || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
