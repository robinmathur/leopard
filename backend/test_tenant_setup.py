#!/usr/bin/env python
"""Test script to verify multi-tenant setup."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'leopard.settings')
django.setup()

from tenants.models import Tenant, Domain
from django_tenants.utils import schema_context
from immigration.models import User

print("=" * 60)
print("MULTI-TENANT SETUP VERIFICATION")
print("=" * 60)

# Check tenants
tenants = Tenant.objects.all()
print(f"\n✓ Total tenants: {tenants.count()}")

for tenant in tenants:
    print(f"\nTenant: {tenant.name}")
    print(f"  Schema: {tenant.schema_name}")
    print(f"  Status: {tenant.subscription_status}")
    print(f"  Active: {tenant.is_active}")

    # Get domains
    domains = Domain.objects.filter(tenant=tenant)
    print(f"  Domains:")
    for domain in domains:
        print(f"    - {domain.domain} (primary: {domain.is_primary})")

    # Check users in tenant schema
    try:
        with schema_context(tenant.schema_name):
            user_count = User.objects.count()
            print(f"  Users: {user_count}")

            if user_count > 0:
                users = User.objects.all()[:5]
                for user in users:
                    print(f"    - {user.username} ({user.email})")
    except Exception as e:
        print(f"  Error accessing schema: {e}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
