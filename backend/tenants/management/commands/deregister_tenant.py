"""
Management command to deregister a tenant and delete its schema.

FLATTENED Subdomain Architecture: tenant-app.company.com

Usage:
    python manage.py deregister_tenant --tenant TENANT_SUBDOMAIN [--force]

Deletes:
1. All domains associated with the tenant
2. PostgreSQL schema for the tenant (all data in the schema)
3. Tenant record from public schema

WARNING: This operation is IRREVERSIBLE. All data in the tenant's schema will be permanently deleted.

Examples:
    # Deregister with confirmation prompt
    python manage.py deregister_tenant --tenant acme
    
    # Deregister without confirmation (use with caution)
    python manage.py deregister_tenant --tenant acme --force
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django_tenants.utils import schema_context
from tenants.models import Tenant, Domain


class Command(BaseCommand):
    help = "Deregister a tenant, delete its schema, and all associated data (IRREVERSIBLE)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            required=True,
            help="Tenant subdomain (e.g., acme)"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompt (use with caution)"
        )

    def handle(self, *args, **options):
        tenant_subdomain = options["tenant"]
        force = options.get("force", False)
        schema_name = f"tenant_{tenant_subdomain}"

        # Get tenant from public schema
        with schema_context("public"):
            try:
                tenant = Tenant.objects.get(schema_name=schema_name)
            except Tenant.DoesNotExist:
                raise CommandError(
                    f'Tenant with subdomain "{tenant_subdomain}" not found.\n'
                    f'   Schema: {schema_name}'
                )

            # Get all domains for this tenant
            domains = Domain.objects.filter(tenant=tenant)
            domain_list = [d.domain for d in domains]

            # Display what will be deleted
            self.stdout.write(
                self.style.WARNING(
                    f'\n'
                    f'═══════════════════════════════════════════════\n'
                    f' ⚠️  WARNING: Tenant Deregistration\n'
                    f'═══════════════════════════════════════════════\n'
                    f'  Tenant Name: {tenant.name}\n'
                    f'  Schema: {schema_name}\n'
                    f'  Domains: {", ".join(domain_list) if domain_list else "None"}\n'
                    f'  Status: {tenant.subscription_status}\n'
                    f'\n'
                    f'  This will PERMANENTLY DELETE:\n'
                    f'  • All data in schema "{schema_name}"\n'
                    f'  • All domains associated with this tenant\n'
                    f'  • The tenant record itself\n'
                    f'\n'
                    f'  ⚠️  This operation is IRREVERSIBLE!\n'
                    f'═══════════════════════════════════════════════\n'
                )
            )

            # Confirm deregistration unless --force is used
            if not force:
                confirm = input(
                    self.style.WARNING(
                        '\nType "DELETE" to confirm tenant deregistration: '
                    )
                )
                if confirm != "DELETE":
                    self.stdout.write(
                        self.style.ERROR("Deregistration cancelled. Tenant not deleted.")
                    )
                    return

            self.stdout.write(f'\nDeregistering tenant "{tenant.name}"...')

            try:
                # Step 1: Delete all domains
                domain_count = domains.count()
                if domain_count > 0:
                    self.stdout.write(f'  Deleting {domain_count} domain(s)...')
                    domains.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Deleted {domain_count} domain(s)')
                    )

                # Step 2: Delete the PostgreSQL schema
                self.stdout.write(f'  Deleting PostgreSQL schema "{schema_name}"...')
                with connection.cursor() as cursor:
                    # Drop the schema and all its contents (CASCADE)
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Schema "{schema_name}" deleted')
                )

                # Step 3: Delete the tenant record
                tenant_name = tenant.name
                tenant.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Tenant record deleted')
                )

                # Success summary
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\n'
                        f'═══════════════════════════════════════════════\n'
                        f' ✅ Tenant Deregistered Successfully!\n'
                        f'═══════════════════════════════════════════════\n'
                        f'  Tenant: {tenant_name}\n'
                        f'  Schema: {schema_name}\n'
                        f'  Domains: {", ".join(domain_list) if domain_list else "None"}\n'
                        f'\n'
                        f'  All data has been permanently removed.\n'
                        f'═══════════════════════════════════════════════\n'
                    )
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'\n❌ Error deregistering tenant: {str(e)}\n'
                        f'   The tenant may be partially deleted. Please check the database manually.'
                    )
                )
                raise CommandError(f"Failed to deregister tenant: {e}")

