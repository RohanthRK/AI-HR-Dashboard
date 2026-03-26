"""
Utility functions for API CRUD operations
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse

class MongoJSONEncoder(json.JSONEncoder):
    """JSON Encoder that can handle MongoDB ObjectId and dates"""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)

def serialize_document(doc):
    """
    Serialize a MongoDB document to ensure it's JSON serializable
    Convert ObjectId to string and handle dates
    """
    if not doc:
        return None
        
    # Use the custom encoder to convert the document to JSON
    serialized = json.loads(json.dumps(doc, cls=MongoJSONEncoder))
    return serialized

def paginate_results(request, cursor, default_limit=10):
    """
    Paginate MongoDB cursor results
    
    Args:
        request: The HTTP request object
        cursor: MongoDB cursor
        default_limit: Default items per page
        
    Returns:
        dict: Paginated results with metadata
    """
    # Get the collection from the cursor
    collection = cursor.collection
    
    # Get the filter from the cursor
    query_filter = cursor._Cursor__spec or {}
    
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', default_limit))
    
    # Calculate skip (offset)
    skip = (page - 1) * limit
    
    # Count total documents (before pagination) - fixed: use count_documents instead of cursor.count()
    total_count = collection.count_documents(query_filter)
    
    # Apply pagination
    results = list(cursor.skip(skip).limit(limit))
    
    # Serialize results
    serialized_results = [serialize_document(doc) for doc in results]
    
    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit  # Ceiling division
    has_next = page < total_pages
    has_prev = page > 1
    
    # Return paginated response
    return {
        'results': serialized_results,
        'count': total_count,
        'page': page,
        'limit': limit,
        'pages': total_pages,
        'has_next': has_next,
        'has_prev': has_prev,
    }
    
def validate_required_fields(data, required_fields):
    """
    Validate that all required fields are present in the data
    
    Args:
        data: The data to validate
        required_fields: List of required field names
        
    Returns:
        tuple: (is_valid, error_response)
    """
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            missing_fields.append(field)
            
    if missing_fields:
        error_response = JsonResponse({
            'error': 'Missing required fields',
            'fields': missing_fields,
            'message': f'The following fields are required: {", ".join(missing_fields)}'
        }, status=400)
        return False, error_response
        
    return True, None

def create_crud_endpoints(collection, required_fields, searchable_fields=None):
    """
    Generate standard CRUD endpoint functions for a MongoDB collection
    
    Args:
        collection: MongoDB collection object
        required_fields: List of fields required for creation
        searchable_fields: List of fields that can be searched
        
    Returns:
        dict: Dictionary of CRUD functions
    """
    if searchable_fields is None:
        searchable_fields = []
    
    def list_items(request):
        """List items with filtering and pagination"""
        try:
            # Build query filter from request parameters
            query_filter = {}
            
            # Handle text search
            search = request.GET.get('search', '')
            if search and searchable_fields:
                search_conditions = []
                for field in searchable_fields:
                    search_conditions.append({field: {'$regex': search, '$options': 'i'}})
                query_filter['$or'] = search_conditions
                
            # Add any exact match filters
            for key, value in request.GET.items():
                if key not in ['page', 'limit', 'search', 'sort', 'order']:
                    if key.endswith('_id') and value:
                        try:
                            # Convert to ObjectId if it's an ID field
                            query_filter[key] = ObjectId(value)
                        except:
                            query_filter[key] = value
                    elif value:
                        query_filter[key] = value
            
            # Get sort parameters
            sort_field = request.GET.get('sort', '_id')
            sort_order = 1 if request.GET.get('order', 'asc') == 'asc' else -1
            
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
            # Try to convert to ObjectId
            try:
                item = collection.find_one({'_id': ObjectId(item_id)})
            except:
                # If not a valid ObjectId, try as string ID
                item = collection.find_one({'_id': item_id})
                
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
                
            # We do not convert ID fields to ObjectId because 
            # the MongoDB schema validator assumes bsonType "string"
            pass
                        
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
            try:
                existing_item = collection.find_one({'_id': ObjectId(item_id)})
            except:
                existing_item = collection.find_one({'_id': item_id})
                
            if not existing_item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            # We do not convert ID fields to ObjectId because 
            # the MongoDB schema validator assumes bsonType "string"
            pass
                        
            # Update timestamp
            data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Don't allow changing the ID
            if '_id' in data:
                del data['_id']
                
            # Update in database
            try:
                collection.update_one({'_id': ObjectId(item_id)}, {'$set': data})
            except:
                collection.update_one({'_id': item_id}, {'$set': data})
                
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
            try:
                existing_item = collection.find_one({'_id': ObjectId(item_id)})
            except:
                existing_item = collection.find_one({'_id': item_id})
                
            if not existing_item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            # We do not convert ID fields to ObjectId because 
            # the MongoDB schema validator assumes bsonType "string"
            pass
                        
            # Update timestamp
            data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Don't allow changing the ID
            if '_id' in data:
                del data['_id']
                
            # Update in database
            try:
                collection.update_one({'_id': ObjectId(item_id)}, {'$set': data})
            except:
                collection.update_one({'_id': item_id}, {'$set': data})
                
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
            # Check if item exists
            try:
                existing_item = collection.find_one({'_id': ObjectId(item_id)})
            except:
                existing_item = collection.find_one({'_id': item_id})
                
            if not existing_item:
                return JsonResponse({
                    'error': 'Not found',
                    'message': f'Item with ID {item_id} not found'
                }, status=404)
                
            # Delete from database
            try:
                collection.delete_one({'_id': ObjectId(item_id)})
            except:
                collection.delete_one({'_id': item_id})
                
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