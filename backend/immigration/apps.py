from django.apps import AppConfig


class ImmigrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'immigration'

    def ready(self):
        # Temporarily disabled during refactoring
        # import immigration.signals
        pass
