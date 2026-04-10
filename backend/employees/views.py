from django.shortcuts import render

# Create your views here.

"""
Views for employee management
"""
import json
import os
import datetime
import traceback as import_traceback
from bson import ObjectId
from django.conf import settings
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import employees, departments, documents, teams as teams_collection
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)
from utils.auth_utils import require_role, require_self_or_role

# Define required fields for employee creation
EMPLOYEE_REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'employee_id']

# Define searchable fields for employees
EMPLOYEE_search_fields = ['first_name', 'last_name', 'email', 'employee_id', 'position', 'phone']

# Create standard CRUD endpoints
employee_crud = create_crud_endpoints(
    collection=employees,
    required_fields=EMPLOYEE_REQUIRED_FIELDS,
    search_fields=EMPLOYEE_search_fields
)

@csrf_exempt
@require_http_methods(["GET"])
def list_employees(request):
    """
    Lists all employees with optional filtering, sorting, and pagination.
    
    Endpoint: GET /api/employees/
    
    Query Parameters:
        - search: Text search across employee fields (name, email, ID)
        - page: Page number for pagination (default: 1)
        - limit: Number of results per page (default: 100)
        - sort: Field to sort by (default: '_id')
        - order: Sort direction ('asc' or 'desc', default: 'asc')
        - Any field name can be used as a filter parameter
    
    Response:
        {
            "results": [{ employee data }],
            "count": total_count,
            "page": current_page,
            "limit": items_per_page,
            "pages": total_pages,
            "has_next": boolean,
            "has_prev": boolean
        }
    
    Notes:
        - If no employees exist, creates sample employee data
        - Automatically adds department names based on department_id
    """
    try:
        print("DEBUG: Received list_employees request")
        print(f"DEBUG: User agent: {request.META.get('HTTP_USER_AGENT', 'Not provided')}")
        print(f"DEBUG: Remote addr: {request.META.get('REMOTE_ADDR', 'Not provided')}")
        print(f"DEBUG: Headers: {dict(request.headers)}")

        # Build query filter from request parameters
        query_filter = {}
        
        # Handle text search
        search = request.GET.get('search', '')
        if search and EMPLOYEE_search_fields:
            search_conditions = []
            for field in EMPLOYEE_search_fields:
                search_conditions.append({field: {'$regex': search, '$options': 'i'}})
            query_filter['$or'] = search_conditions
            
        # Add any exact match filters - exclude pagination, cache-busting, and other non-filter params
        excluded_params = ['page', 'limit', 'search', 'sort', 'order', '_t', 'cache']
        for key, value in request.GET.items():
            if key not in excluded_params:
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
        print(f"DEBUG: MongoDB query filter: {query_filter}")
        cursor = employees.find(query_filter).sort(sort_field, sort_order)
        
        # Get all department data to add names
        all_departments = {str(dept['_id']): dept for dept in departments.find()}
        
        # Apply pagination and get results
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 100))
        
        # Calculate skip (offset)
        skip = (page - 1) * limit
        
        # Count total documents (before pagination)
        total_count = employees.count_documents(query_filter)
        print(f"DEBUG: Found {total_count} total employees matching query")
        
        # If no employees found, create sample employees
        if total_count == 0:
            print("DEBUG: No employees found. Creating sample data...")
            
            # Create sample departments if they don't exist
            dept_ids = {}
            for dept_name in ["Engineering", "HR", "Marketing", "Sales", "Finance"]:
                existing_dept = departments.find_one({"name": dept_name})
                if existing_dept:
                    dept_ids[dept_name] = existing_dept["_id"]
                else:
                    result = departments.insert_one({
                        "name": dept_name,
                        "description": f"{dept_name} department",
                        "created_at": datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
                    })
                    dept_ids[dept_name] = result.inserted_id
            
            # Sample employee data
            sample_employees = [
                {
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john.doe@example.com",
                    "employee_id": "EMP001",
                    "department": "Engineering",
                    "department_id": dept_ids["Engineering"],
                    "position": "Senior Developer",
                    "hire_date": "2021-01-15",
                    "phone": "+1 555-123-4567",
                    "address": "123 Main St, Anytown USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "email": "jane.smith@example.com",
                    "employee_id": "EMP002",
                    "department": "HR",
                    "department_id": dept_ids["HR"],
                    "position": "HR Manager",
                    "hire_date": "2020-05-10",
                    "phone": "+1 555-987-6543",
                    "address": "456 Oak Ave, Othertown USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Michael",
                    "last_name": "Johnson",
                    "email": "michael.johnson@example.com",
                    "employee_id": "EMP003",
                    "department": "Sales",
                    "department_id": dept_ids["Sales"],
                    "position": "Sales Representative",
                    "hire_date": "2022-03-22",
                    "phone": "+1 555-456-7890",
                    "address": "789 Pine St, Sometown USA",
                    "employment_status": "Active"
                }
            ]
            
            # Add timestamps to all sample employees
            for emp in sample_employees:
                emp["created_at"] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Insert sample employees
            employees.insert_many(sample_employees)
            print(f"DEBUG: Created {len(sample_employees)} sample employees")
            
            # Requery to get the newly created employees
            cursor = employees.find(query_filter).sort(sort_field, sort_order)
            total_count = employees.count_documents(query_filter)
            print(f"DEBUG: Now found {total_count} total employees after creating samples")
        
        # Apply pagination
        results = list(cursor.skip(skip).limit(limit))
        print(f"DEBUG: Returning {len(results)} employees for page {page}")
        
        # Enhance employee data with department names and ensure consistent status field
        for employee in results:
            # Add department name if available
            if 'department_id' in employee and employee['department_id']:
                str_dept_id = str(employee['department_id'])
                if str_dept_id in all_departments:
                    dept = all_departments[str_dept_id]
                    employee['department_name'] = dept.get('name', 'Unknown')
                else:
                    employee['department_name'] = employee.get('department', 'Unknown')
            
            # Ensure status field is available
            if 'employment_status' not in employee and 'status' in employee:
                employee['employment_status'] = employee['status']
            elif 'employment_status' not in employee:
                employee['employment_status'] = 'Active'  # Default value

            # Resolve team name if team_id exists but team is missing
            if not employee.get('team') and employee.get('team_id'):
                try:
                    from bson import ObjectId as OId
                    t = teams_collection.find_one({'_id': OId(str(employee['team_id']))})
                    if t:
                        employee['team'] = t.get('name', '')
                except Exception:
                    pass
        
        # Serialize results
        serialized_results = [serialize_document(doc) for doc in results]
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        has_next = page < total_pages
        has_prev = page > 1
        
        # Prepare response
        response_data = {
            'results': serialized_results,
            'count': total_count,
            'page': page,
            'limit': limit,
            'pages': total_pages,
            'has_next': has_next,
            'has_prev': has_prev,
        }
        
        # Create response with CORS headers
        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        print("DEBUG: Returning successful response")
        return response
            
    except Exception as e:
        print(f"âŒ ERROR in list_employees: {str(e)}")
        print(f"âŒ Traceback: {import_traceback.format_exc()}")
        
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during employee list fetch',
            'message': str(e),
            'traceback': import_traceback.format_exc()
        }, status=500)
        
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response

@csrf_exempt
@require_http_methods(["GET"])
def get_employee(request, employee_id):
    """
    Retrieves a single employee by ID and enhances with manager/team context.
    
    Endpoint: GET /api/employees/{employee_id}/
    """
    try:
        # Try both string ID and ObjectId
        query = {'_id': employee_id}
        employee = employees.find_one(query)
        if not employee:
            try:
                query = {'_id': ObjectId(employee_id)}
                employee = employees.find_one(query)
            except:
                pass
                
        if not employee:
            # Try searching by employee_id field (e.g. EMP001)
            employee = employees.find_one({'employee_id': employee_id})
            
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # Serialize base document
        response_data = serialize_document(employee)
        
        # 1. ENHANCE: Add Reporting Manager details
        manager_id = employee.get('manager_id')
        if manager_id:
            try:
                # Find manager (could be ObjectId or string)
                manager_obj_id = manager_id if isinstance(manager_id, ObjectId) else (ObjectId(manager_id) if len(str(manager_id)) == 24 else None)
                m_query = {'_id': manager_obj_id} if manager_obj_id else {'employee_id': manager_id}
                manager = employees.find_one(m_query)
                if manager:
                    response_data['manager_name'] = f"{manager.get('first_name', '')} {manager.get('last_name', '')}".strip()
                    response_data['manager_id_str'] = str(manager['_id'])
            except:
                pass
        
        # 2. ENHANCE: Add Reporting Team (Direct Reports)
        current_emp_id = str(employee['_id'])
        current_physical_id = employee.get('employee_id')
        
        # Reports can be linked via physical employee_id OR MongoDB _id
        reports_query = {
            '$or': [
                {'manager_id': current_emp_id},
                {'manager_id': current_physical_id}
            ]
        }
        
        direct_reports_cursor = employees.find(reports_query).limit(50) # Limit for profile view
        direct_reports = []
        for dr in direct_reports_cursor:
            direct_reports.append({
                'id': str(dr['_id']),
                'name': f"{dr.get('first_name', '')} {dr.get('last_name', '')}".strip(),
                'position': dr.get('position', 'Employee'),
                'avatar': dr.get('profile_image', ''),
                'initials': f"{dr.get('first_name', 'E')[0]}{dr.get('last_name', 'P')[0]}".upper()
            })
            
        response_data['reporting_team'] = direct_reports
        response_data['reporting_team_count'] = employees.count_documents(reports_query)
        
        # Ensure emergency contact has proper structure - but keep data dynamic
        ec = employee.get('emergency_contact', {})
        if isinstance(ec, dict):
            response_data['emergency_contact_name'] = ec.get('name', '')
            response_data['emergency_contact_relationship'] = ec.get('relationship', '')
            response_data['emergency_contact_phone'] = ec.get('phone', '')
            response_data['personal_email'] = ec.get('personal_email', '')
            
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f"ERROR in get_employee view: {str(e)}")
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_role(['Admin', 'Manager'])
def create_employee(request):
    """
    Creates a new employee record.
    
    Endpoint: POST /api/employees/
    
    Request Body:
        {
            "first_name": string (required),
            "last_name": string (required),
            "email": string (required),
            "employee_id": string (required),
            "department_id": string (optional),
            "position": string (optional),
            "phone": string (optional),
            "address": string (optional),
            "hire_date": string (optional),
            "employment_status": string (optional, default: "Active"),
            ... additional fields
        }
    
    Response:
        {
            "message": "Employee created successfully",
            "id": string,
            "_id": string,
            ... all employee fields
        }
    
    Error Responses:
        - 400: Invalid request (missing required fields or invalid JSON)
        - 500: Server error
    
    Notes:
        - Automatically adds timestamps (created_at, updated_at)
        - Converts department_id to ObjectId for MongoDB
        - Ensures status/employment_status field consistency
    """
    try:
        print(f"ðŸ” BACKEND: Received employee creation request")
        # Parse JSON data
        try:
            data = json.loads(request.body)
            print(f"ðŸ” BACKEND: Parsed employee data: {data}")
        except json.JSONDecodeError:
            print(f"âŒ BACKEND: Invalid JSON data in request")
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Invalid JSON data'
            }, status=400)
        
        # Validate required fields
        is_valid, error_response = validate_required_fields(data, EMPLOYEE_REQUIRED_FIELDS)
        if not is_valid:
            print(f"âŒ BACKEND: Missing required fields")
            return error_response
            
        # Ensure status/employment_status field consistency
        if 'status' in data and 'employment_status' not in data:
            data['employment_status'] = data['status']
        elif 'employment_status' in data and 'status' not in data:
            data['status'] = data['employment_status']
        elif 'employment_status' not in data and 'status' not in data:
            # Set default status if neither is provided
            data['employment_status'] = 'Active'
            data['status'] = 'Active'
                
        # Convert numeric fields to correct types
        if 'salary' in data and data['salary']:
            try:
                data['salary'] = float(data['salary'])
            except ValueError:
                pass
                
        # We do NOT convert ID fields to ObjectId for insertion 
        # because schemas.py dictates bsonType "string" for relation IDs.
                    
        # Add timestamps
        now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        data['created_at'] = now
        data['updated_at'] = now
        
        # Insert into database
        print(f"ðŸ” BACKEND: Inserting employee into database")
        result = employees.insert_one(data)
        inserted_id = str(result.inserted_id)
        print(f"ðŸ” BACKEND: Employee created with ID: {inserted_id}")
        
        # Fetch the complete employee record to return
        new_employee = employees.find_one({"_id": result.inserted_id})
        if new_employee:
            # Create a proper response with the complete employee data
            response_data = {
                'message': 'Employee created successfully',
                'id': inserted_id,
                '_id': inserted_id,
                # Include all the employee data
                **serialize_document(new_employee)
            }
            print(f"ðŸ” BACKEND: Returning employee data: {response_data}")
            response = JsonResponse(response_data, status=201)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response
        else:
            # If the employee couldn't be found (very unlikely), return just the ID
            print(f"âš ï¸ BACKEND: Created employee not found in database")
            response = JsonResponse({
                'message': 'Employee created successfully',
                'id': inserted_id,
                '_id': inserted_id
            }, status=201)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response
            
    except Exception as e:
        print(f"âŒ BACKEND: Error creating employee: {str(e)}")
        print(f"âŒ BACKEND: Traceback: {import_traceback.format_exc()}")
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["PUT"])
@require_self_or_role(['Admin', 'Manager'])
def update_employee(request, employee_id):
    """
    Updates an employee record (full update).
    
    Endpoint: PUT /api/employees/{employee_id}/update/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
    
    Request Body:
        - Complete employee object with all fields
    
    Response:
        {
            "message": "Employee updated successfully",
            ... updated employee data
        }
    
    Error Responses:
        - 404: Employee not found
        - 400: Invalid request data
        - 500: Server error
    
    Notes:
        - Requires all fields to be provided (full replacement)
        - Updates 'updated_at' timestamp automatically
    """
    return employee_crud['update_item'](request, employee_id)

@csrf_exempt
@require_http_methods(["PATCH"])
@require_self_or_role(['Admin', 'Manager'])
def partial_update_employee(request, employee_id):
    """
    Updates an employee record (partial update).
    
    Endpoint: PATCH /api/employees/{employee_id}/partial/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
    
    Request Body:
        - Partial employee object with only fields to update
    
    Response:
        {
            "message": "Employee updated successfully",
            ... updated employee data
        }
    
    Error Responses:
        - 404: Employee not found
        - 400: Invalid request data
        - 500: Server error
    
    Notes:
        - Only updates the fields provided in the request
        - Updates 'updated_at' timestamp automatically
    """
    return employee_crud['partial_update_item'](request, employee_id)

@csrf_exempt
@require_http_methods(["DELETE"])
@require_role(['Admin'])
def delete_employee(request, employee_id):
    """
    Deletes an employee record.
    
    Endpoint: DELETE /api/employees/{employee_id}/delete/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
    
    Response:
        {
            "message": "Employee deleted successfully"
        }
    
    Error Responses:
        - 404: Employee not found
        - 500: Server error
    
    Notes:
        - Does not perform a soft delete; completely removes the record
        - Associated documents are not automatically deleted
    """
    return employee_crud['delete_item'](request, employee_id)

@csrf_exempt
@require_http_methods(["POST"])
def upload_document(request, employee_id):
    """
    Uploads a document for an employee.
    
    Endpoint: POST /api/employees/{employee_id}/documents/upload/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
    
    Form Data:
        - file: The document file to upload (required)
        - name: Document name (optional, defaults to file name)
        - description: Document description (optional)
        - category: Document category (optional, default: "general")
        - is_confidential: Boolean flag (optional, default: false)
        - tags: Comma-separated list of tags (optional)
    
    Response:
        {
            "message": "Document uploaded successfully",
            "document_id": string
        }
    
    Error Responses:
        - 404: Employee not found
        - 400: No file uploaded
        - 500: Server error
    
    Notes:
        - Files are stored in: {MEDIA_ROOT}/documents/{employee_id}/
        - Document metadata is stored in the documents collection
    """
    try:
        # Check if employee exists
        employee = employees.find_one({'_id': ObjectId(employee_id)})
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # Get file from request
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return JsonResponse({
                'error': 'Missing file',
                'message': 'No file was uploaded'
            }, status=400)
            
        # Get document metadata
        doc_name = request.POST.get('name', uploaded_file.name)
        doc_description = request.POST.get('description', '')
        doc_category = request.POST.get('category', 'general')
        is_confidential = request.POST.get('is_confidential', 'false').lower() == 'true'
        tags = request.POST.get('tags', '').split(',') if request.POST.get('tags') else []
        
        # Create documents directory if it doesn't exist
        documents_dir = os.path.join(settings.MEDIA_ROOT, 'documents', employee_id)
        os.makedirs(documents_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(documents_dir, uploaded_file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
                
        # Create document record
        document_data = {
            'employee_id': ObjectId(employee_id),
            'name': doc_name,
            'description': doc_description,
            'file_path': os.path.relpath(file_path, settings.MEDIA_ROOT),
            'file_type': uploaded_file.content_type,
            'file_size': uploaded_file.size,
            'upload_date': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'uploaded_by': request.session.get('user_id', None),  # Use session user ID if available
            'is_confidential': is_confidential,
            'tags': tags,
            'category': doc_category
        }
        
        # Insert document record
        result = documents.insert_one(document_data)
        
        return JsonResponse({
            'message': 'Document uploaded successfully',
            'document_id': str(result.inserted_id)
        }, status=201)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def list_documents(request, employee_id):
    """
    Lists documents for an employee.
    
    Endpoint: GET /api/employees/{employee_id}/documents/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
    
    Query Parameters:
        - category: Filter by document category (optional)
    
    Response:
        {
            "count": number_of_documents,
            "documents": [
                {
                    "_id": string,
                    "name": string,
                    "description": string,
                    "file_path": string,
                    "file_type": string,
                    "file_size": number,
                    "upload_date": string,
                    "category": string,
                    "is_confidential": boolean,
                    "tags": [string]
                }
            ]
        }
    
    Error Responses:
        - 404: Employee not found
        - 500: Server error
    """
    try:
        # Check if employee exists
        employee = employees.find_one({'_id': ObjectId(employee_id)})
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # Build query filter
        query_filter = {'employee_id': ObjectId(employee_id)}
        
        # Add category filter if specified
        category = request.GET.get('category')
        if category:
            query_filter['category'] = category
            
        # Get documents from database
        document_list = list(documents.find(query_filter))
        
        # Serialize for response
        response_data = [serialize_document(doc) for doc in document_list]
        
        return JsonResponse({
            'count': len(response_data),
            'documents': response_data
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def download_document(request, employee_id, document_id):
    """
    Downloads a document for an employee.
    
    Endpoint: GET /api/employees/{employee_id}/documents/{document_id}/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
        - document_id: The unique identifier of the document
    
    Response:
        - File content with appropriate content-type header
    
    Error Responses:
        - 404: Employee or document not found
        - 500: Server error
    
    Notes:
        - Returns the file content directly with the appropriate MIME type
        - Content-Disposition header is set for browser download
    """
    try:
        # Check if document exists
        document = documents.find_one({
            '_id': ObjectId(document_id),
            'employee_id': ObjectId(employee_id)
        })
        
        if not document:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Document with ID {document_id} not found for employee {employee_id}'
            }, status=404)
            
        # Get the file path
        file_path = os.path.join(settings.MEDIA_ROOT, document['file_path'])
        
        # Check if file exists
        if not os.path.isfile(file_path):
            return JsonResponse({
                'error': 'File not found',
                'message': 'The document file could not be found on the server'
            }, status=404)
            
        # Return file as attachment
        response = FileResponse(open(file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{document["name"]}"'
        response['Content-Type'] = document.get('file_type', 'application/octet-stream')
        
        return response
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_document(request, employee_id, document_id):
    """
    Deletes a document for an employee.
    
    Endpoint: DELETE /api/employees/{employee_id}/documents/{document_id}/delete/
    
    Path Parameters:
        - employee_id: The unique identifier of the employee
        - document_id: The unique identifier of the document
    
    Response:
        {
            "message": "Document deleted successfully"
        }
    
    Error Responses:
        - 404: Employee or document not found
        - 500: Server error
    
    Notes:
        - Deletes both the document file from the filesystem and the metadata record
    """
    try:
        # Check if document exists
        document = documents.find_one({
            '_id': ObjectId(document_id),
            'employee_id': ObjectId(employee_id)
        })
        
        if not document:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Document with ID {document_id} not found for employee {employee_id}'
            }, status=404)
            
        # Get the file path
        file_path = os.path.join(settings.MEDIA_ROOT, document['file_path'])
        
        # Delete the file if it exists
        if os.path.isfile(file_path):
            os.remove(file_path)
            
        # Delete the document record
        documents.delete_one({'_id': ObjectId(document_id)})
        
        return JsonResponse({
            'message': 'Document deleted successfully',
            'document_id': document_id
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

# Department CRUD endpoints
DEPARTMENT_REQUIRED_FIELDS = ['name']
DEPARTMENT_search_fields = ['name', 'description']

department_crud = create_crud_endpoints(
    collection=departments,
    required_fields=DEPARTMENT_REQUIRED_FIELDS,
    search_fields=DEPARTMENT_search_fields
)

@csrf_exempt
@require_http_methods(["GET"])
def list_departments(request):
    """
    Lists all departments.
    
    Endpoint: GET /api/employees/departments/
    
    Query Parameters:
        - search: Text search across department fields (optional)
        - page: Page number for pagination (default: 1)
        - limit: Number of results per page (default: 100)
    
    Response:
        {
            "results": [
                {
                    "_id": string,
                    "name": string,
                    "description": string,
                    ... additional department fields
                }
            ],
            "count": total_count,
            "page": current_page,
            "limit": items_per_page,
            "pages": total_pages,
            "has_next": boolean,
            "has_prev": boolean
        }
    """
    return department_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_department(request, department_id):
    """
    Retrieves a single department by ID.
    
    Endpoint: GET /api/employees/departments/{department_id}/
    
    Path Parameters:
        - department_id: The unique identifier of the department
    
    Response:
        {
            "_id": string,
            "name": string,
            "description": string,
            ... additional department fields
        }
    
    Error Responses:
        - 404: Department not found
        - 500: Server error
    """
    return department_crud['get_item'](request, department_id)

@csrf_exempt
@require_http_methods(["POST"])
@require_role(['Admin', 'Manager'])
def create_department(request):
    """
    Creates a new department.
    
    Endpoint: POST /api/employees/departments/new/
    
    Request Body:
        {
            "name": string (required),
            "description": string (optional),
            ... additional fields
        }
    
    Response:
        {
            "message": "Department created successfully",
            "id": string,
            "_id": string,
            ... all department fields
        }
    
    Error Responses:
        - 400: Invalid request (missing required fields or invalid JSON)
        - 500: Server error
    
    Notes:
        - Automatically adds timestamps (created_at)
    """
    return department_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
@require_role(['Admin', 'Manager'])
def update_department(request, department_id):
    """
    Updates a department (full update).
    
    Endpoint: PUT /api/employees/departments/{department_id}/update/
    
    Path Parameters:
        - department_id: The unique identifier of the department
    
    Request Body:
        - Complete department object with all fields
    
    Response:
        {
            "message": "Department updated successfully",
            ... updated department data
        }
    
    Error Responses:
        - 404: Department not found
        - 400: Invalid request data
        - 500: Server error
    """
    return department_crud['update_item'](request, department_id)

@csrf_exempt
@require_http_methods(["PATCH"])
@require_role(['Admin', 'Manager'])
def partial_update_department(request, department_id):
    """
    Updates a department (partial update).
    
    Endpoint: PATCH /api/employees/departments/{department_id}/partial/
    
    Path Parameters:
        - department_id: The unique identifier of the department
    
    Request Body:
        - Partial department object with only fields to update
    
    Response:
        {
            "message": "Department updated successfully",
            ... updated department data
        }
    
    Error Responses:
        - 404: Department not found
        - 400: Invalid request data
        - 500: Server error
    """
    return department_crud['partial_update_item'](request, department_id)

@csrf_exempt
@require_http_methods(["DELETE"])
@require_role(['Admin'])
def delete_department(request, department_id):
    """
    Deletes a department.
    
    Endpoint: DELETE /api/employees/departments/{department_id}/delete/
    
    Path Parameters:
        - department_id: The unique identifier of the department
    
    Response:
        {
            "message": "Department deleted successfully"
        }
    
    Error Responses:
        - 404: Department not found
        - 500: Server error
    
    Notes:
        - Does not check for or update employees in this department
        - Use with caution as it may leave employees with invalid department references
    """
    return department_crud['delete_item'](request, department_id)

@csrf_exempt
@require_http_methods(["GET"])
def get_department_employees(request, department_id):
    """
    Retrieves all employees in a specific department.
    
    Endpoint: GET /api/employees/departments/{department_id}/employees/
    
    Path Parameters:
        - department_id: The unique identifier of the department
    
    Response:
        {
            "count": number_of_employees,
            "employees": [
                {
                    "_id": string,
                    "first_name": string,
                    "last_name": string,
                    ... employee fields
                }
            ]
        }
    
    Error Responses:
        - 404: Department not found
        - 500: Server error
    """
    try:
        # Check if department exists
        department = departments.find_one({'_id': ObjectId(department_id)})
        if not department:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Department with ID {department_id} not found'
            }, status=404)
            
        # Get employees in department
        employee_list = list(employees.find({'department_id': ObjectId(department_id)}))
        
        # Serialize for response
        response_data = [serialize_document(emp) for emp in employee_list]
        
        return JsonResponse({
            'count': len(response_data),
            'employees': response_data
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def debug_employees(request):
    """
    Debug endpoint to directly return all employees.
    
    Endpoint: GET /api/employees/debug/
    
    Query Parameters:
        - direct_access: Set to 'true' to attempt direct database access (optional)
    
    Response:
        {
            "count": number_of_employees,
            "employees": [
                {
                    "_id": string,
                    "first_name": string,
                    "last_name": string,
                    ... all employee fields
                }
            ]
        }
    
    Error Responses:
        - 500: Server error
    
    Notes:
        - This is a diagnostic endpoint intended for troubleshooting only
        - Returns all employee records without pagination
        - If no employees exist, creates sample employee data
        - Includes detailed debug logging
    """
    try:
        # Additional debug info
        print("DEBUG: Received debug endpoint request")
        print(f"DEBUG: User agent: {request.META.get('HTTP_USER_AGENT', 'Not provided')}")
        print(f"DEBUG: Remote addr: {request.META.get('REMOTE_ADDR', 'Not provided')}")
        print(f"DEBUG: Headers: {dict(request.headers)}")
        
        # Get parameters for detailed debugging
        direct_access = request.GET.get('direct_access', 'false').lower() == 'true'
        print(f"DEBUG: direct_access={direct_access}")
        
        # Get all employees with no filters and no pagination
        print("DEBUG: Querying MongoDB for all employees")
        all_employees = list(employees.find())
        
        # Log count for debugging
        count = len(all_employees)
        print(f"DEBUG: Found {count} employees in database")
        
        # Inspect a sample employee for field verification
        if count > 0:
            sample = all_employees[0]
            print(f"DEBUG: Sample employee fields: {list(sample.keys())}")
            print(f"DEBUG: Sample employee status: {sample.get('employment_status', 'Not found')} and department_id: {sample.get('department_id', 'Not found')}")
        
        # If no employees found, create sample data
        if count == 0:
            print("No employees found, creating sample data...")
            
            # Create sample departments if they don't exist
            dept_ids = {}
            for dept_name in ["Engineering", "HR", "Marketing", "Sales", "Finance"]:
                existing_dept = departments.find_one({"name": dept_name})
                if existing_dept:
                    dept_ids[dept_name] = str(existing_dept["_id"])
                else:
                    result = departments.insert_one({
                        "name": dept_name,
                        "description": f"{dept_name} department",
                        "created_at": datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
                    })
                    dept_ids[dept_name] = str(result.inserted_id)
            
            # Sample employee data
            sample_employees = [
                {
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john.doe@example.com",
                    "employee_id": "EMP001",
                    "department": "Engineering",
                    "department_id": dept_ids["Engineering"],
                    "position": "Senior Developer",
                    "hire_date": "2021-01-15",
                    "phone": "+1 555-123-4567",
                    "address": "123 Main St, Anytown USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "email": "jane.smith@example.com",
                    "employee_id": "EMP002",
                    "department": "HR",
                    "department_id": dept_ids["HR"],
                    "position": "HR Manager",
                    "hire_date": "2020-05-10",
                    "phone": "+1 555-987-6543",
                    "address": "456 Oak Ave, Othertown USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Michael",
                    "last_name": "Johnson",
                    "email": "michael.johnson@example.com",
                    "employee_id": "EMP003",
                    "department": "Sales",
                    "department_id": dept_ids["Sales"],
                    "position": "Sales Representative",
                    "hire_date": "2022-03-22",
                    "phone": "+1 555-456-7890",
                    "address": "789 Pine St, Sometown USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Emily",
                    "last_name": "Brown",
                    "email": "emily.brown@example.com",
                    "employee_id": "EMP004",
                    "department": "Marketing",
                    "department_id": dept_ids["Marketing"],
                    "position": "Marketing Coordinator",
                    "hire_date": "2021-11-08",
                    "phone": "+1 555-789-0123",
                    "address": "321 Elm St, Anycity USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Robert",
                    "last_name": "Williams",
                    "email": "robert.williams@example.com",
                    "employee_id": "EMP005",
                    "department": "Finance",
                    "department_id": dept_ids["Finance"],
                    "position": "Financial Analyst",
                    "hire_date": "2020-09-15",
                    "phone": "+1 555-234-5678",
                    "address": "654 Maple Rd, Somewhere USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Sarah",
                    "last_name": "Miller",
                    "email": "sarah.miller@example.com",
                    "employee_id": "EMP006",
                    "department": "Engineering",
                    "department_id": dept_ids["Engineering"],
                    "position": "QA Engineer",
                    "hire_date": "2022-01-20",
                    "phone": "+1 555-345-6789",
                    "address": "987 Cedar Ln, Elsewhere USA",
                    "employment_status": "On Leave"
                },
                {
                    "first_name": "David",
                    "last_name": "Jones",
                    "email": "david.jones@example.com",
                    "employee_id": "EMP007",
                    "department": "Sales",
                    "department_id": dept_ids["Sales"],
                    "position": "Sales Manager",
                    "hire_date": "2019-07-12",
                    "phone": "+1 555-567-8901",
                    "address": "159 Walnut Ave, Anyplace USA",
                    "employment_status": "Active"
                },
                {
                    "first_name": "Jennifer",
                    "last_name": "Davis",
                    "email": "jennifer.davis@example.com",
                    "employee_id": "EMP008",
                    "department": "HR",
                    "department_id": dept_ids["HR"],
                    "position": "Recruiter",
                    "hire_date": "2021-06-30",
                    "phone": "+1 555-678-9012",
                    "address": "753 Birch Blvd, Somewhere USA",
                    "employment_status": "Active"
                }
            ]
            
            # Add timestamps to all sample employees
            for emp in sample_employees:
                emp["created_at"] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
            
            # Insert sample employees
            employees.insert_many(sample_employees)
            
            # Get the newly created employees
            all_employees = list(employees.find())
            count = len(all_employees)
            print(f"Created {count} sample employees")
        
        # Serialize results
        print("DEBUG: Serializing employee data")
        serialized_results = [serialize_document(doc) for doc in all_employees]
        
        # Return all employees without pagination
        print(f"DEBUG: Returning {len(serialized_results)} employees in the response")
        response_data = {
            'count': count,
            'employees': serialized_results,
            'debug_info': {
                'timestamp': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                'direct_access': direct_access,
                'departments_count': departments.count_documents({}),
                'request_headers': dict(request.headers)
            }
        }
        
        # Create response with CORS headers
        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        print("DEBUG: Returning successful debug response")
        return response
            
    except Exception as e:
        print(f"âŒ ERROR in debug_employees: {str(e)}")
        print(f"âŒ Traceback: {import_traceback.format_exc()}")
        
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during employee debug fetch',
            'message': str(e),
            'traceback': import_traceback.format_exc()
        }, status=500)
        
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response

@csrf_exempt
@require_http_methods(["GET"])
def list_departments_mongodb(request):
    """
    Lists all departments directly from MongoDB with optional filtering.
    
    Endpoint: GET /api/employees/departments/mongodb/
    
    Query Parameters:
        - search: Text search across department fields
        - page: Page number for pagination (default: 1)
        - limit: Number of results per page (default: 100)
        - Any field name can be used as a filter parameter
    
    Response:
        {
            "results": [{ department data }],
            "count": total_count,
            "page": current_page,
            "limit": items_per_page,
            "pages": total_pages,
            "has_next": boolean,
            "has_prev": boolean
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
            
        # Add any exact match filters
        excluded_params = ['page', 'limit', 'search', 'sort', 'order', '_t', 'cache']
        for key, value in request.GET.items():
            if key not in excluded_params:
                if key.endswith('_id') and value:
                    try:
                        # Convert to ObjectId if it's an ID field
                        query_filter[key] = ObjectId(value)
                    except:
                        query_filter[key] = value
                elif value:
                    query_filter[key] = value
        
        # Get sort parameters
        sort_field = request.GET.get('sort', 'name')
        sort_order = 1 if request.GET.get('order', 'asc') == 'asc' else -1
        
        # Execute query
        cursor = departments.find(query_filter).sort(sort_field, sort_order)
        
        # Apply pagination and get results
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 100))
        
        # Calculate skip (offset)
        skip = (page - 1) * limit
        
        # Count total documents (before pagination)
        total_count = departments.count_documents(query_filter)
        
        # Get paginated results
        results = list(cursor.skip(skip).limit(limit))
        
        # Serialize results and attach teams
        serialized_results = []
        for doc in results:
            dept_data = serialize_document(doc)
            dept_name = doc.get('name')
            if dept_name:
                # Find teams belonging to this department (searching both name and ID for consistency)
                dept_teams = list(teams_collection.find({
                    '$or': [
                        {'department': dept_name},
                        {'department_id': dept_name}
                    ]
                }))
                dept_data['teams'] = [serialize_document(t) for t in dept_teams]
            serialized_results.append(dept_data)
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        has_next = page < total_pages
        has_prev = page > 1
        
        # Prepare response
        response_data = {
            'results': serialized_results,
            'count': total_count,
            'page': page,
            'limit': limit,
            'pages': total_pages,
            'has_next': has_next,
            'has_prev': has_prev,
        }
        
        # Create response with CORS headers
        response = JsonResponse(response_data)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response
            
    except Exception as e:
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during department list fetch',
            'message': str(e)
        }, status=500)
        
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response
