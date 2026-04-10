import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# MongoDB connection
client = MongoClient(settings.MONGODB_URI)
db = client[settings.MONGODB_NAME]
collection = db.objectives

@csrf_exempt
def get_objectives(request):
    """
    GET: List objectives (Filtered by user unless Admin)
    """
    # Extract user info from request (attached by JWTAuthMiddleware)
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    if request.method == 'GET':
        requested_id = request.GET.get('employee_id')
        query = {}

        if user_role != 'admin':
            # Privacy and Scope Filter
            scope = request.GET.get('scope', 'individual')
            
            if scope == 'individual':
                query['employee_id'] = employee_id or user_id
            elif scope == 'team':
                team_id = request.GET.get('team_id')
                if team_id:
                    query['team_id'] = team_id
                    query['scope'] = 'team'
                else:
                    return JsonResponse({'status': 'success', 'data': []})
            elif scope == 'department':
                dept_id = request.GET.get('department_id')
                if dept_id:
                    query['department_id'] = dept_id
                    query['scope'] = 'department'
                else:
                    return JsonResponse({'status': 'success', 'data': []})
        else:
            # Admins can filter by anything
            for param in ['employee_id', 'team_id', 'department_id', 'scope']:
                val = request.GET.get(param)
                if val: query[param] = val

        objectives = list(collection.find(query))
        
        # Convert ObjectId to string
        for obj in objectives:
            obj['_id'] = str(obj['_id'])
            
        return JsonResponse({'status': 'success', 'data': objectives})
    
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def create_objective(request):
    """
    POST: Create a new objective
    """
    # Extract user info
    user_id = getattr(request, 'user_id', None)
    employee_id_auth = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Security: Non-admins can only create for themselves
            target_employee_id = data.get('employee_id')
            if user_role != 'admin':
                if not employee_id_auth:
                    return JsonResponse({'status': 'error', 'message': 'Account not linked to an employee profile'}, status=403)
                target_employee_id = employee_id_auth

            # Validate required fields
            if not data.get('title') or not target_employee_id:
                return JsonResponse({
                    'status': 'error', 
                    'message': 'Title and Employee ID are required'
                }, status=400)
                
            # Security for Scoped OKRs
            scope = data.get('scope', 'individual')
            if scope in ['team', 'department'] and user_role not in ['admin', 'manager', 'hr']:
                return JsonResponse({'status': 'error', 'message': f'Unauthorized to create {scope} OKRs'}, status=403)

            new_objective = {
                'title': data.get('title'),
                'description': data.get('description', ''),
                'employee_id': target_employee_id,
                'team_id': data.get('team_id', ''),
                'department_id': data.get('department_id', ''),
                'scope': scope,
                'target_date': data.get('target_date', ''),
                'progress': 0,
                'status': data.get('status', 'On Track'),
                'key_results': data.get('key_results', []),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = collection.insert_one(new_objective)
            new_objective['_id'] = str(result.inserted_id)
            
            return JsonResponse({'status': 'success', 'data': new_objective}, status=201)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def objective_detail(request, objective_id):
    try:
        obj_id = ObjectId(objective_id)
    except:
        return JsonResponse({'status': 'error', 'message': 'Invalid ID format'}, status=400)
        
    if request.method == 'GET':
        objective = collection.find_one({'_id': obj_id})
        if not objective:
            return JsonResponse({'status': 'error', 'message': 'Objective not found'}, status=404)
            
        objective['_id'] = str(objective['_id'])
        return JsonResponse({'status': 'success', 'data': objective})
        
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            data['updated_at'] = datetime.utcnow().isoformat()
            
            # Remove _id if it's in the payload
            if '_id' in data:
                del data['_id']
                
            result = collection.update_one(
                {'_id': obj_id},
                {'$set': data}
            )
            
            if result.matched_count == 0:
                return JsonResponse({'status': 'error', 'message': 'Objective not found'}, status=404)
                
            updated_objective = collection.find_one({'_id': obj_id})
            updated_objective['_id'] = str(updated_objective['_id'])
            return JsonResponse({'status': 'success', 'data': updated_objective})
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            
    elif request.method == 'DELETE':
        result = collection.delete_one({'_id': obj_id})
        if result.deleted_count == 0:
            return JsonResponse({'status': 'error', 'message': 'Objective not found'}, status=404)
            
        return JsonResponse({'status': 'success', 'message': 'Objective deleted successfully'})
        
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def update_progress(request, objective_id):
    if request.method == 'PATCH':
        try:
            obj_id = ObjectId(objective_id)
            data = json.loads(request.body)
            
            new_progress = data.get('progress')
            new_status = data.get('status')
            key_results = data.get('key_results')
            
            update_fields = {'updated_at': datetime.utcnow().isoformat()}
            if new_progress is not None:
                update_fields['progress'] = new_progress
            if new_status is not None:
                update_fields['status'] = new_status
            if key_results is not None:
                update_fields['key_results'] = key_results
                
            result = collection.update_one(
                {'_id': obj_id},
                {'$set': update_fields}
            )
            
            if result.matched_count == 0:
                return JsonResponse({'status': 'error', 'message': 'Objective not found'}, status=404)
                
            updated_objective = collection.find_one({'_id': obj_id})
            updated_objective['_id'] = str(updated_objective['_id'])
            
            return JsonResponse({'status': 'success', 'data': updated_objective})
            
        except Exception as e:
             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
             
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
