"""
Management command to check event processing status.
"""

from django.core.management.base import BaseCommand
from immigration.events.control import get_processing_status


class Command(BaseCommand):
    help = 'Check event processing status'

    def handle(self, *args, **options):
        status = get_processing_status()
        
        self.stdout.write('\nEvent Processing Status:')
        self.stdout.write('=' * 50)
        self.stdout.write(f"Paused: {status['is_paused']}")
        
        if status['is_paused']:
            self.stdout.write(f"Paused at: {status['paused_at']}")
            self.stdout.write(f"Paused by: {status['paused_by']}")
            self.stdout.write(f"Reason: {status['pause_reason']}")
        
        if status['resumed_at']:
            self.stdout.write(f"Last resumed at: {status['resumed_at']}")
            self.stdout.write(f"Last resumed by: {status['resumed_by']}")
        
        self.stdout.write('\nEvent Queue:')
        self.stdout.write(f"  Pending: {status['pending_events']}")
        self.stdout.write(f"  Processing: {status['processing_events']}")
        self.stdout.write(f"  Failed: {status['failed_events']}")
        self.stdout.write('=' * 50)
