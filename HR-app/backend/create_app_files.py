"""
Script to create minimal app files for all required Django apps
"""
import os

apps = ['benefits', 'performance', 'feedback', 'jobs', 'skills', 'recruitment', 'time_tracking']

for app in apps:
    # Create URLs file
    urls_content = f"""from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_{app}, name='list_{app}'),
]
"""
    with open(f'{app}/urls.py', 'w') as f:
        f.write(urls_content)
    print(f'Created {app}/urls.py')
    
    # Create views file
    views_content = f"""from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def list_{app}(request):
    return JsonResponse({{'message': '{app.capitalize()} list placeholder'}})
"""
    with open(f'{app}/views.py', 'w') as f:
        f.write(views_content)
    print(f'Created {app}/views.py') 