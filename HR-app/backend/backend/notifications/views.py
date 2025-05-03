"""
Views for notifications management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import notifications
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for notifications creation
NOTIFICATIONS_REQUIRED_FIELDS = ['user_id', 'title']

# Define searchable fields for notifications
NOTIFICATIONS_SEARCHABLE_FIELDS = ['user_id', 'title', 'message']

# Create standard CRUD endpoints
notifications_crud = create_crud_endpoints(
    collection=notifications,
    required_fields=NOTIFICATIONS_REQUIRED_FIELDS,
    searchable_fields=NOTIFICATIONS_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_notifications(request):
    """
    List notifications records with optional filtering
    Endpoint: GET /api/notifications/
    """
    return notifications_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_notification(request, notification_id):
    """
    Get a single notification record by ID
    Endpoint: GET /api/notifications/{notification_id}
    """
    return notifications_crud['get_item'](request, notification_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_notification(request):
    """
    Create a new notification record
    Endpoint: POST /api/notifications/
    """
    return notifications_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_notification(request, notification_id):
    """
    Update a notification record (full update)
    Endpoint: PUT /api/notifications/{notification_id}
    """
    return notifications_crud['update_item'](request, notification_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_notification(request, notification_id):
    """
    Update a notification record (partial update)
    Endpoint: PATCH /api/notifications/{notification_id}
    """
    return notifications_crud['partial_update_item'](request, notification_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_notification(request, notification_id):
    """
    Delete a notification record
    Endpoint: DELETE /api/notifications/{notification_id}
    """
    return notifications_crud['delete_item'](request, notification_id)
