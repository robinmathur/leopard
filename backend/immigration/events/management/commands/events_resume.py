"""
Management command to resume event processing.
"""

from django.core.management.base import BaseCommand
from immigration.events.control import resume_processing
from immigration.middleware import get_current_user


class Command(BaseCommand):
    help = 'Resume event processing'

    def handle(self, *args, **options):
        user = get_current_user()
        
        resume_processing(user=user)
        
        self.stdout.write(
            self.style.SUCCESS('Event processing resumed')
        )
