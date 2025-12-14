"""
Management command to process due reminders and create notifications.

This command should be run periodically (e.g., via cron) to check for due reminders
and create notifications for them.

Usage:
    python manage.py process_reminders
    
    # With verbosity
    python manage.py process_reminders --verbosity 2
    
Cron example (run every 15 minutes):
    */15 * * * * cd /path/to/project && python manage.py process_reminders >> /var/log/reminders.log 2>&1
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from immigration.services.reminders import process_due_reminders


class Command(BaseCommand):
    help = 'Process due reminders and create notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without actually creating notifications',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        verbosity = options.get('verbosity', 1)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No notifications will be created'))

        if verbosity >= 1:
            self.stdout.write(f'Processing reminders at {timezone.now()}')

        if not dry_run:
            results = process_due_reminders()
            
            if verbosity >= 1:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Processed {results["processed"]} reminders, '
                        f'{results["failed"]} failed out of {results["total_due"]} due'
                    )
                )
            
            if verbosity >= 2:
                self.stdout.write(f'Timestamp: {results["timestamp"]}')
        else:
            # Dry run - just show what would be processed
            from immigration.services.reminders import get_due_reminders
            due_reminders = get_due_reminders()
            
            if verbosity >= 1:
                self.stdout.write(f'Found {len(due_reminders)} due reminders')
            
            if verbosity >= 2:
                for reminder in due_reminders:
                    self.stdout.write(
                        f'  - {reminder.id}: {reminder.title} '
                        f'(Due: {reminder.reminder_date} {reminder.reminder_time or ""})'
                    )

        if verbosity >= 1:
            self.stdout.write(self.style.SUCCESS('Done'))
