"""
Management command to create a new tenant with its own schema.

FLATTENED Subdomain Architecture: tenant-app.company.com

Creates:
1. Tenant record in public schema
2. PostgreSQL schema for the tenant
3. Domain mapping for FLATTENED subdomain routing (Cloudflare Free SSL compatible)
4. Tenant Super Admin user in the tenant schema

Why flattened? Cloudflare Free Universal SSL only supports one level of
subdomains (*.company.com), not nested subdomains (*.*.company.com).
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain

User = get_user_model()


class Command(BaseCommand):
    help = "Creates a new tenant with admin user and schema (FLATTENED subdomain: tenant-app.company.com)"

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True, help="Company/Organization name")
        parser.add_argument(
            "--subdomain", required=True, help="Tenant subdomain (e.g., acme)"
        )
        parser.add_argument("--admin-email", required=True, help="Tenant admin email")
        parser.add_argument(
            "--admin-password", required=True, help="Tenant admin password"
        )

    def handle(self, *args, **options):
        name = options["name"]
        subdomain = options["subdomain"]
        admin_email = options["admin_email"]
        admin_password = options["admin_password"]

        # Get configuration from settings
        app_subdomain = getattr(settings, "APP_SUBDOMAIN", "app")
        base_domain = getattr(settings, "BASE_DOMAIN", "localhost")

        schema_name = f"tenant_{subdomain}"

        self.stdout.write(f'Creating tenant "{name}"...')

        # Create tenant (auto-creates PostgreSQL schema)
        try:
            tenant = Tenant(
                schema_name=schema_name,
                name=name,
                is_active=True,
                subscription_status="TRIAL",
            )
            tenant.save()
            self.stdout.write(
                self.style.SUCCESS(f"✓ Tenant created with schema: {schema_name}")
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error creating tenant: {e}"))
            return

        # Create domain mapping with FLATTENED structure (Cloudflare Free SSL compatible)
        try:
            # FLATTENED subdomain: acme-immigrate.logiclucent.in
            # (instead of acme.immigrate.logiclucent.in)
            domain_name = f"{subdomain}-{app_subdomain}.{base_domain}"

            domain = Domain(domain=domain_name, tenant=tenant, is_primary=True)
            domain.save()
            self.stdout.write(self.style.SUCCESS(f"✓ Domain created: {domain_name}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error creating domain: {e}"))
            # Rollback tenant creation
            tenant.delete()
            return

        # Create tenant admin in tenant schema
        try:
            with schema_context(schema_name):
                admin = User.objects.create_superuser(
                    username=admin_email, email=admin_email, password=admin_password
                )
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Tenant admin created: {admin_email}")
                )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Error creating tenant admin: {e}"))
            # Rollback
            domain.delete()
            tenant.delete()
            return

        # Success summary
        access_url = f"https://{subdomain}-{app_subdomain}.{base_domain}"
        if base_domain == 'localhost':
            access_url = f"http://{subdomain}-{app_subdomain}.{base_domain}:8000"

        self.stdout.write(
            self.style.SUCCESS(
                f'\n'
                f'═══════════════════════════════════════════════\n'
                f' Tenant Created Successfully!\n'
                f'═══════════════════════════════════════════════\n'
                f'  Company: {name}\n'
                f'  Schema: {schema_name}\n'
                f'  Domain Pattern: {domain_name} (FLATTENED)\n'
                f'  Admin: {admin_email}\n'
                f'  Status: {tenant.subscription_status}\n'
                f'\n'
                f'  Access URL: {access_url}\n'
                f'═══════════════════════════════════════════════\n'
            )
        )

        # Remind about /etc/hosts for development
        if base_domain == 'localhost':
            self.stdout.write(
                self.style.WARNING(
                    f'\n⚠  Development Setup Required:\n'
                    f'   Add this line to /etc/hosts (macOS/Linux) or\n'
                    f'   C:\\Windows\\System32\\drivers\\etc\\hosts (Windows):\n\n'
                    f'   127.0.0.1 {subdomain}-{app_subdomain}.{base_domain}\n'
                )
            )
