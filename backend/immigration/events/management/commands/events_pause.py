"""
Management command to pause event processing.
"""

from django.core.management.base import BaseCommand
from immigration.events.control import pause_processing
from immigration.middleware import get_current_user


class Command(BaseCommand):
    help = 'Pause event processing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reason',
            type=str,
            help='Reason for pausing event processing',
        )

    def handle(self, *args, **options):
        reason = options.get('reason', 'Manual pause via management command')
        user = get_current_user()
        
        pause_processing(user=user, reason=reason)
        
        self.stdout.write(
            self.style.SUCCESS(f'Event processing paused. Reason: {reason}')
        )
