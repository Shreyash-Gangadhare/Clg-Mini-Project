from django.apps import AppConfig

class SlotsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.slots'

    def ready(self):
        import apps.slots.signals  # noqa
