import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId
from utils.hr_common import employee_names

assets_collection = db["assets"]

@csrf_exempt
def handle_assets(request):
    """
    GET: List all assets (Filtered by user unless Admin)
    POST: Add a new company asset
    """
    # Extract user info from request (attached by JWTAuthMiddleware)
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    if request.method == 'GET':
        query = {}
        # Privacy filter: Only Admins can see all assets
        if user_role != 'admin':
            import re
            from hr_backend.db import employees
            # the token carries the employee's _id; assignments are stored as a code ("EMP-1001"),
            # "First Last (EMP-1001)" (admin UI), an e-mail address or a username
            employee = None
            if employee_id:
                employee = employees.find_one({'employee_id': employee_id})
                if not employee and len(str(employee_id)) == 24:
                    try:
                        employee = employees.find_one({'_id': ObjectId(str(employee_id))})
                    except Exception:
                        employee = None
            code = employee.get('employee_id', '') if employee else ''
            user_email = employee.get('email', '') if employee else ''
            username = request.user_info.get('username', '') if hasattr(request, 'user_info') else ''

            or_conditions = []
            if code:
                or_conditions.append({'assignedTo': code})
                or_conditions.append({'assignedTo': {'$regex': r'\(' + re.escape(code) + r'\)$'}})
            if employee_id:
                or_conditions.append({'assignedTo': str(employee_id)})
            if user_email:
                or_conditions.append({'assignedTo': user_email})
            if username:
                or_conditions.append({'assignedTo': username})

            if or_conditions:
                query['$or'] = or_conditions
            else:
                return JsonResponse({'success': True, 'assets': []})

        assets = list(assets_collection.find(query))
        names = employee_names()
        for asset in assets:
            asset['_id'] = str(asset['_id'])
            holder = str(asset.get('assignedTo', ''))
            code = holder.rsplit('(', 1)[-1].rstrip(')') if holder.endswith(')') else holder
            asset['assignedToName'] = names.get(code, '')
            asset['assignedToCode'] = code
        return JsonResponse({'success': True, 'assets': assets})
        
    elif request.method == 'POST':
        if user_role != 'admin':
            return JsonResponse({'success': False, 'error': 'Permission denied. Admins only.'}, status=403)
        try:
            data = json.loads(request.body)
            author_name = request.user_info.get('username', 'Admin') if hasattr(request, 'user_info') else 'Admin'
            
            # Automatic ownership tagging
            if employee_id:
                data['employee_id'] = employee_id
            if user_id:
                data['user_id'] = user_id
                
            assigned_to = data.get('assignedTo', '').strip()
            data['status'] = 'Assigned' if assigned_to else 'Available'
            data['createdAt'] = datetime.utcnow().isoformat()
            
            # Initialize history timeline
            initial_history = {
                'text': f"Asset registered in inventory and assigned to {assigned_to}" if assigned_to else "Asset registered in inventory as Available",
                'createdAt': datetime.utcnow().isoformat(),
                'author': author_name,
                'is_system': True,
                'assignedTo': assigned_to or 'Unassigned'
            }
            data['history'] = [initial_history]
            
            result = assets_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
            return JsonResponse({'success': True, 'asset': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

@csrf_exempt
def handle_asset_detail(request, asset_id):
    user_role = getattr(request, 'role', '').lower()

    try:
        obj_id = ObjectId(asset_id)
    except:
        return JsonResponse({'success': False, 'error': 'Invalid ID format'}, status=400)

    if request.method == 'GET':
        asset = assets_collection.find_one({'_id': obj_id})
        if asset:
            if user_role not in ('admin', 'manager', 'hr'):
                from hr_backend.db import employees as _emps
                me = _emps.find_one({'employee_id': str(getattr(request, 'employee_id', ''))}) or {}
                mine = {str(getattr(request, 'employee_id', '')), me.get('email', ''),
                        request.user_info.get('username', '') if hasattr(request, 'user_info') else ''} - {''}
                if asset.get('assignedTo') not in mine:
                    return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)
            asset['_id'] = str(asset['_id'])
            return JsonResponse({'success': True, 'asset': asset})
        return JsonResponse({'success': False, 'error': 'Asset not found'}, status=404)

    elif request.method in ['PUT', 'PATCH']:
        if user_role != 'admin':
            return JsonResponse({'success': False, 'error': 'Permission denied. Only Admins can modify assets or post updates.'}, status=403)

        try:
            data = json.loads(request.body)
            author_name = request.user_info.get('username', 'Admin') if hasattr(request, 'user_info') else 'Admin'
            current_asset = assets_collection.find_one({'_id': obj_id})
            if not current_asset:
                return JsonResponse({'success': False, 'error': 'Asset not found'}, status=404)

            # Check if this is a comment / note update
            if '/comment' in request.path or 'comment' in data:
                comment_text = data.get('comment')
                if comment_text:
                    history_entry = {
                        'text': comment_text,
                        'createdAt': datetime.utcnow().isoformat(),
                        'author': author_name,
                        'is_system': False,
                        'assignedTo': current_asset.get('assignedTo', 'Unassigned')
                    }
                    assets_collection.update_one(
                        {'_id': obj_id},
                        {
                            '$push': {'history': history_entry},
                            '$set': {'updatedAt': datetime.utcnow().isoformat()}
                        }
                    )
            else:
                data.pop('_id', None)
                data['updatedAt'] = datetime.utcnow().isoformat()
                
                new_assigned = data.get('assignedTo')
                old_assigned = current_asset.get('assignedTo', 'Unassigned')
                new_status = data.get('status')
                old_status = current_asset.get('status', 'Available')

                history_entries = []
                if new_assigned is not None and new_assigned != old_assigned:
                    history_entries.append({
                        'text': f"Asset reassigned from {old_assigned or 'Unassigned'} to {new_assigned or 'Unassigned'}",
                        'createdAt': datetime.utcnow().isoformat(),
                        'author': author_name,
                        'is_system': True,
                        'assignedTo': new_assigned or 'Unassigned'
                    })
                if new_status is not None and new_status != old_status:
                    history_entries.append({
                        'text': f"Status updated from {old_status} to {new_status}",
                        'createdAt': datetime.utcnow().isoformat(),
                        'author': author_name,
                        'is_system': True,
                        'assignedTo': new_assigned if new_assigned is not None else old_assigned
                    })

                update_ops = {'$set': data}
                if history_entries:
                    update_ops['$push'] = {'history': {'$each': history_entries}}

                assets_collection.update_one({'_id': obj_id}, update_ops)

            updated_asset = assets_collection.find_one({'_id': obj_id})
            updated_asset['_id'] = str(updated_asset['_id'])
            return JsonResponse({'success': True, 'asset': updated_asset})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        if user_role != 'admin':
            return JsonResponse({'success': False, 'error': 'Permission denied. Admins only.'}, status=403)

        result = assets_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Asset deleted'})
        return JsonResponse({'success': False, 'error': 'Asset not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
