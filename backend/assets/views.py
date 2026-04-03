import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId

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
            if employee_id:
                query['employee_id'] = employee_id
            elif user_id:
                query['user_id'] = user_id
            else:
                # If no ID, return empty to be safe
                return JsonResponse({'success': True, 'assets': []})

        assets = list(assets_collection.find(query))
        for asset in assets:
            asset['_id'] = str(asset['_id'])
        return JsonResponse({'success': True, 'assets': assets})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Automatic ownership tagging
            if employee_id:
                data['employee_id'] = employee_id
            if user_id:
                data['user_id'] = user_id
                
            data['status'] = data.get('status', 'Available')
            data['createdAt'] = datetime.utcnow().isoformat()
            
            result = assets_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
            return JsonResponse({'success': True, 'asset': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

@csrf_exempt
def handle_asset_detail(request, asset_id):
    """
    GET: Retrieve specific asset
    PUT/PATCH: Update asset details (e.g. assignment)
    DELETE: Remove asset from inventory
    """
    try:
        obj_id = ObjectId(asset_id)
    except:
        return JsonResponse({'success': False, 'error': 'Invalid ID format'}, status=400)

    if request.method == 'GET':
        asset = assets_collection.find_one({'_id': obj_id})
        if asset:
            asset['_id'] = str(asset['_id'])
            return JsonResponse({'success': True, 'asset': asset})
        return JsonResponse({'success': False, 'error': 'Asset not found'}, status=404)

    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            data.pop('_id', None) 
            data['updatedAt'] = datetime.utcnow().isoformat()
            
            result = assets_collection.update_one(
                {'_id': obj_id},
                {'$set': data}
            )
            
            if result.modified_count:
                updated_asset = assets_collection.find_one({'_id': obj_id})
                updated_asset['_id'] = str(updated_asset['_id'])
                return JsonResponse({'success': True, 'asset': updated_asset})
            return JsonResponse({'success': False, 'error': 'Asset not found or no changes made'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        result = assets_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Asset deleted'})
        return JsonResponse({'success': False, 'error': 'Asset not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
