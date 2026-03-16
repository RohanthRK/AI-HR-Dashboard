import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import projects, employees
from utils.api_utils import serialize_document

@csrf_exempt
@require_http_methods(["GET"])
def list_projects(request):
    """
    Lists all projects with optional filtering.
    
    Endpoint: GET /api/projects/
    
    Query Parameters:
        - search: Text search across project fields
        - status: Filter by status
        - team_id: Filter by team ID
        - page: Page number for pagination (default: 1)
        - limit: Number of results per page (default: 10)
    
    Response:
        {
            "results": [{ project data }],
            "count": total_count,
            "page": current_page,
            "limit": items_per_page
        }
    """
    try:
        # Build query filter from request parameters
        query_filter = {}
        
        # Handle text search
        search = request.GET.get('search', '')
        if search:
            search_conditions = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}}
            ]
            query_filter['$or'] = search_conditions
        
        # Status filter
        status = request.GET.get('status', '')
        if status:
            query_filter['status'] = status
            
        # Team filter
        team_id = request.GET.get('team_id', '')
        if team_id:
            try:
                query_filter['team_id'] = ObjectId(team_id)
            except:
                query_filter['team_id'] = team_id
        
        # Get sort parameters
        sort_field = request.GET.get('sort', 'name')
        sort_order = 1 if request.GET.get('order', 'asc') == 'asc' else -1
        
        # Execute query
        cursor = projects.find(query_filter).sort(sort_field, sort_order)
        
        # Pagination
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))
        skip = (page - 1) * limit
        
        # Count total documents
        total_count = projects.count_documents(query_filter)
        
        # Get paginated results
        results = list(cursor.skip(skip).limit(limit))
        
        # Serialize results
        serialized_results = [serialize_document(doc) for doc in results]
        
        # Prepare response
        response_data = {
            'results': serialized_results,
            'count': total_count,
            'page': page,
            'limit': limit
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_project(request, project_id):
    """
    Get project details by ID.
    
    Endpoint: GET /api/projects/{project_id}/
    
    Response:
        Project details or 404 error
    """
    try:
        # Find project by ID
        try:
            project = projects.find_one({'_id': ObjectId(project_id)})
        except:
            project = projects.find_one({'_id': project_id})
            
        if not project:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Project with ID {project_id} not found'
            }, status=404)
            
        # Get team members details if present
        if 'team_members' in project and project['team_members']:
            member_ids = [ObjectId(id) for id in project['team_members'] if id]
            members = list(employees.find({'_id': {'$in': member_ids}}))
            
            # Add member details to project
            project['member_details'] = [{
                'id': str(member['_id']),
                'name': f"{member.get('first_name', '')} {member.get('last_name', '')}",
                'position': member.get('position', ''),
                'email': member.get('email', '')
            } for member in members]
        
        # Serialize for response
        response_data = serialize_document(project)
        
        return JsonResponse(response_data)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def create_project(request):
    """
    Create a new project.
    
    Endpoint: POST /api/projects/
    
    Request Body:
        {
            "name": "Project Name",
            "description": "Project Description",
            "status": "planning",
            "start_date": "2023-01-01",
            "end_date": "2023-06-30",
            "team_id": "ObjectId",
            "manager_id": "ObjectId"
        }
    
    Response:
        {
            "message": "Project created successfully",
            "project_id": "ObjectId"
        }
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)
        
        # Required fields
        required_fields = ['name', 'status']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return JsonResponse({
                'error': 'Missing fields',
                'message': f'The following fields are required: {", ".join(missing_fields)}'
            }, status=400)
        
        # Check for duplicate project name
        if projects.find_one({'name': data['name']}):
            return JsonResponse({
                'error': 'Duplicate',
                'message': f"Project with name '{data['name']}' already exists"
            }, status=409)
            
        # Prepare project data
        project_data = {
            'name': data['name'],
            'description': data.get('description', ''),
            'status': data['status'],
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'updated_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
        
        # Add optional fields
        for field in ['start_date', 'end_date', 'priority', 'budget', 'budget_spent']:
            if field in data:
                project_data[field] = data[field]
                
        # Convert IDs to ObjectId
        for field in ['team_id', 'manager_id']:
            if field in data and data[field]:
                try:
                    project_data[field] = ObjectId(data[field])
                except:
                    project_data[field] = data[field]
                    
        # Insert project
        result = projects.insert_one(project_data)
        
        return JsonResponse({
            'message': 'Project created successfully',
            'project_id': str(result.inserted_id)
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid data',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def update_project(request, project_id):
    """
    Update a project.
    
    Endpoint: 
        - PUT /api/projects/{project_id}/ (full update)
        - PATCH /api/projects/{project_id}/ (partial update)
    
    Request Body:
        Project data to update
    
    Response:
        Success message or error
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)
        
        # Check if project exists
        try:
            existing_project = projects.find_one({'_id': ObjectId(project_id)})
        except:
            existing_project = projects.find_one({'_id': project_id})
            
        if not existing_project:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Project with ID {project_id} not found'
            }, status=404)
            
        # For PUT, require all fields
        if request.method == "PUT":
            required_fields = ['name', 'status']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                return JsonResponse({
                    'error': 'Missing fields',
                    'message': f'The following fields are required: {", ".join(missing_fields)}'
                }, status=400)
        
        # Check for duplicate name (if updating name)
        if 'name' in data and data['name'] != existing_project.get('name'):
            if projects.find_one({'name': data['name'], '_id': {'$ne': ObjectId(project_id)}}):
                return JsonResponse({
                    'error': 'Duplicate',
                    'message': f"Project with name '{data['name']}' already exists"
                }, status=409)
                
        # Prepare update data
        update_data = {
            'updated_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
        
        # Add fields to update
        for field in data:
            if field not in ['_id', 'created_at']:
                update_data[field] = data[field]
                
        # Convert IDs to ObjectId
        for field in ['team_id', 'manager_id']:
            if field in update_data and update_data[field]:
                try:
                    update_data[field] = ObjectId(update_data[field])
                except:
                    pass
        
        # Update project
        projects.update_one(
            {'_id': ObjectId(project_id) if isinstance(project_id, str) else project_id},
            {'$set': update_data}
        )
        
        return JsonResponse({
            'message': 'Project updated successfully'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid data',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_project(request, project_id):
    """
    Delete a project.
    
    Endpoint: DELETE /api/projects/{project_id}/
    
    Response:
        Success message or error
    """
    try:
        # Check if project exists
        try:
            existing_project = projects.find_one({'_id': ObjectId(project_id)})
        except:
            existing_project = projects.find_one({'_id': project_id})
            
        if not existing_project:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Project with ID {project_id} not found'
            }, status=404)
            
        # Delete project
        projects.delete_one({'_id': ObjectId(project_id) if isinstance(project_id, str) else project_id})
        
        return JsonResponse({
            'message': 'Project deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)
