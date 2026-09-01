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

def resolve_reviewer_name(rev_id, current_name=None):
    """
    Standardized helper to resolve a reviewer's full name from their ID, username, or email.
    """
    # If rev_id is missing, try using current_name as the ID if it looks technical
    if not rev_id:
        if current_name and ('.' in current_name or '_' in current_name or '@' in current_name):
            rev_id = current_name
        else:
            return current_name or 'Manager'
    
    # If the current name already looks like a real full name (has space, no dots/technical chars), keep it.
    if current_name and ' ' in current_name and '.' not in current_name:
        if current_name not in ['Manager', 'HR Manager', 'Super Admin']:
            return current_name

    # Step 1: Broad search in Employees collection
    e_query = {'$or': [
        {'employee_id': rev_id}, 
        {'_id': rev_id}
    ]}
    try: 
        if isinstance(rev_id, str) and len(rev_id) == 24:
            e_query['$or'].append({'_id': ObjectId(rev_id)})
        e_query['$or'].append({'user_id': str(rev_id)})
    except: pass
    
    # If rev_id looks like a username or email, search those fields too
    if isinstance(rev_id, str):
        e_query['$or'].append({'email': rev_id.lower()})
        e_query['$or'].append({'first_name': rev_id.split('.')[0].capitalize()}) # Heuristic for user.name
    
    rev_emp = employees.find_one(e_query)
    if rev_emp:
        full_name = f"{rev_emp.get('first_name', '')} {rev_emp.get('last_name', '')}".strip()
        if full_name: return full_name
    
    # Step 2: Search Users collection (Resolve account details)
    try:
        u_query = {'$or': []}
        if isinstance(rev_id, str):
            u_query['$or'].append({'username': rev_id})
            u_query['$or'].append({'email': rev_id})
        try: 
            if isinstance(rev_id, str) and len(rev_id) == 24:
                u_query['$or'].append({'_id': ObjectId(rev_id)})
        except: pass
        
        if u_query['$or']:
            from hr_backend.db import users
            rev_user = users.find_one(u_query)
            if rev_user:
                # Link back to employee if possible for real name
                alt_emp = employees.find_one({'user_id': str(rev_user['_id'])})
                if alt_emp:
                    full_name = f"{alt_emp.get('first_name', '')} {alt_emp.get('last_name', '')}".strip()
                    if full_name: return full_name
                return rev_user.get('username') or rev_user.get('email', current_name or 'Manager')
    except: pass
        
    return current_name or 'Manager'

@csrf_exempt
@require_http_methods(["GET"])
@require_auth
def get_my_performance_reviews(request):
    """
    Get reviews about the logged-in user
    Endpoint: GET /api/reviews/me/
    """
    user_id = getattr(request, 'user_id', None)
    emp_code = getattr(request, 'employee_id', None)
    
    # Initialize search pools
    possible_ids = []
    team_ids = []
    
    # Step 1: Add IDs from the token itself
    if emp_code:
        possible_ids.append(emp_code)
    if user_id:
        possible_ids.append(user_id)
        try:
            possible_ids.append(ObjectId(user_id))
        except:
            pass
            
    # Step 2: Resolve identity through the Employees collection
    # We search by both user_id (the account link) and employee_id ( the staff code)
    emp_search_queries = []
    if user_id:
        emp_search_queries.append({'user_id': user_id})
        try:
            emp_search_queries.append({'user_id': ObjectId(user_id)})
        except:
            pass
    if emp_code:
        emp_search_queries.append({'employee_id': emp_code})
        
    if emp_search_queries:
        found_employees = list(employees.find({'$or': emp_search_queries}))
        for emp_doc in found_employees:
            # For each matching employee document, add all its identifiers
            possible_ids.append(str(emp_doc['_id']))
            possible_ids.append(emp_doc['_id'])
            if emp_doc.get('employee_id'):
                possible_ids.append(emp_doc.get('employee_id'))
            if emp_doc.get('user_id'):
                possible_ids.append(str(emp_doc.get('user_id')))
                try:
                    possible_ids.append(ObjectId(emp_doc.get('user_id')))
                except:
                    pass
            
            # Identify Teams/Departments for Team Reviews lookup
            if emp_doc.get('team_id'):
                team_ids.append(emp_doc.get('team_id'))
            if emp_doc.get('team'):
                team_ids.append(emp_doc.get('team'))
            if emp_doc.get('department'):
                team_ids.append(emp_doc.get('department'))
    
    # Add unique IDs but PRESERVE TYPES (important for MongoDB $in queries)
    # MongoDB treats "65a..." (string) and ObjectId("65a...") as different values.
    # Our de-duplication must keep both if they are different types.
    unique_ids = []
    seen_type_id = set()
    for pid in possible_ids:
        type_id = f"{type(pid)}:{str(pid)}"
        if type_id not in seen_type_id:
            unique_ids.append(pid)
            seen_type_id.add(type_id)
            
    if not unique_ids:
        return JsonResponse({'results': [], 'count': 0})
        
    try:
        # 1. Search for Individual reviews
        results = list(reviews.find({'employee_id': {'$in': unique_ids}}).sort('review_date', -1))
        
        # 2. Search for Team reviews matching user's team/department
        team_results = []
        if team_ids:
            unique_team_ids = list(set(team_ids))
            team_results = list(team_reviews.find({
                '$or': [
                    {'team_id': {'$in': unique_team_ids}},
                    {'team_name': {'$in': unique_team_ids}}
                ]
            }).sort('created_at', -1))
        
        serialized = []
        # Process Individual Results
        for doc in results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Individual'
            s_doc['subject_name'] = 'Me'
            
            # Standardization: Ensure reviewer name is resolved
            s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
            
            serialized.append(s_doc)

        # Process Team Results
        for doc in team_results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Team'
            s_doc['subject_name'] = s_doc.get('team_name') or 'My Team'
            s_doc['review_date'] = s_doc.get('created_at') or s_doc.get('review_date')
            
            # Standardization: Ensure reviewer name is resolved
            s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
            
            serialized.append(s_doc)
            
        # Sort combined results by date
        serialized.sort(key=lambda x: x.get('review_date', ''), reverse=True)
            
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
    user_id = getattr(request, 'user_id', None)
    emp_code = getattr(request, 'employee_id', None)
    
    # Initialize search pool
    possible_reviewer_ids = []
    
    # Step 1: Add Reviewer IDs from the token
    if emp_code:
        possible_reviewer_ids.append(emp_code)
    if user_id:
        possible_reviewer_ids.append(user_id)
        try:
            possible_reviewer_ids.append(ObjectId(user_id))
        except:
            pass
            
    # Step 2: Resolve identity through the Employees collection
    emp_search_queries = []
    if user_id:
        emp_search_queries.append({'user_id': user_id})
        try:
            emp_search_queries.append({'user_id': ObjectId(user_id)})
        except:
            pass
    if emp_code:
        emp_search_queries.append({'employee_id': emp_code})
        
    if emp_search_queries:
        found_employees = list(employees.find({'$or': emp_search_queries}))
        for emp_doc in found_employees:
            possible_reviewer_ids.append(str(emp_doc['_id']))
            possible_reviewer_ids.append(emp_doc['_id'])
            if emp_doc.get('employee_id'):
                possible_reviewer_ids.append(emp_doc.get('employee_id'))
                
    # Unique IDs only but PRESERVE TYPES (string vs ObjectId)
    unique_reviewer_ids = []
    seen_rev_type_id = set()
    for rid in possible_reviewer_ids:
        type_id = f"{type(rid)}:{str(rid)}"
        if type_id not in seen_rev_type_id:
            unique_reviewer_ids.append(rid)
            seen_rev_type_id.add(type_id)
            
    if not unique_reviewer_ids:
        return JsonResponse({'results': [], 'count': 0})
        
    try:
        # 1. Fetch individual reviews where I am one of the possible reviewers
        individual_results = list(reviews.find({'reviewer_id': {'$in': unique_reviewer_ids}}).sort('submission_date', -1))
        serialized_individual = []
        for doc in individual_results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Individual'
            # Standardize names
            s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
            # Map employee name for visibility
            if 'employee_id' in s_doc:
                emp_doc = employees.find_one({'$or': [{'employee_id': s_doc['employee_id']}, {'_id': s_doc['employee_id']}]})
                if emp_doc:
                    s_doc['employee_name'] = f"{emp_doc.get('first_name', '')} {emp_doc.get('last_name', '')}".strip() or s_doc.get('employee_id')
            
            # Extract score from nested scores if present
            if 'scores' in s_doc and isinstance(s_doc['scores'], dict):
                s_doc['performance'] = s_doc['scores'].get('performance')
            # Map date fields
            s_doc['review_date'] = s_doc.get('submission_date') or s_doc.get('review_date')
            serialized_individual.append(s_doc)
            
        # 2. Fetch team reviews where I am the reviewer
        team_results = list(team_reviews.find({'reviewer_id': {'$in': unique_reviewer_ids}}).sort('created_at', -1))
        serialized_team = []
        for doc in team_results:
            s_doc = serialize_document(doc)
            s_doc['type'] = 'Team'
            # Standardize names
            s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
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
        reviewer_name = 'Manager'
        
        # Resolve reviewer details
        user_query = {'$or': [{'user_id': request.user_id}]}
        try:
            user_query['$or'].append({'user_id': ObjectId(request.user_id)})
        except:
            pass
            
        emp_doc = employees.find_one(user_query)
        if emp_doc:
            reviewer_id = emp_doc.get('employee_id') or str(emp_doc['_id'])
            reviewer_name = f"{emp_doc.get('first_name', '')} {emp_doc.get('last_name', '')}".strip() or reviewer_name
        else:
            # Fallback to User collection if Employee record doesn't exist (e.g. for Super Admin)
            user_doc = users.find_one({'_id': ObjectId(request.user_id)})
            if user_doc:
                reviewer_name = user_doc.get('username') or user_doc.get('email', 'Manager')
        
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
        
        # Calculate average score
        valid_scores = [v for v in metrics.values() if v is not None]
        avg_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0

        now = datetime.datetime.now().isoformat()
        update_data = {
            'employee_id': review_id,
            'reviewer_id': reviewer_id,
            'reviewer_name': reviewer_name,
            'scores': metrics,
            'average_score': float(avg_score),
            'comments': data.get('feedback', '') or data.get('comments', ''),
            'feedback': data.get('feedback', '') or data.get('comments', ''),
            'strengths': data.get('strengths', ''),
            'areas_for_improvement': data.get('areas_for_improvement', ''),
            'status': 'Completed',
            'submission_date': now,
            'review_date': data.get('review_date') or now,
            'last_updated': now,
            'type': 'Individual'
        }
        
        # Query for upsert - include reviewer_id so different managers can review the same person
        query = {
            'employee_id': review_id,
            'reviewer_id': reviewer_id
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
    Get review details by ID (Searches both Individual and Team reviews)
    Endpoint: GET /api/reviews/{review_id}/
    """
    try:
        doc = None
        # Step 1: Try Individual reviews collection
        if len(review_id) == 24:
            doc = reviews.find_one({'_id': ObjectId(review_id)})
        else:
            doc = reviews.find_one({'employee_id': review_id})
            
        # Step 2: Try Team reviews collection if not found in individual
        if not doc:
            if len(review_id) == 24:
                doc = team_reviews.find_one({'_id': ObjectId(review_id)})
            else:
                doc = team_reviews.find_one({'team_id': review_id})
            
            if doc:
                s_doc = serialize_document(doc)
                s_doc['type'] = 'Team'
                # Standardize fields for the view
                s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
                s_doc['subject_name'] = s_doc.get('team_name') or 'Team'
                return JsonResponse(s_doc)
            
        if not doc:
            return JsonResponse({'error': 'Not found', 'message': 'Review not found'}, status=404)
            
        s_doc = serialize_document(doc)
        s_doc['type'] = 'Individual'
        s_doc['reviewer_name'] = resolve_reviewer_name(s_doc.get('reviewer_id'), s_doc.get('reviewer_name'))
        return JsonResponse(s_doc)
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)
