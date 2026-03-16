import traceback
import sys
import os
import django

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
    django.setup()
    from hr_backend.urls import urlpatterns
except Exception as e:
    traceback.print_exc()
