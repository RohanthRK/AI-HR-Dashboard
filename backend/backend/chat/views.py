"""
Views for chat_logs management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import chat_logs
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for chat_logs creation
CHAT_LOGS_REQUIRED_FIELDS = ['user_id', 'session_id']

# Define searchable fields for chat_logs
CHAT_LOGS_SEARCHABLE_FIELDS = ['user_id', 'session_id', 'query']

# Create standard CRUD endpoints
chat_logs_crud = create_crud_endpoints(
    collection=chat_logs,
    required_fields=CHAT_LOGS_REQUIRED_FIELDS,
    searchable_fields=CHAT_LOGS_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_chat_logs(request):
    """
    List chat_logs records with optional filtering
    Endpoint: GET /api/chat_logs/
    """
    return chat_logs_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_chat_log(request, chat_log_id):
    """
    Get a single chat_log record by ID
    Endpoint: GET /api/chat_logs/{chat_log_id}
    """
    return chat_logs_crud['get_item'](request, chat_log_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_chat_log(request):
    """
    Create a new chat_log record
    Endpoint: POST /api/chat_logs/
    """
    return chat_logs_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_chat_log(request, chat_log_id):
    """
    Update a chat_log record (full update)
    Endpoint: PUT /api/chat_logs/{chat_log_id}
    """
    return chat_logs_crud['update_item'](request, chat_log_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_chat_log(request, chat_log_id):
    """
    Update a chat_log record (partial update)
    Endpoint: PATCH /api/chat_logs/{chat_log_id}
    """
    return chat_logs_crud['partial_update_item'](request, chat_log_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_chat_log(request, chat_log_id):
    """
    Delete a chat_log record
    Endpoint: DELETE /api/chat_logs/{chat_log_id}
    """
    return chat_logs_crud['delete_item'](request, chat_log_id)
