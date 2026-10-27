
# Create your views here.

"""
Views for employee management
"""
import logging
import json
import os
import re
import uuid
import datetime
from bson import ObjectId
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import users, roles, employees, departments, documents, teams as teams_collection
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)
from utils.auth_utils import require_role, require_self_or_role, is_privileged, is_admin, owns_employee, forbidden, redact_employee, can_see_employee

# Define required fields for employee creation
EMPLOYEE_REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'employee_id']
PAN_RE = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]$')

# What an employee may change on their own profile. Everything else (pay, title, department, status, manager,
# identifiers) is HR's: those keys are ignored when a non-administrator sends them.
SELF_EDITABLE_FIELDS = {
    'phone', 'address', 'gender', 'date_of_birth', 'marital_status', 'about_me', 'bio', 'love_about_job',
    'interests_hobbies', 'skills', 'emergency_contact', 'emergency_contact_name', 'emergency_contact_phone',
    'emergency_contact_relationship', 'emergency_contact_email', 'personal_email', 'profile_image',
}
IMMUTABLE_FIELDS = {'_id', 'user_id', 'created_at'}
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def validate_employee_payload(data, exclude_id=None):
    """Returns a 400/409 JsonResponse when the fields are unacceptable, otherwise None."""
    def bad(message, status=400):
        return JsonResponse({'error': 'Invalid request', 'message': message}, status=status)

    for key in ('first_name', 'last_name'):
        if key in data and not str(data[key] or '').strip():
            return bad(f"{key.replace('_', ' ').capitalize()} cannot be empty")
    if 'email' in data:
        email = str(data['email'] or '').strip()
        if not EMAIL_RE.match(email):
            return bad('Enter a valid e-mail address')
        data['email'] = email
        clash = employees.find_one({'email': {'$regex': '^' + re.escape(email) + '$', '$options': 'i'}, '_id': {'$ne': exclude_id}})
        if clash:
            return bad('Another employee already uses this e-mail address', 409)
    if 'employee_id' in data:
        code = str(data['employee_id'] or '').strip()
        if not code:
            return bad('Employee ID cannot be empty')
        data['employee_id'] = code
        if employees.find_one({'employee_id': {'$regex': '^' + re.escape(code) + '$', '$options': 'i'}, '_id': {'$ne': exclude_id}}):
            return bad('Another employee already uses this employee ID', 409)
    if 'salary' in data and data['salary'] not in (None, ''):
        try:
            salary = float(data['salary'])
        except (TypeError, ValueError):
            return bad('Salary must be a number')
        if not 0 <= salary <= 1_000_000_000:
            return bad('Annual salary (CTC) must be between 0 and 100 crore rupees')
        data['salary'] = salary
    if data.get('tax_id'):
        pan = str(data['tax_id']).strip().upper()
        if not PAN_RE.match(pan):
            return bad('PAN must look like ABCDE1234F')
        data['tax_id'] = pan
    if data.get('date_of_birth'):
        try:
            born = datetime.date.fromisoformat(str(data['date_of_birth'])[:10])
        except ValueError:
            return bad('Date of birth must be a valid date (YYYY-MM-DD)')
        if not datetime.date(1940, 1, 1) <= born <= datetime.date.today() - datetime.timedelta(days=365 * 15):
            return bad('Date of birth is not plausible for an employee')
    if data.get('manager_id'):
        boss = employees.find_one({'_id': ObjectId(str(data['manager_id']))}) if ObjectId.is_valid(str(data['manager_id'])) else None
        if not boss:
            return bad('The chosen manager does not exist')
        if exclude_id is not None and str(boss['_id']) == str(exclude_id):
            return bad('Someone cannot report to themself')
    if data.get('hire_date'):
        try:
            hired = datetime.date.fromisoformat(str(data['hire_date'])[:10])
        except ValueError:
            return bad('Hire date must be a valid date (YYYY-MM-DD)')
        if hired > datetime.date.today() + datetime.timedelta(days=366):
            return bad('Hire date is too far in the future')
    return None


def _next_employee_code():
    """EMP-<n+1> where n is the highest number used by an existing EMP-<number> code."""
    highest = 0
    for doc in employees.find({'employee_id': {'$regex': r'^EMP-\d+$'}}, {'employee_id': 1}):
        highest = max(highest, int(doc['employee_id'].split('-')[1]))
    return f'EMP-{highest + 1}'


def _target_doc(employee_id):
    doc = None
    if len(str(employee_id)) == 24:
        try:
            doc = employees.find_one({'_id': ObjectId(employee_id)})
        except Exception:
            doc = None
    return doc or employees.find_one({'employee_id': employee_id})

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
        - Automatically adds department names based on department_id
    """
    try:

        # Build query filter from request parameters
        query_filter = {}
        
        # Handle text search
        search = request.GET.get('search', '')
        if search and EMPLOYEE_search_fields:
            search_conditions = []
            for field in EMPLOYEE_search_fields:
                search_conditions.append({field: {'$regex': re.escape(search[:60]), '$options': 'i'}})
            query_filter['$or'] = search_conditions
            
        # Only these fields can be filtered on (never pay, bank or personal fields, which would let anyone probe them)
        for key in ('department', 'department_id', 'team', 'team_id', 'position', 'manager_id', 'employment_type', 'employee_id'):
            value = request.GET.get(key)
            if value:
                query_filter[key] = value
        if request.GET.get('status'):
            query_filter['employment_status'] = request.GET['status']
        elif request.GET.get('employment_status'):
            query_filter['employment_status'] = request.GET['employment_status']
        
        # Get sort parameters
        sort_field = request.GET.get('sort', '_id') if request.GET.get('sort') in ('_id', 'first_name', 'last_name', 'hire_date', 'department', 'position', 'employee_id') else '_id'
        sort_order = 1 if request.GET.get('order', 'asc') == 'asc' else -1
        
        # Execute query
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
        
        # Apply pagination
        results = list(cursor.skip(skip).limit(limit))
        
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
        serialized_results = [redact_employee(request, serialize_document(doc)) for doc in results]
        
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
        
        return response
            
    except Exception as e:
        
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during employee list fetch',
            'message': str(e)
        }, status=500)
        
        
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
            
        # 3. ENHANCE: Add User Role info
        try:
            # Find user linked to this employee
            user_doc = users.find_one({'employee_id': current_physical_id})
            if not user_doc:
                # Try finding by MongoDB _id if physical ID missing
                user_doc = users.find_one({'employee_id': current_emp_id})
                
            if user_doc:
                response_data['role_id'] = user_doc.get('role_id', '')
                # Get role name for display
                if response_data['role_id']:
                    try:
                        role_doc = roles.find_one({'_id': ObjectId(response_data['role_id'])})
                        if role_doc:
                            response_data['role_name'] = role_doc.get('name', 'Employee')
                    except:
                        pass
        except:
            pass
            
        return JsonResponse(redact_employee(request, response_data))
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_role(['Admin'])
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
        # Parse JSON data
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'Invalid request',
                'message': 'Invalid JSON data'
            }, status=400)
        
        # the employee ID is optional: HR gets the next free number when it is left blank
        if not str(data.get('employee_id') or '').strip():
            data['employee_id'] = _next_employee_code()
        is_valid, error_response = validate_required_fields(data, EMPLOYEE_REQUIRED_FIELDS)
        if not is_valid:
            return error_response
        invalid = validate_employee_payload(data)
        if invalid:
            return invalid
        for key in IMMUTABLE_FIELDS - {'created_at'}:
            data.pop(key, None)
            
        # Ensure status/employment_status field consistency
        if 'status' in data and 'employment_status' not in data:
            data['employment_status'] = data['status']
        elif 'employment_status' in data and 'status' not in data:
            data['status'] = data['employment_status']
        elif 'employment_status' not in data and 'status' not in data:
            data['employment_status'] = 'Active'
            data['status'] = 'Active'

        # Add timestamps
        now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        data['created_at'] = now
        data['updated_at'] = now

        # Insert into database
        result = employees.insert_one(data)
        inserted_id = str(result.inserted_id)

        # --- SYNC WITH TEAMS (members, member cards and the person's own team fields all stay in step) ---
        team_ref = data.get('team_id') or data.get('team')
        if team_ref:
            try:
                from teams.views import _apply_members
                from bson import ObjectId as OId
                team_doc = teams_collection.find_one({'_id': OId(str(data['team_id']))}) if data.get('team_id') else teams_collection.find_one({'name': data.get('team')})
                if team_doc:
                    ids = [str(m) for m in team_doc.get('members', [])] + [inserted_id]
                    cards = _apply_members(team_doc['_id'], team_doc['name'], team_doc.get('department', ''), ids,
                                           team_doc.get('leader_id'), team_doc.get('manager_id'))
                    teams_collection.update_one({'_id': team_doc['_id']}, {'$set': {'employees': cards, 'members': [c['id'] for c in cards]}})
            except Exception as e:
                logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)

        new_employee = employees.find_one({'_id': result.inserted_id})
        try:
            from onboarding.views import start_onboarding
            from utils.events import emit
            if new_employee:
                start_onboarding(new_employee)
                emit('employee.created', {'employee_id': new_employee.get('employee_id'), 'id': inserted_id,
                                          'name': f"{new_employee.get('first_name', '')} {new_employee.get('last_name', '')}".strip(),
                                          'email': new_employee.get('email')})
        except Exception as e:
            logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)
        if new_employee:
            return JsonResponse({
                'message': 'Employee created successfully',
                'id': inserted_id,
                '_id': inserted_id,
                **serialize_document(new_employee)
            }, status=201)
        return JsonResponse({'message': 'Employee created successfully', 'id': inserted_id}, status=201)

    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["PUT"])
@require_role(['Admin'])
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
    try:
        data = json.loads(request.body)
    except ValueError:
        return JsonResponse({'error': 'Invalid request', 'message': 'Invalid JSON data'}, status=400)
    target = _target_doc(employee_id)
    invalid = validate_employee_payload(data, exclude_id=target['_id'] if target else None)
    if invalid:
        return invalid
    for key in IMMUTABLE_FIELDS:
        data.pop(key, None)
    request._body = json.dumps(data).encode()
    return employee_crud['update_item'](request, employee_id)

@csrf_exempt
@require_http_methods(["PATCH"])
@require_self_or_role(['Admin'])
def partial_update_employee(request, employee_id):
    """
    Updates an employee record (partial update).
    
    Endpoint: PATCH /api/employees/{employee_id}/partial/
    """
    try:
        data = json.loads(request.body)
        user_role = (getattr(request, 'role', '') or '').strip().lower()
        is_admin = user_role in ['admin', 'administrator']
        target = _target_doc(employee_id)
        if not is_admin:
            data = {k: v for k, v in data.items() if k in SELF_EDITABLE_FIELDS}      # everything else is HR's
        invalid = validate_employee_payload(data, exclude_id=target['_id'] if target else None)
        if invalid:
            return invalid
        for key in IMMUTABLE_FIELDS:
            data.pop(key, None)
        request._body = json.dumps(data).encode()
        
        # 1. DEFINE RESTRICTED FIELDS (Only Admin can change role_id or employee_id)
        RESTRICTED_FIELDS = ['role_id', 'employee_id']
        
        # 2. CHECK FOR UNAUTHORIZED UPDATES
        if not is_admin:
            restricted_fields_attempted = [
                f for f in RESTRICTED_FIELDS
                if f in data and data[f] not in (None, '', [], {})
            ]
            
            if restricted_fields_attempted:
                return JsonResponse({
                    'error': 'Unauthorized',
                    'message': f'Only Administrators can modify system identifier/role fields: {", ".join(restricted_fields_attempted)}'
                }, status=403)
                
        # 3. HANDLE ROLE SYNC (If Admin is changing the role)
        if 'role_id' in data and is_admin:
            try:
                emp_query = {}
                try:
                    emp_query = {'_id': ObjectId(employee_id)}
                except Exception:
                    emp_query = {'employee_id': employee_id}
                
                employee = employees.find_one(emp_query)
                if employee:
                    emp_physical_id = employee.get('employee_id')
                    user_doc = None
                    if emp_physical_id:
                        user_doc = users.find_one({'employee_id': emp_physical_id})
                    if not user_doc:
                        user_doc = users.find_one({'employee_id': str(employee['_id'])})
                    if not user_doc and employee.get('email'):
                        user_doc = users.find_one({'email': employee.get('email')})
                    
                    if user_doc:
                        users.update_one(
                            {'_id': user_doc['_id']},
                            {'$set': {'role_id': data['role_id']}}
                        )
            except Exception as e:
                logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)
                
    except Exception:
        pass
        
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

ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg'}
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024


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
    if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
        return forbidden()
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
            
        # Only accept sensible document types and sizes
        extension = os.path.splitext(uploaded_file.name)[1].lower()
        if extension not in ALLOWED_DOCUMENT_EXTENSIONS:
            return JsonResponse({
                'error': 'Unsupported file type',
                'message': f"Allowed types: {', '.join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))}"
            }, status=400)
        if uploaded_file.size > MAX_DOCUMENT_BYTES:
            return JsonResponse({
                'error': 'File too large',
                'message': f'Documents can be at most {MAX_DOCUMENT_BYTES // (1024 * 1024)} MB'
            }, status=413)

        # Get document metadata
        doc_name = request.POST.get('name', uploaded_file.name)
        doc_description = request.POST.get('description', '')
        doc_category = request.POST.get('category', 'general')
        is_confidential = request.POST.get('is_confidential', 'false').lower() == 'true'
        tags = request.POST.get('tags', '').split(',') if request.POST.get('tags') else []
        expires_on = (request.POST.get('expires_on') or '').strip()
        
        # Create documents directory if it doesn't exist
        documents_dir = os.path.join(settings.MEDIA_ROOT, 'documents', employee_id)
        os.makedirs(documents_dir, exist_ok=True)
        
        # Save file
        # unique stored name: never overwrite an earlier upload with the same file name
        stored_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(uploaded_file.name)}"
        file_path = os.path.join(documents_dir, stored_name)
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
            'category': doc_category,
            'expires_on': expires_on,
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
    if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
        return forbidden()
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
    if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
        return forbidden()
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
    if not is_admin(request):
        return forbidden('Only HR / administrators can delete documents.')
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
@require_role(['Admin'])
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
@require_role(['Admin'])
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
@require_role(['Admin'])
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
        - Includes detailed debug logging
    """
    if (getattr(request, 'role', '') or '') not in ('Admin', 'Manager', 'HR'):
        return JsonResponse({'error': 'Forbidden', 'message': 'Admin or Manager role required.'}, status=403)
    try:
        # Additional debug info
        
        # Get parameters for detailed debugging
        direct_access = request.GET.get('direct_access', 'false').lower() == 'true'
        
        # Get all employees with no filters and no pagination
        all_employees = list(employees.find())
        
        # Log count for debugging
        count = len(all_employees)
        
        # Serialize results
        serialized_results = [serialize_document(doc) for doc in all_employees]
        
        # Return all employees without pagination
        response_data = {
            'count': count,
            'employees': serialized_results,
            'debug_info': {
                'timestamp': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                'direct_access': direct_access,
                'departments_count': departments.count_documents({}),
            }
        }
        
        # Create response with CORS headers
        response = JsonResponse(response_data)
        
        return response
            
    except Exception as e:
        
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during employee debug fetch',
            'message': str(e)
        }, status=500)
        
        
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
        
        return response
            
    except Exception as e:
        # Create error response with CORS headers
        response = JsonResponse({
            'error': 'Server error during department list fetch',
            'message': str(e)
        }, status=500)
        
        
        return response
