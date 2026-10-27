import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId
from utils.notify import notify, notify_staff, user_id_for_employee
from payroll.engine import inr
from utils.auth_utils import is_privileged, is_admin, forbidden, can_see_employee, scope_query
from utils.hr_common import employee_names

# Ensure collections exist
expenses_collection = db["expenses"]

@csrf_exempt
def handle_expenses(request):
    """
    GET: List all expenses (Filtered by user unless Admin)
    POST: Create a new expense claim
    """
    # Extract user info from request (attached by JWTAuthMiddleware)
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    getattr(request, 'role', '').lower()

    if request.method == 'GET':
        query = {}
        # Privacy filter: Admin / Manager / HR see everything, others only their own
        if not is_privileged(request):
            if employee_id:
                query['employee_id'] = employee_id
            elif user_id:
                query['user_id'] = user_id
            else:
                # If no ID, return empty to be safe
                return JsonResponse({'success': True, 'expenses': []})

        if is_privileged(request) and not is_admin(request):       # a manager sees their own and their reports' claims
            query = scope_query(request, 'employee_id')
        expenses = list(expenses_collection.find(query))
        # Convert ObjectId to string
        names = employee_names()
        for exp in expenses:
            exp['_id'] = str(exp['_id'])
            exp.setdefault('title', exp.get('description', ''))
            exp['employee_name'] = names.get(str(exp.get('employee_id')), '')
        expenses.sort(key=lambda e: str(e.get('submittedAt', '')), reverse=True)
        return JsonResponse({'success': True, 'expenses': expenses})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            try:
                amount = round(float(data.get('amount')), 2)
            except (TypeError, ValueError):
                return JsonResponse({'success': False, 'error': 'Amount must be a number'}, status=400)
            if not 0 < amount <= 1000000:
                return JsonResponse({'success': False, 'error': 'Amount must be between ₹0.01 and ₹10,00,000'}, status=400)
            data['amount'] = amount
            data['title'] = str(data.get('title') or data.get('description') or '').strip()[:120]
            if not data['title']:
                return JsonResponse({'success': False, 'error': 'A title or description is required'}, status=400)
            data['description'] = str(data.get('description') or '').strip()[:1000]
            # Automatic ownership tagging
            if employee_id:
                data['employee_id'] = employee_id
            if user_id:
                data['user_id'] = user_id
                
            # New claims always start as Pending; ownership comes from the token, never the body
            data['status'] = 'Pending'
            if not employee_id and not user_id:
                return JsonResponse({'success': False, 'error': 'Account is not linked to an employee'}, status=400)
            data['submittedAt'] = datetime.utcnow().isoformat()
            data['comments'] = []
            
            result = expenses_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)

            # tell the people who approve it: HR, and the employee's manager
            who = employee_names().get(str(employee_id), 'An employee')
            text = f"{who} submitted a {data.get('category') or 'expense'} claim of {inr(amount, '₹')}: {data['title']}"
            notify_staff('Expense claim to approve', text, type='expense_update', link='/expenses')
            boss = (db['Employees'].find_one({'_id': ObjectId(str(employee_id))}) or {}).get('manager_id') if ObjectId.is_valid(str(employee_id)) else None
            boss_user = user_id_for_employee(boss) if boss else None
            if boss_user:
                notify(boss_user, 'Expense claim to approve', text, type='expense_update', reference_id=str(result.inserted_id))

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
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    try:
        obj_id = ObjectId(expense_id)
    except:
        return JsonResponse({'success': False, 'error': 'Invalid ID format'}, status=400)

    expense = expenses_collection.find_one({'_id': obj_id})
    if not expense:
        return JsonResponse({'success': False, 'error': 'Expense not found'}, status=404)
    if is_privileged(request) and not can_see_employee(request, expense.get('employee_id')):
        return forbidden()

    if request.method == 'GET':
        is_owner = (employee_id and str(expense.get('employee_id')) == str(employee_id)) or \
                   (user_id and str(expense.get('user_id')) == str(user_id))
        if not is_privileged(request) and not is_owner:
            return forbidden()
        expense['_id'] = str(expense['_id'])
        return JsonResponse({'success': True, 'expense': expense})

    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            data.pop('_id', None) 
            
            # Special case for comment updates
            if '/comment' in request.path:
                is_owner = (employee_id and str(expense.get('employee_id')) == str(employee_id)) or \
                           (user_id and str(expense.get('user_id')) == str(user_id))
                if user_role != 'admin' and not is_owner:
                    return JsonResponse({
                        'success': False,
                        'error': 'Permission denied. Only the assigned employee or Admin can write comments.'
                    }, status=403)
                
                comment_text = data.get('comment')
                if comment_text:
                    result = expenses_collection.update_one(
                        {'_id': obj_id},
                        {'$push': {'comments': {
                            'text': comment_text,
                            'createdAt': datetime.utcnow().isoformat(),
                            'author': request.user_info.get('username', 'User') if hasattr(request, 'user_info') else 'User'
                        }}, '$set': {'updatedAt': datetime.utcnow().isoformat()}}
                    )
            else:
                # Regular update
                if 'status' in data:
                    own_claim = (employee_id and str(expense.get('employee_id')) == str(employee_id)) or \
                                (user_id and str(expense.get('user_id')) == str(user_id))
                    if own_claim:
                        return JsonResponse({'success': False, 'error': 'You cannot approve or reject your own claim.'}, status=403)
                    if user_role not in ['admin', 'manager']:
                        return JsonResponse({
                            'success': False,
                            'error': 'Permission denied. Only Admin or Manager can change the status.'
                        }, status=403)
                
                is_owner = (employee_id and str(expense.get('employee_id')) == str(employee_id)) or \
                           (user_id and str(expense.get('user_id')) == str(user_id))
                if user_role not in ['admin', 'manager'] and not is_owner:
                    return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)

                data['updatedAt'] = datetime.utcnow().isoformat()
                new_status = data.get('status')
                old_status = expense.get('status', 'Pending')
                
                update_ops = {'$set': data}
                
                # Auto-log status changes to comments
                if new_status and new_status != old_status:
                    author_name = request.user_info.get('username', 'Admin') if hasattr(request, 'user_info') else 'Admin'
                    update_ops['$push'] = {'comments': {
                        'text': f"Status changed from {old_status} to {new_status}",
                        'createdAt': datetime.utcnow().isoformat(),
                        'author': author_name,
                        'is_system': True
                    }}

                result = expenses_collection.update_one(
                    {'_id': obj_id},
                    update_ops
                )

                if new_status and new_status != old_status:
                    notify(
                        expense.get('user_id') or user_id_for_employee(expense.get('employee_id')),
                        f'Expense {new_status}',
                        f"Your {expense.get('category', '')} expense of {inr(expense.get('amount') or 0, '₹')} is now {new_status}.",
                        type='expense_update',
                        reference_id=str(obj_id),
                    )
            
            updated_expense = expenses_collection.find_one({'_id': obj_id})
            updated_expense['_id'] = str(updated_expense['_id'])
            return JsonResponse({'success': True, 'expense': updated_expense})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        is_owner = (employee_id and str(expense.get('employee_id')) == str(employee_id)) or \
                   (user_id and str(expense.get('user_id')) == str(user_id))
        if user_role != 'admin' and not is_owner:
            return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)

        result = expenses_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Expense deleted'})
        return JsonResponse({'success': False, 'error': 'Expense not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
