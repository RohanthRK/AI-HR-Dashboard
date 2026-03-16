import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from hr_backend.db import db
from bson import ObjectId

tickets_collection = db["helpdesk_tickets"]

@csrf_exempt
def handle_tickets(request):
    """
    GET: List all helpdesk tickets
    POST: Create a new helpdesk ticket
    """
    if request.method == 'GET':
        tickets = list(tickets_collection.find({}))
        for ticket in tickets:
            ticket['_id'] = str(ticket['_id'])
        return JsonResponse({'success': True, 'tickets': tickets})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            data['status'] = data.get('status', 'Open')
            data['createdAt'] = datetime.utcnow().isoformat()
            data['comments'] = []
            
            result = tickets_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
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

    elif request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)
            
            # Special case for appending a comment vs updating the whole ticket
            if request.path.endswith('/comment'):
                # Assuming the client sent {'comment': 'string_comment'}
                comment_text = data.get('comment')
                if comment_text:
                    result = tickets_collection.update_one(
                        {'_id': obj_id},
                        {'$push': {'comments': {
                            'text': comment_text,
                            'createdAt': datetime.utcnow().isoformat()
                        }}, '$set': {'updatedAt': datetime.utcnow().isoformat()}}
                    )
            else:
                data.pop('_id', None) 
                data['updatedAt'] = datetime.utcnow().isoformat()
                result = tickets_collection.update_one(
                    {'_id': obj_id},
                    {'$set': data}
                )
            
            if result.modified_count:
                updated_ticket = tickets_collection.find_one({'_id': obj_id})
                updated_ticket['_id'] = str(updated_ticket['_id'])
                return JsonResponse({'success': True, 'ticket': updated_ticket})
            return JsonResponse({'success': False, 'error': 'Ticket not found or no changes made'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    elif request.method == 'DELETE':
        result = tickets_collection.delete_one({'_id': obj_id})
        if result.deleted_count:
            return JsonResponse({'success': True, 'message': 'Ticket deleted'})
        return JsonResponse({'success': False, 'error': 'Ticket not found'}, status=404)
        
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
