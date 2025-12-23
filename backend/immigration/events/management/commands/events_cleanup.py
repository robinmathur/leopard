"""
Management command to clean up old events.
"""

from django.core.management.base import BaseCommand
from immigration.events.cleanup import cleanup_old_events


class Command(BaseCommand):
    help = 'Clean up old completed events'

    def handle(self, *args, **options):
        count = cleanup_old_events()
        
        self.stdout.write(
            self.style.SUCCESS(f'Cleaned up {count} old events')
        )
