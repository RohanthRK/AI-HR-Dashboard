import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from bson import ObjectId
from datetime import datetime
from hr_backend.db import db, employees, teams, departments

# MongoDB collection
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
        query = {}
        scope = request.GET.get('scope', 'individual')

        if user_role != 'admin':
            # Resolve employee doc for user if available
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

            user_team_id = str(emp_doc.get('team_id', '')) if emp_doc else ''
            user_team_name = emp_doc.get('team', '') if emp_doc else ''
            user_dept_id = str(emp_doc.get('department_id', '')) if emp_doc else ''
            user_dept_name = emp_doc.get('department', '') if emp_doc else ''

            creator_ids = [val for val in [
                employee_id,
                user_id,
                str(emp_doc.get('_id', '')) if emp_doc else '',
                emp_doc.get('employee_id', '') if emp_doc else '',
                emp_doc.get('email', '') if emp_doc else ''
            ] if val]

            if scope == 'individual':
                query['$or'] = [
                    {'employee_id': {'$in': creator_ids}},
                    {'employee_id': str(user_id)}
                ]
                query['scope'] = {'$in': ['individual', None, '']}
            elif scope == 'team':
                team_matches = []
                req_team = request.GET.get('team_id')
                if req_team: team_matches.append(req_team)
                if user_team_id: team_matches.append(user_team_id)
                if user_team_name: team_matches.append(user_team_name)

                # Check teams managed or belonged to
                managed_teams = list(teams.find({
                    '$or': [
                        {'manager_id': {'$in': creator_ids}},
                        {'employees.id': {'$in': creator_ids}},
                        {'employees.employee_id': {'$in': creator_ids}},
                        {'employees.email': emp_doc.get('email', '') if emp_doc else ''}
                    ]
                }))
                for mt in managed_teams:
                    team_matches.append(str(mt['_id']))
                    if mt.get('name'): team_matches.append(mt.get('name'))

                team_matches = list(set([t for t in team_matches if t]))
                
                or_filters = [{'employee_id': {'$in': creator_ids}}]
                if team_matches:
                    or_filters.append({'team_id': {'$in': team_matches}})
                    or_filters.append({'team_name': {'$in': team_matches}})
                    # Also match case-insensitive names
                    for tm in team_matches:
                        or_filters.append({'team_name': {'$regex': f'^{tm}$', '$options': 'i'}})
                    
                query['$and'] = [{'scope': 'team'}, {'$or': or_filters}]

            elif scope == 'department':
                dept_matches = []
                req_dept = request.GET.get('department_id')
                if req_dept: dept_matches.append(req_dept)
                if user_dept_id: dept_matches.append(user_dept_id)
                if user_dept_name: dept_matches.append(user_dept_name)

                if user_dept_name:
                    d_doc = departments.find_one({'$or': [{'name': user_dept_name}, {'name': {'$regex': f'^{user_dept_name}$', '$options': 'i'}}]})
                    if d_doc:
                        dept_matches.append(str(d_doc['_id']))
                if user_dept_id:
                    try:
                        d_doc = departments.find_one({'_id': ObjectId(user_dept_id)})
                        if d_doc and d_doc.get('name'):
                            dept_matches.append(d_doc['name'])
                    except Exception:
                        pass

                dept_matches = list(set([d for d in dept_matches if d]))
                
                or_filters = [{'employee_id': {'$in': creator_ids}}]
                if dept_matches:
                    or_filters.append({'department_id': {'$in': dept_matches}})
                    or_filters.append({'department_name': {'$in': dept_matches}})
                    for dm in dept_matches:
                        or_filters.append({'department_name': {'$regex': f'^{dm}$', '$options': 'i'}})

                query['$and'] = [{'scope': 'department'}, {'$or': or_filters}]
        else:
            # Admins can filter by anything
            scope_param = request.GET.get('scope')
            if scope_param:
                if scope_param == 'individual':
                    query['scope'] = {'$in': ['individual', None, '']}
                else:
                    query['scope'] = scope_param
            
            for param in ['employee_id', 'team_id', 'department_id']:
                val = request.GET.get(param)
                if val:
                    if param == 'team_id':
                        query['$or'] = [{'team_id': val}, {'team_name': val}, {'team_name': {'$regex': f'^{val}$', '$options': 'i'}}]
                    elif param == 'department_id':
                        query['$or'] = [{'department_id': val}, {'department_name': val}, {'department_name': {'$regex': f'^{val}$', '$options': 'i'}}]
                    else:
                        query[param] = val

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

            team_id = data.get('team_id', '')
            team_name = data.get('team_name', '')
            if team_id:
                try:
                    t_doc = teams.find_one({'$or': [{'_id': ObjectId(team_id)}, {'name': team_id}]})
                    if t_doc:
                        team_id = str(t_doc['_id'])
                        team_name = t_doc.get('name', '')
                except:
                    pass

            department_id = data.get('department_id', '')
            department_name = data.get('department_name', '')
            if department_id:
                try:
                    d_doc = departments.find_one({'$or': [{'_id': ObjectId(department_id)}, {'name': department_id}]})
                    if d_doc:
                        department_id = str(d_doc['_id'])
                        department_name = d_doc.get('name', '')
                except:
                    pass

            new_objective = {
                'title': data.get('title'),
                'description': data.get('description', ''),
                'employee_id': target_employee_id,
                'team_id': team_id,
                'team_name': team_name,
                'department_id': department_id,
                'department_name': department_name,
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
