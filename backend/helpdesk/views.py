import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId
from utils.notify import notify, notify_staff, user_id_for_employee
from utils.hr_common import employee_names

tickets_collection = db["helpdesk_tickets"]

@csrf_exempt
def handle_tickets(request):
    """
    GET: List all helpdesk tickets (Department/Role filtered)
    POST: Create a new helpdesk ticket
    """
    # Extract user info from request (attached by JWTAuthMiddleware)
    user_id = getattr(request, 'user_id', None)
    employee_id = getattr(request, 'employee_id', None)
    user_role = getattr(request, 'role', '').lower()

    # Get employee department for privacy check
    user_department = 'Other'
    user_name = employee_names().get(str(employee_id), '') or 'User'      # the person's real name, for tickets and notifications
    if employee_id:
        from hr_backend.db import employees
        employee = employees.find_one({'employee_id': employee_id})
        if employee:
            user_department = str(employee.get('department', 'Other')).upper()
            user_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip()

    if request.method == 'GET':
        query = {}
        # Privacy filter: Only Admins and IT see ALL tickets. Others see their OWN.
        if user_role != 'admin' and user_department != 'IT':
            if employee_id:
                query['employee_id'] = employee_id
            elif user_id:
                query['user_id'] = user_id
            else:
                return JsonResponse({'success': True, 'tickets': []})

        tickets = list(tickets_collection.find(query).sort('createdAt', -1))
        names = employee_names()
        for ticket in tickets:
            ticket['_id'] = str(ticket['_id'])
            ticket.setdefault('subject', ticket.get('title', ''))
            ticket['employee_name'] = ticket.get('employee_name') or names.get(str(ticket.get('employee_id')), '')
        return JsonResponse({'success': True, 'tickets': tickets})
        
    elif request.method == 'POST':
        try:
            raw = json.loads(request.body)
            if not isinstance(raw, dict):
                return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)
            title = str(raw.get('title') or raw.get('subject') or '').strip()[:150]
            if not title:
                return JsonResponse({'success': False, 'error': 'A subject is required'}, status=400)
            # only these fields come from the request; ownership, status and dates are set here
            data = {'title': title, 'description': str(raw.get('description') or '').strip()[:3000],
                    'category': str(raw.get('category') or 'Other')[:40], 'priority': raw.get('priority') if raw.get('priority') in ('Low', 'Medium', 'High', 'Urgent', 'Critical') else 'Medium',
                    'employee_id': employee_id, 'employee_name': user_name, 'status': 'Open', 'createdAt': datetime.utcnow().isoformat(), 'comments': []}
            if user_id:
                data['user_id'] = user_id

            result = tickets_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            notify_staff('New helpdesk ticket', f"{user_name or 'An employee'} opened a {data['priority'].lower()}-priority {data['category']} ticket: {title}", type='ticket_update', link='/helpdesk')
            
            return JsonResponse({'success': True, 'ticket': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

@csrf_exempt
def handle_ticket_detail(request, ticket_id):
    """
    GET: Retrieve specific ticket
    PUT/PATCH: Update ticket (e.g. resolve, change priority)
    DELETE: Remove ticket
    """
    try:
        obj_id = ObjectId(ticket_id)
    except:
        return JsonResponse({'success': False, 'error': 'Invalid ID format'}, status=400)

    if request.method == 'GET':
        ticket = tickets_collection.find_one({'_id': obj_id})
        if ticket:
            ticket['_id'] = str(ticket['_id'])
            return JsonResponse({'success': True, 'ticket': ticket})
        return JsonResponse({'success': False, 'error': 'Ticket not found'}, status=404)

    user_role = (getattr(request, 'role', '') or '').lower()
    is_staff = user_role in ('admin', 'manager', 'hr')

    if request.method in ['PUT', 'PATCH', 'DELETE'] and not is_staff:
        existing = tickets_collection.find_one({'_id': obj_id})
        if not existing:
            return JsonResponse({'success': False, 'error': 'Ticket not found'}, status=404)
        employee_id = getattr(request, 'employee_id', None)
        user_id = getattr(request, 'user_id', None)
        is_owner = (employee_id and str(existing.get('employee_id')) == str(employee_id)) or                    (user_id and str(existing.get('user_id')) == str(user_id))
        if not is_owner:
            return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)

    if request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            if not is_staff and any(k in data for k in ('status', 'priority', 'assigned_to')):
                return JsonResponse({'success': False, 'error': 'Only HR/Admin can change ticket status or priority.'}, status=403)
            previous = tickets_collection.find_one({'_id': obj_id}) or {}
            
            # Special case for appending a comment vs updating the whole ticket
            if '/comment' in request.path:
                # Assuming the client sent {'comment': 'string_comment'}
                comment_text = data.get('comment')
                if comment_text:
                    result = tickets_collection.update_one(
                        {'_id': obj_id},
                        {'$push': {'comments': {
                            'text': comment_text,
                            'createdAt': datetime.utcnow().isoformat(),
                            'author': request.user_info.get('username', 'User') if hasattr(request, 'user_info') else 'User'
                        }}, '$set': {'updatedAt': datetime.utcnow().isoformat()}}
                    )
            else:
                data.pop('_id', None) 
                data['updatedAt'] = datetime.utcnow().isoformat()
                result = tickets_collection.update_one(
                    {'_id': obj_id},
                    {'$set': data}
                )
                new_status = data.get('status')
                if new_status and new_status != previous.get('status'):
                    notify(
                        previous.get('user_id') or user_id_for_employee(previous.get('employee_id')),
                        f'Ticket {new_status}',
                        f"Your ticket \"{previous.get('title', '')}\" is now {new_status}.",
                        type='ticket_update',
                        reference_id=str(obj_id),
                    )
            
            # Return the fresh state
            updated_ticket = tickets_collection.find_one({'_id': obj_id})
            if updated_ticket:
                updated_ticket['_id'] = str(updated_ticket['_id'])
                return JsonResponse({'success': True, 'ticket': updated_ticket})
            return JsonResponse({'success': False, 'error': 'Ticket not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        result = tickets_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Ticket deleted'})
        return JsonResponse({'success': False, 'error': 'Ticket not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
