import traceback
import os
import django

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
    django.setup()
    from hr_backend.urls import urlpatterns
    print("SUCCESS")
except Exception as e:
    with open('error_utf8.log', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
    print("ERROR WRITTEN")
