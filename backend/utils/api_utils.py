import json
import datetime
from django.http import JsonResponse
from django.core.paginator import Paginator
from bson import ObjectId

def serialize_document(doc):
    """Serialize MongoDB document for JSON response"""
    if not doc:
        return None
        
    doc = dict(doc)
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    
    # Handle other ObjectId fields
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, datetime.datetime):
            doc[key] = value.isoformat()
            
    return doc

def validate_required_fields(data, required_fields):
    """Validate that all required fields are present in data"""
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, JsonResponse({
            'error': 'Missing required fields',
            'fields': missing_fields
        }, status=400)
    return True, None

def paginate_results(request, cursor, default_limit=20):
    """Paginate a PyMongo cursor based on request parameters"""
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', default_limit))
    except (ValueError, TypeError):
        page = 1
        limit = default_limit
        
    # Convert cursor to list for simpler pagination
    results = list(cursor)
    total_count = len(results)
    
    # Calculate offset
    start = (page - 1) * limit
    end = start + limit
    
    # Slice results
    paginated_results = results[start:end]
    
    # Serialize results
    serialized_results = [serialize_document(doc) for doc in paginated_results]
    
    # Return paginated response structure
    return {
        'count': total_count,
        'next': page + 1 if end < total_count else None,
        'previous': page - 1 if page > 1 else None,
        'results': serialized_results,
        'page': page,
        'limit': limit,
        'total_pages': (total_count + limit - 1) // limit
    }

def create_crud_endpoints(collection, required_fields=None, search_fields=None):
    """
    Generic utility to create standard CRUD endpoints for a MongoDB collection.
    
    Args:
        collection: The PyMongo collection object
        required_fields: List of fields required for creation
        search_fields: List of fields to allow filtering by
        
    Returns:
        dict: Dictionary containing CRUD view functions
    """
    if required_fields is None:
        required_fields = []
    if search_fields is None:
        search_fields = []
        
    def list_items(request):
        """List items with filtering and pagination"""
        try:
            # Build query filter
            query_filter = {}
            for field in search_fields:
                value = request.GET.get(field)
                if value:
                    # Generic string search (case-insensitive)
                    query_filter[field] = {'$regex': value, '$options': 'i'}
            
            # Handle sorting
            sort_field = request.GET.get('sort_by', 'created_at')
            sort_order = -1 if request.GET.get('order') == 'desc' else 1
            
            # Execute query
            cursor = collection.find(query_filter).sort(sort_field, sort_order)
            
            # Paginate results
            result = paginate_results(request, cursor)
            
            return JsonResponse(result)
            
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
    
    def get_item(request, item_id):
        """Get a single item by ID"""
        try:
            # Try both string ID and ObjectId
            item = collection.find_one({'_id': item_id})
            if not item:
                try:
                    item = collection.find_one({'_id': ObjectId(item_id)})
                except:
                    pass
                
            if not item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            # Serialize for response
            response_data = serialize_document(item)
            
            return JsonResponse(response_data)
            
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
    
    def create_item(request):
        """Create a new item"""
        try:
            # Parse JSON data
            data = json.loads(request.body)
            
            # Validate required fields
            is_valid, error_response = validate_required_fields(data, required_fields)
            if not is_valid:
                return error_response
                
            # Add timestamps
            now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            data['created_at'] = now
            data['updated_at'] = now
            
            # Insert into database
            result = collection.insert_one(data)
            
            return JsonResponse({
                'message': 'Item created successfully',
                'id': str(result.inserted_id)
            }, status=201)
            
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
    
    def update_item(request, item_id):
        """Update an item (full update)"""
        try:
            # Parse JSON data
            data = json.loads(request.body)
            
            # Check if item exists
            item = collection.find_one({'_id': item_id})
            if not item:
                try:
                    item = collection.find_one({'_id': ObjectId(item_id)})
                except:
                    pass
            
            if not item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                        
            # Update timestamp
            data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Don't allow changing the ID
            if '_id' in data:
                del data['_id']
                
            # Update in database - Try as string first, then as ObjectId
            result = collection.update_one({'_id': item_id}, {'$set': data})
            
            if result.matched_count == 0:
                try:
                    result = collection.update_one({'_id': ObjectId(item_id)}, {'$set': data})
                except:
                    pass
                
            if result.matched_count == 0:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            return JsonResponse({
                'message': 'Item updated successfully',
                'id': item_id
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
    
    def partial_update_item(request, item_id):
        """Update an item (partial update)"""
        try:
            # Parse JSON data
            data = json.loads(request.body)
            
            # Check if item exists
            item = collection.find_one({'_id': item_id})
            if not item:
                try:
                    item = collection.find_one({'_id': ObjectId(item_id)})
                except:
                    pass
            
            if not item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                        
            # Update timestamp
            data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Don't allow changing the ID
            if '_id' in data:
                del data['_id']
                
            # Update in database - Try as string first, then as ObjectId
            result = collection.update_one({'_id': item_id}, {'$set': data})
            
            if result.matched_count == 0:
                try:
                    result = collection.update_one({'_id': ObjectId(item_id)}, {'$set': data})
                except:
                    pass
                
            if result.matched_count == 0:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            return JsonResponse({
                'message': 'Item updated successfully',
                'id': item_id
            })
            
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Invalid JSON data'
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
    
    def delete_item(request, item_id):
        """Delete an item"""
        try:
            # Delete from database - Try as string first, then as ObjectId
            result = collection.delete_one({'_id': item_id})
            
            if result.deleted_count == 0:
                try:
                    result = collection.delete_one({'_id': ObjectId(item_id)})
                except:
                    pass
                
            if result.deleted_count == 0:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            return JsonResponse({
                'message': 'Item deleted successfully',
                'id': item_id
            })
            
        except Exception as e:
            return JsonResponse({
                'error': 'Server error',
                'message': str(e)
            }, status=500)
            
    # Return dictionary of CRUD functions
    return {
        'list_items': list_items,
        'get_item': get_item,
        'create_item': create_item,
        'update_item': update_item, 
        'partial_update_item': partial_update_item,
        'delete_item': delete_item
    }