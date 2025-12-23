"""
Management command to create a Super Super Admin in the public schema.

Super Super Admins can create and manage tenants but exist outside of any tenant.
"""

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context


class Command(BaseCommand):
    help = 'Creates a super super admin in public schema (can create/manage tenants)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Admin email address')
        parser.add_argument('--password', type=str, required=True, help='Admin password')
        parser.add_argument('--username', type=str, default='superadmin', help='Admin username (default: superadmin)')

    def handle(self, *args, **options):
        from django.apps import apps

        username = options['username']
        email = options['email']
        password = options['password']

        # Create user in public schema using Django's default User model
        with schema_context('public'):
            # Get the auth.User model from public schema
            User = apps.get_model('auth', 'User')

            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'User "{username}" already exists in public schema')
                )
                return

            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Super Super Admin created successfully!\n'
                    f'  Username: {username}\n'
                    f'  Email: {email}\n'
                    f'  Schema: public\n'
                    f'  Can create tenants: Yes'
                )
            )
