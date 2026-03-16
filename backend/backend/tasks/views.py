from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from bson import ObjectId
import json

from hr_backend.db import tasks
from utils.api_utils import (
    serialize_document,
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for creation
REQUIRED_FIELDS = ['name']

# Define searchable fields
SEARCHABLE_FIELDS = ['name', 'description']

# Create standard CRUD endpoints
crud_endpoints = create_crud_endpoints(
    collection=tasks,
    required_fields=REQUIRED_FIELDS,
    searchable_fields=SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_items(request):
    """
    List all items with optional filtering
    Endpoint: GET /api/tasks/
    """
    return crud_endpoints['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_item(request, item_id):
    """
    Get a single item by ID
    Endpoint: GET /api/tasks/{item_id}
    """
    return crud_endpoints['get_item'](request, item_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_item(request):
    """
    Create a new item
    Endpoint: POST /api/tasks/
    """
    return crud_endpoints['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_item(request, item_id):
    """
    Update an item (full update)
    Endpoint: PUT /api/tasks/{item_id}
    """
    return crud_endpoints['update_item'](request, item_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_item(request, item_id):
    """
    Update an item (partial update)
    Endpoint: PATCH /api/tasks/{item_id}
    """
    return crud_endpoints['partial_update_item'](request, item_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_item(request, item_id):
    """
    Delete an item
    Endpoint: DELETE /api/tasks/{item_id}
    """
    return crud_endpoints['delete_item'](request, item_id)
