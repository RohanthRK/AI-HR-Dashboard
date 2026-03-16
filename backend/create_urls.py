"""
Script to create proper URL and view files for all apps
"""
import os

apps = ['projects', 'tasks', 'training', 'benefits', 'performance', 
        'feedback', 'jobs', 'skills', 'recruitment', 'time_tracking']

for app in apps:
    urls_file = f'{app}/urls.py'
    views_file = f'{app}/views.py'
    
    # Create URLs file
    with open(urls_file, 'wb') as f:
        f.write(b'''from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_items, name='list_items'),
]
''')
    
    # Create views file
    with open(views_file, 'wb') as f:
        content = f'''from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET"])
def list_items(request):
    return JsonResponse({{"message": "{app.capitalize()} list placeholder"}})
'''
        f.write(content.encode('utf-8'))
    
    print(f'Created {urls_file} and {views_file}') 