"""
Views for leaves management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import leaves
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for leaves creation
LEAVES_REQUIRED_FIELDS = ['employee_id', 'leave_type']

# Define searchable fields for leaves
LEAVES_SEARCHABLE_FIELDS = ['employee_id', 'status', 'leave_type']

# Create standard CRUD endpoints
leaves_crud = create_crud_endpoints(
    collection=leaves,
    required_fields=LEAVES_REQUIRED_FIELDS,
    searchable_fields=LEAVES_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_leaves(request):
    """
    List leaves records with optional filtering
    Endpoint: GET /api/leaves/
    """
    return leaves_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_leave(request, leave_id):
    """
    Get a single leave record by ID
    Endpoint: GET /api/leaves/{leave_id}
    """
    return leaves_crud['get_item'](request, leave_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_leave(request):
    """
    Create a new leave record
    Endpoint: POST /api/leaves/
    """
    return leaves_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_leave(request, leave_id):
    """
    Update a leave record (full update)
    Endpoint: PUT /api/leaves/{leave_id}
    """
    return leaves_crud['update_item'](request, leave_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_leave(request, leave_id):
    """
    Update a leave record (partial update)
    Endpoint: PATCH /api/leaves/{leave_id}
    """
    return leaves_crud['partial_update_item'](request, leave_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_leave(request, leave_id):
    """
    Delete a leave record
    Endpoint: DELETE /api/leaves/{leave_id}
    """
    return leaves_crud['delete_item'](request, leave_id)
