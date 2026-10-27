import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson import ObjectId
from datetime import datetime
from hr_backend.db import db, employees, users
from utils.auth_utils import is_privileged, is_admin, owns_employee, forbidden, can_see_employee, visible_refs

# MongoDB collection
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
            emp_query = {'$or': []}
            if employee_id:
                emp_query['$or'].append({'employee_id': employee_id})
                try:
                    emp_query['$or'].append({'_id': ObjectId(employee_id)})
                except Exception:
                    pass
            if user_id: 
                emp_query['$or'].append({'user_id': str(user_id)})
                try:
                    emp_query['$or'].append({'_id': ObjectId(user_id)})
                except Exception:
                    pass
            if hasattr(request, 'user_info') and request.user_info.get('email'):
                emp_query['$or'].append({'email': request.user_info.get('email')})

            emp_doc = employees.find_one(emp_query) if emp_query['$or'] else None
            
            raw_ids = [val for val in [
                employee_id,
                user_id,
                str(emp_doc.get('_id', '')) if emp_doc else '',
                emp_doc.get('employee_id', '') if emp_doc else '',
                emp_doc.get('email', '') if emp_doc else ''
            ] if val]
            
            emp_ids = []
            for item in raw_ids:
                s_item = str(item)
                emp_ids.append(s_item)
                if len(s_item) == 24:
                    try:
                        emp_ids.append(ObjectId(s_item))
                    except Exception:
                        pass
            
            if emp_ids:
                query['employee_id'] = {'$in': emp_ids}
            else:
                return JsonResponse({'status': 'success', 'data': []})
        else:
            # Managers/Admin can filter by employee_id if provided
            requested_id = request.GET.get('employee_id')
            if requested_id:
                req_ids = [requested_id]
                if len(requested_id) == 24:
                    try: req_ids.append(ObjectId(requested_id))
                    except Exception: pass
                query['employee_id'] = {'$in': req_ids}

        if is_privileged(request) and not is_admin(request):       # managers: their reports only
            allowed = []
            for ref in visible_refs(request) or ():
                allowed.append(ref)
                if len(ref) == 24:
                    try:
                        allowed.append(ObjectId(ref))
                    except Exception:
                        pass
            query = {'$and': [query, {'employee_id': {'$in': allowed}}]} if query else {'employee_id': {'$in': allowed}}
        pips = list(collection.find(query).sort('created_at', -1))
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
                'notes': [], # Persistent log of notes
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Initial note if provided
            initial_note = data.get('manager_notes') or data.get('description')
            if initial_note:
                new_pip['notes'].append({
                    'text': initial_note,
                    'author': 'System / Manager',
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': 'manager'
                })
            
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

    if is_privileged(request) and not can_see_employee(request, pip.get('employee_id')):
        return forbidden()
    if request.method == 'GET':
        if not is_privileged(request) and not owns_employee(request, pip.get('employee_id')):
            return forbidden()
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
            
            # Resolve all valid IDs for the current user
            emp_query = {'$or': []}
            if employee_id_auth:
                emp_query['$or'].append({'employee_id': employee_id_auth})
                try:
                    emp_query['$or'].append({'_id': ObjectId(employee_id_auth)})
                except Exception:
                    pass
            if user_id: 
                emp_query['$or'].append({'user_id': str(user_id)})
                try:
                    emp_query['$or'].append({'_id': ObjectId(user_id)})
                except Exception:
                    pass
            if hasattr(request, 'user_info') and request.user_info.get('email'):
                emp_query['$or'].append({'email': request.user_info.get('email')})

            emp_doc = employees.find_one(emp_query) if emp_query['$or'] else None
            
            allowed_ids = [val for val in [
                employee_id_auth,
                user_id,
                str(emp_doc.get('_id', '')) if emp_doc else '',
                emp_doc.get('employee_id', '') if emp_doc else '',
                emp_doc.get('email', '') if emp_doc else ''
            ] if val]
            
            # Use specific fields allowed for employees if not manager
            if user_role not in ['admin', 'manager', 'hr']:
                if str(pip.get('employee_id')) not in allowed_ids:
                    return JsonResponse({'status': 'error', 'message': 'Unauthorized'}, status=403)
                # Only allow notes and maybe status updates of specific sub-goals
                if 'employee_notes' in data:
                    update_fields['employee_notes'] = data['employee_notes']
            else:
                # Managers can update everything
                for key in ['status', 'manager_notes', 'goals', 'end_date']:
                    if key in data:
                        update_fields[key] = data[key]
            
            # Find author name
            author_name = "User"
            if emp_doc:
                author_name = f"{emp_doc.get('first_name', '')} {emp_doc.get('last_name', '')}".strip() or author_name
            else:
                try:
                    user_doc = users.find_one({'_id': ObjectId(user_id)})
                    if user_doc:
                        author_name = user_doc.get('username') or user_doc.get('email', author_name)
                except Exception:
                    pass

            # Prepare notes to push
            notes_to_push = []
            
            # Auto-log status changes
            new_status = data.get('status')
            if new_status and new_status != pip.get('status'):
                notes_to_push.append({
                    'text': f"Status changed from {pip.get('status', 'In Progress')} to {new_status}",
                    'author': author_name,
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': 'system'
                })

            # Append new manual note if provided
            new_note = data.get('new_note') or data.get('comment')
            if new_note and isinstance(new_note, str) and new_note.strip():
                notes_to_push.append({
                    'text': new_note.strip(),
                    'author': author_name,
                    'timestamp': datetime.utcnow().isoformat(),
                    'role': user_role
                })

            # Execute updates
            update_query = {'$set': update_fields}
            if notes_to_push:
                update_query['$push'] = {'notes': {'$each': notes_to_push}}
            
            collection.update_one({'_id': pid}, update_query)

            updated_pip = collection.find_one({'_id': pid})
            updated_pip['_id'] = str(updated_pip['_id'])
            return JsonResponse({'status': 'success', 'data': updated_pip})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

    return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
