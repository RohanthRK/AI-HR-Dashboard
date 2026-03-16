from django.apps import AppConfig

class TeamsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'teams'
    verbose_name = 'Teams Management'
    
    def ready(self):
        import teams.signals

    def __str__(self):
        return self.name 