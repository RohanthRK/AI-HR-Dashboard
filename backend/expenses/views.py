import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId

# Ensure collections exist
expenses_collection = db["expenses"]

@csrf_exempt
def handle_expenses(request):
    """
    GET: List all expenses
    POST: Create a new expense claim
    """
    if request.method == 'GET':
        expenses = list(expenses_collection.find({}))
        # Convert ObjectId to string
        for exp in expenses:
            exp['_id'] = str(exp['_id'])
        return JsonResponse({'success': True, 'expenses': expenses})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Default status
            data['status'] = data.get('status', 'Pending')
            data['submittedAt'] = datetime.utcnow().isoformat()
            
            result = expenses_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
            return JsonResponse({'success': True, 'expense': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

@csrf_exempt
def handle_expense_detail(request, expense_id):
    """
    GET: Retrieve specific expense
    PUT/PATCH: Update expense (e.g. approve/reject)
    DELETE: Remove expense
    """
    try:
        obj_id = ObjectId(expense_id)
    except:
        return JsonResponse({'success': False, 'error': 'Invalid ID format'}, status=400)

    if request.method == 'GET':
        expense = expenses_collection.find_one({'_id': obj_id})
        if expense:
            expense['_id'] = str(expense['_id'])
            return JsonResponse({'success': True, 'expense': expense})
        return JsonResponse({'success': False, 'error': 'Expense not found'}, status=404)

    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            # Cannot update ID
            data.pop('_id', None) 
            data['updatedAt'] = datetime.utcnow().isoformat()
            
            result = expenses_collection.update_one(
                {'_id': obj_id},
                {'$set': data}
            )
            
            if result.modified_count:
                updated_expense = expenses_collection.find_one({'_id': obj_id})
                updated_expense['_id'] = str(updated_expense['_id'])
                return JsonResponse({'success': True, 'expense': updated_expense})
            return JsonResponse({'success': False, 'error': 'Expense not found or no changes made'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        result = expenses_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Expense deleted'})
        return JsonResponse({'success': False, 'error': 'Expense not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
