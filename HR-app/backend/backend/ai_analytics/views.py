"""
Views for ai_insights management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import ai_insights
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for ai_insights creation
AI_INSIGHTS_REQUIRED_FIELDS = ['title', 'description']

# Define searchable fields for ai_insights
AI_INSIGHTS_SEARCHABLE_FIELDS = ['title', 'description', 'module']

# Create standard CRUD endpoints
ai_insights_crud = create_crud_endpoints(
    collection=ai_insights,
    required_fields=AI_INSIGHTS_REQUIRED_FIELDS,
    searchable_fields=AI_INSIGHTS_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_ai_insights(request):
    """
    List ai_insights records with optional filtering
    Endpoint: GET /api/ai_insights/
    """
    return ai_insights_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_ai_insight(request, ai_insight_id):
    """
    Get a single ai_insight record by ID
    Endpoint: GET /api/ai_insights/{ai_insight_id}
    """
    return ai_insights_crud['get_item'](request, ai_insight_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_ai_insight(request):
    """
    Create a new ai_insight record
    Endpoint: POST /api/ai_insights/
    """
    return ai_insights_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_ai_insight(request, ai_insight_id):
    """
    Update a ai_insight record (full update)
    Endpoint: PUT /api/ai_insights/{ai_insight_id}
    """
    return ai_insights_crud['update_item'](request, ai_insight_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_ai_insight(request, ai_insight_id):
    """
    Update a ai_insight record (partial update)
    Endpoint: PATCH /api/ai_insights/{ai_insight_id}
    """
    return ai_insights_crud['partial_update_item'](request, ai_insight_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_ai_insight(request, ai_insight_id):
    """
    Delete a ai_insight record
    Endpoint: DELETE /api/ai_insights/{ai_insight_id}
    """
    return ai_insights_crud['delete_item'](request, ai_insight_id)
