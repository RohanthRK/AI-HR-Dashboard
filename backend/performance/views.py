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
collection = db.pips

@csrf_exempt
def get_pips(request):
    """
    GET: List Performance Improvement Plans
    """
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    if request.method == 'GET':
        query = {}
        
        # Privacy filter
        if user_role not in ['admin', 'hr', 'manager']:
            # Regular employees only see PIPs assigned to them
            if employee_id:
                query['employee_id'] = employee_id
            else:
                return JsonResponse({'status': 'success', 'data': []})
        else:
            # Managers/Admin can filter by employee_id if provided
            requested_id = request.GET.get('employee_id')
            if requested_id:
                query['employee_id'] = requested_id

        pips = list(collection.find(query))
        for pip in pips:
            pip['_id'] = str(pip['_id'])
            
        return JsonResponse({'status': 'success', 'data': pips})
    
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def create_pip(request):
    """
    POST: Create a new PIP (Admin/Manager only)
    """
    user_id = getattr(request, 'user_id', None)
    employee_id_auth = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    if user_role not in ['admin', 'manager', 'hr']:
        return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            if not data.get('employee_id') or not data.get('title'):
                return JsonResponse({'status': 'error', 'message': 'Employee ID and Title are required'}, status=400)

            new_pip = {
                'title': data.get('title'),
                'description': data.get('description', ''),
                'employee_id': data.get('employee_id'),
                'assigned_by': employee_id_auth or user_id,
                'start_date': data.get('start_date', datetime.utcnow().isoformat()),
                'end_date': data.get('end_date', ''),
                'status': data.get('status', 'In Progress'),
                'goals': data.get('goals', []),
                'employee_notes': '',
                'manager_notes': data.get('manager_notes', ''),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            result = collection.insert_one(new_pip)
            new_pip['_id'] = str(result.inserted_id)
            
            return JsonResponse({'status': 'success', 'data': new_pip}, status=201)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
            
    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

@csrf_exempt
def pip_detail(request, pip_id):
    """
    GET: Details
    PUT: Full Update (Admin/Manager)
    PATCH: Notes Update (Employee)
    """
    user_id = getattr(request, 'user_id', None)
    employee_id_auth = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    try:
        pid = ObjectId(pip_id)
    except:
        return JsonResponse({'status': 'error', 'message': 'Invalid ID format'}, status=400)

    pip = collection.find_one({'_id': pid})
    if not pip:
        return JsonResponse({'status': 'error', 'message': 'PIP not found'}, status=404)

    if request.method == 'GET':
        pip['_id'] = str(pip['_id'])
        return JsonResponse({'status': 'success', 'data': pip})

    elif request.method == 'PUT':
        # Full update restricted to Manager/Admin
        if user_role not in ['admin', 'manager', 'hr']:
            return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)
            
        try:
            data = json.loads(request.body)
            data['updated_at'] = datetime.utcnow().isoformat()
            if '_id' in data: del data['_id']
            
            collection.update_one({'_id': pid}, {'$set': data})
            updated_pip = collection.find_one({'_id': pid})
            updated_pip['_id'] = str(updated_pip['_id'])
            return JsonResponse({'status': 'success', 'data': updated_pip})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    elif request.method == 'PATCH':
        # Partial update (Employee notes)
        try:
            data = json.loads(request.body)
            update_fields = {'updated_at': datetime.utcnow().isoformat()}
            
            # Use specific fields allowed for employees if not manager
            if user_role not in ['admin', 'manager', 'hr']:
                if pip.get('employee_id') != employee_id_auth:
                    return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)
                # Only allow notes and maybe status updates of specific sub-goals
                if 'employee_notes' in data:
                    update_fields['employee_notes'] = data['employee_notes']
            else:
                # Managers can update everything
                for key in ['status', 'manager_notes', 'goals', 'end_date']:
                    if key in data:
                        update_fields[key] = data[key]
            
            collection.update_one({'_id': pid}, {'$set': update_fields})
            updated_pip = collection.find_one({'_id': pid})
            updated_pip['_id'] = str(updated_pip['_id'])
            return JsonResponse({'status': 'success', 'data': updated_pip})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
