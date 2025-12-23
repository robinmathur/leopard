#!/bin/bash

# Initialize Let's Encrypt SSL Certificates with Certbot
# This script should be run ONCE after initial deployment
#
# Usage:
#   ./init-letsencrypt.sh [--staging] [--domain DOMAIN] [--email EMAIL]
#
# Options:
#   --staging       Use Let's Encrypt staging server (for testing)
#   --domain        Domain name (default: from .env file)
#   --email         Email for certificate notifications (default: from .env file)
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - DNS A record pointing to this server's IP
#   - .env file with CERTBOT_DOMAIN and CERTBOT_EMAIL set
#   - Ports 80 and 443 accessible from internet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STAGING=0
DOMAIN=""
EMAIL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staging)
            STAGING=1
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Load environment variables from .env if not provided
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    if [ -f "../../.env" ]; then
        source ../../.env
        DOMAIN=${DOMAIN:-$CERTBOT_DOMAIN}
        EMAIL=${EMAIL:-$CERTBOT_EMAIL}
    else
        echo -e "${RED}Error: .env file not found and domain/email not provided${NC}"
        echo "Please provide --domain and --email or create .env file"
        exit 1
    fi
fi

# Validate domain and email
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Domain and email are required${NC}"
    echo "Usage: $0 --domain example.com --email admin@example.com [--staging]"
    exit 1
fi

echo -e "${GREEN}=== Let's Encrypt SSL Certificate Setup ===${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
if [ $STAGING -eq 1 ]; then
    echo -e "${YELLOW}Mode: STAGING (test certificates)${NC}"
else
    echo -e "${GREEN}Mode: PRODUCTION (real certificates)${NC}"
fi

# Check if certificates already exist
if [ -d "../../certbot/conf/live/$DOMAIN" ]; then
    echo -e "${YELLOW}Warning: Certificates already exist for $DOMAIN${NC}"
    read -p "Do you want to renew them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# Navigate to project root
cd ../..

echo -e "${GREEN}Step 1: Starting nginx and certbot containers...${NC}"
docker-compose up -d nginx

# Wait for nginx to be ready
echo "Waiting for nginx to start..."
sleep 5

echo -e "${GREEN}Step 2: Requesting SSL certificate...${NC}"

# Build certbot command
CERTBOT_CMD="certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email"

if [ $STAGING -eq 1 ]; then
    CERTBOT_CMD="$CERTBOT_CMD --staging"
fi

# Add domains
CERTBOT_CMD="$CERTBOT_CMD -d $DOMAIN -d *.$DOMAIN"

# Request certificate
echo "Running: docker-compose run --rm certbot $CERTBOT_CMD"
docker-compose run --rm certbot $CERTBOT_CMD

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificate obtained successfully!${NC}"

    echo -e "${GREEN}Step 3: Reloading nginx to use new certificates...${NC}"
    docker-compose exec nginx nginx -s reload

    echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
    echo
    echo "Your site should now be accessible via HTTPS:"
    echo "  https://$DOMAIN"
    echo
    echo "Certificate will auto-renew every 12 hours via certbot container."
    echo
    if [ $STAGING -eq 1 ]; then
        echo -e "${YELLOW}NOTE: You used staging certificates (for testing).${NC}"
        echo "To get real certificates, run:"
        echo "  $0 --domain $DOMAIN --email $EMAIL"
    fi
else
    echo -e "${RED}✗ Certificate request failed${NC}"
    echo
    echo "Troubleshooting:"
    echo "  1. Ensure DNS A record points to this server's IP"
    echo "  2. Ensure ports 80 and 443 are accessible"
    echo "  3. Check nginx logs: docker-compose logs nginx"
    echo "  4. Try staging mode first: $0 --staging"
    exit 1
fi
