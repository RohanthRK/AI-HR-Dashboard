"""
Views for reports management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import reports
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for reports creation
REPORTS_REQUIRED_FIELDS = ['name']

# Define searchable fields for reports
REPORTS_SEARCHABLE_FIELDS = ['name', 'description']

# Create standard CRUD endpoints
reports_crud = create_crud_endpoints(
    collection=reports,
    required_fields=REPORTS_REQUIRED_FIELDS,
    searchable_fields=REPORTS_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_reports(request):
    """
    List reports records with optional filtering
    Endpoint: GET /api/reports/
    """
    return reports_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_report(request, report_id):
    """
    Get a single report record by ID
    Endpoint: GET /api/reports/{report_id}
    """
    return reports_crud['get_item'](request, report_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_report(request):
    """
    Create a new report record
    Endpoint: POST /api/reports/
    """
    return reports_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_report(request, report_id):
    """
    Update a report record (full update)
    Endpoint: PUT /api/reports/{report_id}
    """
    return reports_crud['update_item'](request, report_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_report(request, report_id):
    """
    Update a report record (partial update)
    Endpoint: PATCH /api/reports/{report_id}
    """
    return reports_crud['partial_update_item'](request, report_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_report(request, report_id):
    """
    Delete a report record
    Endpoint: DELETE /api/reports/{report_id}
    """
    return reports_crud['delete_item'](request, report_id)
