"""
Script to generate API views and URLs for MongoDB collections.

This script will create standardized CRUD APIs for each collection.
"""
import os
import shutil
import re
import sys

# Add parent directory to path so we can import schemas
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
from schemas import schemas

# Template for views.py
VIEWS_TEMPLATE = '''"""
Views for {collection_name} management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import {collection_name}
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for {collection_name} creation
{upper_collection}_REQUIRED_FIELDS = {required_fields}

# Define searchable fields for {collection_name}
{upper_collection}_SEARCHABLE_FIELDS = {searchable_fields}

# Create standard CRUD endpoints
{collection_name}_crud = create_crud_endpoints(
    collection={collection_name},
    required_fields={upper_collection}_REQUIRED_FIELDS,
    searchable_fields={upper_collection}_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_{collection_name}(request):
    """
    List {collection_name} records with optional filtering
    Endpoint: GET /api/{collection_name}/
    """
    return {collection_name}_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_{collection_singular}(request, {collection_singular}_id):
    """
    Get a single {collection_singular} record by ID
    Endpoint: GET /api/{collection_name}/{{{collection_singular}_id}}
    """
    return {collection_name}_crud['get_item'](request, {collection_singular}_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_{collection_singular}(request):
    """
    Create a new {collection_singular} record
    Endpoint: POST /api/{collection_name}/
    """
    return {collection_name}_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_{collection_singular}(request, {collection_singular}_id):
    """
    Update a {collection_singular} record (full update)
    Endpoint: PUT /api/{collection_name}/{{{collection_singular}_id}}
    """
    return {collection_name}_crud['update_item'](request, {collection_singular}_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_{collection_singular}(request, {collection_singular}_id):
    """
    Update a {collection_singular} record (partial update)
    Endpoint: PATCH /api/{collection_name}/{{{collection_singular}_id}}
    """
    return {collection_name}_crud['partial_update_item'](request, {collection_singular}_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_{collection_singular}(request, {collection_singular}_id):
    """
    Delete a {collection_singular} record
    Endpoint: DELETE /api/{collection_name}/{{{collection_singular}_id}}
    """
    return {collection_name}_crud['delete_item'](request, {collection_singular}_id)
'''

# Template for urls.py
URLS_TEMPLATE = '''"""
URL patterns for {collection_name} app
"""
from django.urls import path
from . import views

urlpatterns = [
    # {collection_name} CRUD
    path('', views.list_{collection_name}, name='list_{collection_name}'),  # GET
    path('new/', views.create_{collection_singular}, name='create_{collection_singular}'),  # POST
    path('<str:{collection_singular}_id>/', views.get_{collection_singular}, name='get_{collection_singular}'),  # GET
    path('<str:{collection_singular}_id>/update/', views.update_{collection_singular}, name='update_{collection_singular}'),  # PUT
    path('<str:{collection_singular}_id>/partial/', views.partial_update_{collection_singular}, name='partial_update_{collection_singular}'),  # PATCH
    path('<str:{collection_singular}_id>/delete/', views.delete_{collection_singular}, name='delete_{collection_singular}'),  # DELETE
]
'''

# Template for __init__.py
INIT_TEMPLATE = '''"""
{collection_name} app
"""
'''

# Template for apps.py
APPS_TEMPLATE = '''"""
{collection_name} app configuration
"""
from django.apps import AppConfig

class {class_name}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = '{app_name}'
'''

# Template for admin.py
ADMIN_TEMPLATE = '''"""
{collection_name} admin configuration
"""
from django.contrib import admin
'''

# Template for tests.py
TESTS_TEMPLATE = '''"""
Tests for {collection_name} app
"""
from django.test import TestCase
'''

# Define collections to create APIs for
# Map of MongoDB collection name to Django app directory
COLLECTIONS = {
    'leaves': 'leaves',
    'reviews': 'reviews',
    'payroll': 'payroll',
    'ai_insights': 'ai_analytics',
    'notifications': 'notifications',
    'reports': 'reports',
    'chat_logs': 'chat',
    'projects': 'projects',
    'tasks': 'tasks',
    'time_tracking': 'time_tracking',
    'benefits': 'benefits',
    'training': 'training',
    'performance': 'performance',
    'feedback': 'feedback',
    'job_descriptions': 'jobs',
    'employee_skills': 'skills',
    'candidates': 'recruitment'
}

# Define required and searchable fields for each collection
# Use the schema definitions for minimum required fields
API_CONFIG = {}
for collection, app in COLLECTIONS.items():
    schema = schemas.get(collection, {})
    
    # Get required fields - assume at least 2 fields are required
    # Usually id/name and at least one required foreign key
    required = []
    searchable = []
    
    for field, field_type in schema.items():
        # Skip fields that are created automatically
        if field in ['created_at', 'updated_at', '_id']:
            continue
            
        # Add name, title, id, and email as required
        if field in ['name', 'title', 'id', 'email', 'employee_id', 'user_id']:
            required.append(field)
        
        # Add fields that should be searchable
        if field in ['name', 'title', 'description', 'email', 'phone', 'status', 
                    'employee_id', 'user_id', 'department_id', 'project_id']:
            searchable.append(field)
    
    # Get at least 2 required fields
    if len(required) < 2:
        # Get first field that isn't _id, created_at, updated_at
        for field in schema:
            if field not in ['created_at', 'updated_at', '_id'] and field not in required:
                required.append(field)
                
            if len(required) >= 2:
                break
    
    # Get at least 3 searchable fields
    if len(searchable) < 3:
        # Add more fields as searchable
        for field in schema:
            if field not in ['created_at', 'updated_at', '_id'] and field not in searchable:
                searchable.append(field)
                
            if len(searchable) >= 3:
                break
    
    API_CONFIG[collection] = {
        'app': app,
        'required': required,
        'searchable': searchable
    }

def pluralize(word):
    """Simple pluralization"""
    if word.endswith('y'):
        return word[:-1] + 'ies'
    elif word.endswith('s'):
        return word
    else:
        return word + 's'

def singularize(word):
    """Simple singularization"""
    if word.endswith('ies'):
        return word[:-3] + 'y'
    elif word.endswith('s'):
        return word[:-1]
    return word

def camel_to_snake(name):
    """Convert CamelCase to snake_case"""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def generate_app_files(app_dir, collection_name, collection_singular, app_name, class_name):
    """Generate Django app files"""
    if not os.path.exists(app_dir):
        os.makedirs(app_dir)
        
    config = API_CONFIG.get(collection_name, {})
    required_fields = config.get('required', [])
    searchable_fields = config.get('searchable', [])
    
    if not required_fields:
        required_fields = ['name']
    if not searchable_fields:
        searchable_fields = ['name', 'description']
    
    # Create views.py
    with open(os.path.join(app_dir, 'views.py'), 'w') as f:
        f.write(VIEWS_TEMPLATE.format(
            collection_name=collection_name,
            collection_singular=collection_singular,
            upper_collection=collection_name.upper(),
            required_fields=required_fields,
            searchable_fields=searchable_fields
        ))
    
    # Create urls.py
    with open(os.path.join(app_dir, 'urls.py'), 'w') as f:
        f.write(URLS_TEMPLATE.format(
            collection_name=collection_name,
            collection_singular=collection_singular
        ))
    
    # Create __init__.py
    with open(os.path.join(app_dir, '__init__.py'), 'w') as f:
        f.write(INIT_TEMPLATE.format(collection_name=collection_name.title()))
    
    # Create apps.py
    with open(os.path.join(app_dir, 'apps.py'), 'w') as f:
        f.write(APPS_TEMPLATE.format(
            collection_name=collection_name.title(),
            class_name=class_name,
            app_name=app_name
        ))
    
    # Create admin.py
    with open(os.path.join(app_dir, 'admin.py'), 'w') as f:
        f.write(ADMIN_TEMPLATE.format(collection_name=collection_name.title()))
    
    # Create tests.py
    with open(os.path.join(app_dir, 'tests.py'), 'w') as f:
        f.write(TESTS_TEMPLATE.format(collection_name=collection_name.title()))

def main():
    """Generate APIs for all collections"""
    print("Generating APIs for MongoDB collections...")
    
    for collection, app in COLLECTIONS.items():
        # Skip existing apps that we've already handled manually
        if app in ['employees', 'attendance', 'auth_app']:
            continue
        
        print(f"Generating API for {collection}...")
        
        # Get proper names
        collection_name = collection  # Format: leaves, projects, etc.
        app_name = f'backend.{app}'  # Format: backend.leaves, backend.projects, etc.
        
        # Get singular form
        collection_singular = singularize(collection_name)
        
        # Get class name (ProjectsConfig, LeavesConfig, etc.)
        words = app.split('_')
        class_name = ''.join(word.title() for word in words)
        
        # Generate app directory and files
        app_dir = os.path.join('backend', app)
        generate_app_files(app_dir, collection_name, collection_singular, app_name, class_name)
        
        print(f"API generated for {collection} in {app_dir}")
    
    print("API generation complete!")

if __name__ == "__main__":
    main() 