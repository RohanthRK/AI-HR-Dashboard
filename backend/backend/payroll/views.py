"""
Views for payroll management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import payroll
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for payroll creation
PAYROLL_REQUIRED_FIELDS = ['employee_id', 'year']

# Define searchable fields for payroll
PAYROLL_SEARCHABLE_FIELDS = ['employee_id', 'year', 'month']

# Create standard CRUD endpoints
payroll_crud = create_crud_endpoints(
    collection=payroll,
    required_fields=PAYROLL_REQUIRED_FIELDS,
    searchable_fields=PAYROLL_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_payroll(request):
    """
    List payroll records with optional filtering
    Endpoint: GET /api/payroll/
    """
    return payroll_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_payroll(request, payroll_id):
    """
    Get a single payroll record by ID
    Endpoint: GET /api/payroll/{payroll_id}
    """
    return payroll_crud['get_item'](request, payroll_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_payroll(request):
    """
    Create a new payroll record
    Endpoint: POST /api/payroll/
    """
    return payroll_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_payroll(request, payroll_id):
    """
    Update a payroll record (full update)
    Endpoint: PUT /api/payroll/{payroll_id}
    """
    return payroll_crud['update_item'](request, payroll_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_payroll(request, payroll_id):
    """
    Update a payroll record (partial update)
    Endpoint: PATCH /api/payroll/{payroll_id}
    """
    return payroll_crud['partial_update_item'](request, payroll_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_payroll(request, payroll_id):
    """
    Delete a payroll record
    Endpoint: DELETE /api/payroll/{payroll_id}
    """
    return payroll_crud['delete_item'](request, payroll_id)
