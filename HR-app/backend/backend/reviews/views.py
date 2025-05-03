"""
Views for reviews management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import reviews
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for reviews creation
REVIEWS_REQUIRED_FIELDS = ['employee_id', 'review_period_id']

# Define searchable fields for reviews
REVIEWS_SEARCHABLE_FIELDS = ['employee_id', 'status', 'review_period_id']

# Create standard CRUD endpoints
reviews_crud = create_crud_endpoints(
    collection=reviews,
    required_fields=REVIEWS_REQUIRED_FIELDS,
    searchable_fields=REVIEWS_SEARCHABLE_FIELDS
)

@csrf_exempt
@require_http_methods(["GET"])
def list_reviews(request):
    """
    List reviews records with optional filtering
    Endpoint: GET /api/reviews/
    """
    return reviews_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_review(request, review_id):
    """
    Get a single review record by ID
    Endpoint: GET /api/reviews/{review_id}
    """
    return reviews_crud['get_item'](request, review_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_review(request):
    """
    Create a new review record
    Endpoint: POST /api/reviews/
    """
    return reviews_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_review(request, review_id):
    """
    Update a review record (full update)
    Endpoint: PUT /api/reviews/{review_id}
    """
    return reviews_crud['update_item'](request, review_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_review(request, review_id):
    """
    Update a review record (partial update)
    Endpoint: PATCH /api/reviews/{review_id}
    """
    return reviews_crud['partial_update_item'](request, review_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_review(request, review_id):
    """
    Delete a review record
    Endpoint: DELETE /api/reviews/{review_id}
    """
    return reviews_crud['delete_item'](request, review_id)
