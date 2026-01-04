"""
Management command to assign users to branches and regions for role-based filtering
Usage:
  # Assign user to branches
  uv run python manage.py assign_user_scope --user admin@example.com --branches "Branch 1,Branch 2"

  # Assign user to regions
  uv run python manage.py assign_user_scope --user manager@example.com --regions "Region A,Region B"

  # List all user assignments
  uv run python manage.py assign_user_scope --list
"""

from django.core.management.base import BaseCommand, CommandError
from immigration.models import User, Branch, Region
from django.db import transaction


class Command(BaseCommand):
    help = 'Assign users to branches and regions for role-based access control'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='User email address'
        )
        parser.add_argument(
            '--branches',
            type=str,
            help='Comma-separated list of branch names to assign'
        )
        parser.add_argument(
            '--regions',
            type=str,
            help='Comma-separated list of region names to assign'
        )
        parser.add_argument(
            '--clear-branches',
            action='store_true',
            help='Clear all branch assignments for the user'
        )
        parser.add_argument(
            '--clear-regions',
            action='store_true',
            help='Clear all region assignments for the user'
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all user branch/region assignments'
        )

    def handle(self, *args, **options):
        # List mode
        if options['list']:
            self.list_assignments()
            return

        # Require user email for assignment operations
        user_email = options['user']
        if not user_email:
            raise CommandError('--user is required (or use --list to view assignments)')

        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{user_email}" does not exist')

        with transaction.atomic():
            # Handle branch assignments
            if options['clear_branches']:
                user.branches.clear()
                self.stdout.write(self.style.SUCCESS(f'✅ Cleared all branch assignments for {user.email}'))

            if options['branches']:
                branch_names = [name.strip() for name in options['branches'].split(',')]
                branches = []
                for name in branch_names:
                    try:
                        branch = Branch.objects.get(name=name)
                        branches.append(branch)
                    except Branch.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'⚠️  Branch "{name}" not found, skipping'))

                if branches:
                    user.branches.add(*branches)
                    self.stdout.write(self.style.SUCCESS(
                        f'✅ Assigned {len(branches)} branch(es) to {user.email}: {", ".join([b.name for b in branches])}'
                    ))

            # Handle region assignments
            if options['clear_regions']:
                user.regions.clear()
                self.stdout.write(self.style.SUCCESS(f'✅ Cleared all region assignments for {user.email}'))

            if options['regions']:
                region_names = [name.strip() for name in options['regions'].split(',')]
                regions = []
                for name in region_names:
                    try:
                        region = Region.objects.get(name=name)
                        regions.append(region)
                    except Region.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'⚠️  Region "{name}" not found, skipping'))

                if regions:
                    user.regions.add(*regions)
                    self.stdout.write(self.style.SUCCESS(
                        f'✅ Assigned {len(regions)} region(s) to {user.email}: {", ".join([r.name for r in regions])}'
                    ))

        # Show current assignments
        self.show_user_assignments(user)

    def list_assignments(self):
        """List all user branch/region assignments"""
        users = User.objects.all().prefetch_related('branches', 'regions', 'groups')

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 80))
        self.stdout.write(self.style.SUCCESS('USER BRANCH/REGION ASSIGNMENTS'))
        self.stdout.write(self.style.SUCCESS('=' * 80 + '\n'))

        for user in users:
            self.show_user_assignments(user)

    def show_user_assignments(self, user):
        """Show assignments for a single user"""
        groups = ', '.join(user.groups.values_list('name', flat=True)) or 'None'
        branches = ', '.join([b.name for b in user.branches.all()]) or 'None'
        regions = ', '.join([r.name for r in user.regions.all()]) or 'None'

        self.stdout.write(f'\n👤 {self.style.HTTP_INFO(user.email)}')
        self.stdout.write(f'   Groups: {groups}')
        self.stdout.write(f'   Branches: {branches}')
        self.stdout.write(f'   Regions: {regions}')

        # Check for potential issues
        if user.is_in_group('CONSULTANT') or user.is_in_group('BRANCH_ADMIN'):
            if not user.branches.exists():
                self.stdout.write(self.style.WARNING('   ⚠️  WARNING: CONSULTANT/BRANCH_ADMIN should have branches assigned'))

        if user.is_in_group('REGION_MANAGER'):
            if not user.regions.exists():
                self.stdout.write(self.style.WARNING('   ⚠️  WARNING: REGION_MANAGER should have regions assigned'))
