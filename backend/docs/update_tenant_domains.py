#!/usr/bin/env python
"""
Script to update existing tenant domains to 4-level subdomain structure.

Updates: tenant.localhost → tenant.app.localhost
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from django.conf import settings
from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context

print("=" * 80)
print("UPDATING TENANT DOMAINS TO 4-LEVEL SUBDOMAIN STRUCTURE")
print("=" * 80)

app_subdomain = getattr(settings, 'APP_SUBDOMAIN', 'app')
base_domain = getattr(settings, 'BASE_DOMAIN', 'localhost')

print(f"\nConfiguration:")
print(f"  APP_SUBDOMAIN: {app_subdomain}")
print(f"  BASE_DOMAIN: {base_domain}")
print(f"  Pattern: tenant.{app_subdomain}.{base_domain}")

# Get all tenants
with schema_context('public'):
    tenants = Tenant.objects.all()
    print(f"\n✓ Found {tenants.count()} tenant(s)")

    for tenant in tenants:
        print(f"\nProcessing tenant: {tenant.name}")
        print(f"  Schema: {tenant.schema_name}")

        # Get current domains
        domains = Domain.objects.filter(tenant=tenant)

        for domain in domains:
            old_domain = domain.domain
            print(f"  Current domain: {old_domain}")

            # Extract tenant subdomain from schema_name
            # schema_name format: tenant_acme → acme
            if tenant.schema_name.startswith('tenant_'):
                tenant_subdomain = tenant.schema_name[7:]  # Remove 'tenant_' prefix
            else:
                tenant_subdomain = tenant.schema_name

            # Create new 4-level domain
            new_domain = f"{tenant_subdomain}.{app_subdomain}.{base_domain}"

            if old_domain == new_domain:
                print(f"  ✓ Already using 4-level structure: {old_domain}")
                continue

            # Update domain
            domain.domain = new_domain
            domain.save()

            print(f"  ✓ Updated: {old_domain} → {new_domain}")

print("\n" + "=" * 80)
print("UPDATE COMPLETE")
print("=" * 80)

print("\n⚠️  IMPORTANT: Update /etc/hosts for development")
print("\nAdd these lines to /etc/hosts:\n")

with schema_context('public'):
    tenants = Tenant.objects.all()
    for tenant in tenants:
        domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
        if domain and base_domain == 'localhost':
            print(f"127.0.0.1 {domain.domain}")

print("\nFor macOS/Linux:")
print("  sudo nano /etc/hosts")
print("\nFor Windows:")
print("  Edit C:\\Windows\\System32\\drivers\\etc\\hosts (as Administrator)")

print("\n" + "=" * 80)
