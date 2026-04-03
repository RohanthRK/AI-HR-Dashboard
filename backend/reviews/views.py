"""
Views for review management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from functools import wraps

from hr_backend.db import reviews, employees, team_reviews
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Standard CRUD for reviews (internal use)
review_crud = create_crud_endpoints(
    collection=reviews,
    required_fields=['employee_id', 'reviewer_id', 'review_date'],
    search_fields=['employee_id', 'reviewer_id', 'status']
)

def require_auth(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': 'Unauthorized', 'message': 'Authentication required'}, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view

@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def list_reviews(request):
    """
    List reviews with filtering
    Endpoint: GET /api/reviews/
    """
    # Filtering params
    reviewer_id = request.GET.get('reviewer_id')
    employee_id = request.GET.get('employee_id')
    status = request.GET.get('status')
    
    query = {}
    if reviewer_id:
        query['reviewer_id'] = reviewer_id
    if employee_id:
        query['employee_id'] = employee_id
    if status:
        query['status'] = status
        
    try:
        results = list(reviews.find(query).sort('review_date', -1))
        serialized = [serialize_document(doc) for doc in results]
        return JsonResponse({'results': serialized, 'count': len(serialized)})
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_my_performance_reviews(request):
    """
    Get reviews about the logged-in user
    Endpoint: GET /api/reviews/me/
    """
    employee_id = getattr(request, 'employee_id', None)
    if not employee_id:
        return JsonResponse({'results': [], 'count': 0})
        
    try:
        results = list(reviews.find({'employee_id': employee_id}).sort('review_date', -1))
        serialized = [serialize_document(doc) for doc in results]
        return JsonResponse({'results': serialized, 'count': len(serialized)})
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_my_assigned_reviews(request):
    """
    Get reviews conducted by the logged-in user
    Endpoint: GET /api/reviews/assigned/me/
    """
    employee_id = getattr(request, 'employee_id', None)
    
    # Fallback: if employee_id is not in token, try to find it in Employees collection by user_id
    if not employee_id and hasattr(request, 'user_id'):
        emp_doc = employees.find_one({'user_id': request.user_id})
        if emp_doc:
            employee_id = emp_doc.get('employee_id') or str(emp_doc['_id'])
            
    if not employee_id:
        return JsonResponse({'results': [], 'count': 0})
        
    try:
        # 1. Fetch individual reviews where I am the reviewer
        # Standardized schema uses 'submission_date' instead of 'review_date'
        individual_results = list(reviews.find({'reviewer_id': employee_id}).sort('submission_date', -1))
        serialized_individual = []
        for doc in individual_results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Individual'
            # Extract score from nested scores if present
            if 'scores' in s_doc and isinstance(s_doc['scores'], dict):
                s_doc['performance'] = s_doc['scores'].get('performance')
            # Map date fields
            s_doc['review_date'] = s_doc.get('submission_date') or s_doc.get('review_date')
            serialized_individual.append(s_doc)
            
        # 2. Fetch team reviews where I am the reviewer
        # Team reviews use 'created_at' instead of 'review_date'
        team_results = list(team_reviews.find({'reviewer_id': employee_id}).sort('created_at', -1))
        serialized_team = []
        for doc in team_results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Team'
            # Map team fields to a common format for the list
            s_doc['employee_id'] = s_doc.get('team_id')
            s_doc['employee_name'] = s_doc.get('team_name')
            s_doc['review_date'] = s_doc.get('created_at') or s_doc.get('review_date')
            serialized_team.append(s_doc)
            
        merged_results = serialized_individual + serialized_team
        # Sort by date
        merged_results.sort(key=lambda x: x.get('review_date', ''), reverse=True)
        
        return JsonResponse({'results': merged_results, 'count': len(merged_results)})
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["PUT"])
@require_auth
def submit_review(request, review_id):
    """
    Submit or update an existing review
    Endpoint: PUT /api/reviews/{review_id}/submit
    """
    try:
        data = json.loads(request.body)
        
        reviewer_id = getattr(request, 'employee_id', None)
        # Fallback: if reviewer_id is not in token, try to find it in Employees collection by user_id
        if not reviewer_id and hasattr(request, 'user_id'):
            emp_doc = employees.find_one({'user_id': request.user_id})
            if emp_doc:
                reviewer_id = emp_doc.get('employee_id') or str(emp_doc['_id'])
        
        # Support both flat and nested scores
        scores = data.get('scores', {})
        
        # Performance metrics
        metrics = {
            'performance': data.get('performance') if data.get('performance') is not None else scores.get('performance'),
            'communication': data.get('communication') if data.get('communication') is not None else scores.get('communication'),
            'teamwork': data.get('teamwork') if data.get('teamwork') is not None else scores.get('teamwork'),
            'initiative': data.get('initiative') if data.get('initiative') is not None else scores.get('initiative'),
            'adaptability': data.get('adaptability') if data.get('adaptability') is not None else scores.get('adaptability')
        }
        
        # Calculate average score (filter out None values)
        valid_scores = [v for v in metrics.values() if v is not None]
        avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

        update_data = {
            'employee_id': review_id,
            'reviewer_id': reviewer_id,
            'reviewer_name': getattr(request, 'user_info', {}).get('username', 'System'),
            'scores': metrics,
            'average_score': float(avg_score),
            'comments': data.get('feedback', ''),
            'strengths': [s.strip() for s in data.get('strengths', '').split(',') if s.strip()] if data.get('strengths') else [],
            'areas_for_improvement': [a.strip() for a in data.get('areas_for_improvement', '').split(',') if a.strip()] if data.get('areas_for_improvement') else [],
            'status': 'Completed',
            'submission_date': datetime.datetime.now().isoformat(),
            'last_updated': datetime.datetime.now().isoformat()
        }
        
        # Simplified query for upsert - MongoDB cannot upsert with $ne operators
        query = {
            'employee_id': review_id
        }
            
        result = reviews.update_one(query, {'$set': update_data}, upsert=True)
        
        return JsonResponse({'message': 'Review submitted successfully', 'id': review_id})
    except Exception as e:
        import traceback
        error_msg = f"Error in submit_review: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_review_by_id(request, review_id):
    """
    Get review details by ID
    Endpoint: GET /api/reviews/{review_id}/
    """
    try:
        if len(review_id) == 24:
            doc = reviews.find_one({'_id': ObjectId(review_id)})
        else:
            doc = reviews.find_one({'employee_id': review_id})
            
        if not doc:
            return JsonResponse({'error': 'Not found', 'message': 'Review not found'}, status=404)
            
        return JsonResponse(serialize_document(doc))
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)
