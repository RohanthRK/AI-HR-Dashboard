
# Create your views here.

"""
Authentication views for the HR Dashboard application
"""
import json
import datetime
import jwt
import hashlib
from bson import ObjectId
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import check_password, make_password

from hr_backend.db import users, roles, employees, db

login_attempts = db['LoginAttempts']
MAX_FAILED_LOGINS = 5
MIN_PASSWORD_LENGTH = 8
LOCKOUT_MINUTES = 15


def _client_key(request, username):
    ip = (request.META.get('HTTP_X_FORWARDED_FOR', '') or request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()
    return f"{(username or '').lower()}|{ip}"


def _locked_out(key):
    doc = login_attempts.find_one({'_id': key})
    if not doc or doc.get('count', 0) < MAX_FAILED_LOGINS:
        return False
    until = doc.get('locked_until')
    if until and until.replace(tzinfo=datetime.timezone.utc) > datetime.datetime.now(tz=datetime.timezone.utc):
        return True
    login_attempts.delete_one({'_id': key})
    return False


def _record_failure(key):
    doc = login_attempts.find_one_and_update(
        {'_id': key}, {'$inc': {'count': 1}}, upsert=True, return_document=True)
    if doc.get('count', 0) >= MAX_FAILED_LOGINS:
        login_attempts.update_one({'_id': key}, {'$set': {
            'locked_until': datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(minutes=LOCKOUT_MINUTES)}})

def hash_password(password):
    """Hash a password using Django's password hasher"""
    return make_password(password)

def build_session(user):
    """JWT + user info for a Users document (used by password login and SSO)."""
    # Generate JWT token
    expiry = datetime.datetime.now(tz=datetime.timezone.utc) + settings.JWT_EXPIRATION_DELTA
    
    # Get role name
    role_name = 'Employee' # Default
    if user.get('role_id'):
        role_doc = roles.find_one({'_id': ObjectId(user['role_id'])})
        if role_doc:
            role_name = role_doc.get('name', 'Employee')
    
    # Get employee additional details
    employee_data = {}
    emp_query = {'$or': []}
    if user.get('employee_id'):
        emp_query['$or'].append({'employee_id': user['employee_id']})
        try:
            emp_query['$or'].append({'_id': ObjectId(user['employee_id'])})
        except Exception:
            pass
    if user.get('email'):
        emp_query['$or'].append({'email': user['email']})
    if user.get('_id'):
        emp_query['$or'].append({'user_id': str(user['_id'])})
        emp_query['$or'].append({'user_id': user['_id']})
        
    emp_doc = employees.find_one(emp_query) if emp_query['$or'] else None
    if emp_doc:
        employee_data = {
            'first_name': emp_doc.get('first_name', ''),
            'last_name': emp_doc.get('last_name', ''),
            'department': emp_doc.get('department', ''),
            'team': emp_doc.get('team', ''),
            'department_id': str(emp_doc.get('department_id', '')),
            'team_id': str(emp_doc.get('team_id', '')),
            'employee_code': emp_doc.get('employee_id', '')
        }
    
    payload = {
        'user_id': str(user['_id']),
        'username': user['username'],
        'email': user.get('email', ''),
        'role': role_name,
        'employee_id': user.get('employee_id', '') or (str(emp_doc['_id']) if emp_doc else ''),
        'exp': expiry,
        **employee_data
    }
    
    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    user_info = {
            'id': str(user['_id']),
            'username': user['username'],
            'role': role_name,
            'email': user.get('email', ''),
            'employee_id': user.get('employee_id', '') or (str(emp_doc['_id']) if emp_doc else ''),
            'expires': expiry.isoformat(),
            **employee_data
        }
    return token, user_info


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """
    Login endpoint that validates credentials and issues JWT token
    Endpoint: POST /api/auth/login
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'error': 'Missing credentials',
                'message': 'Username and password are required'
            }, status=400)
            
        throttle_key = _client_key(request, username)
        if _locked_out(throttle_key):
            return JsonResponse({
                'error': 'Too many attempts',
                'message': f'Too many failed logins. Try again in {LOCKOUT_MINUTES} minutes.'
            }, status=429)

        # Find user in MongoDB
        user = users.find_one({'username': username})
        
        if not user:
            _record_failure(throttle_key)
            return JsonResponse({
                'error': 'Unauthorized',
                'message': 'Invalid username or password'
            }, status=401)
            
        # Check password
        # Support both SHA256 (from seed) and Django's make_password (new users)
        is_valid = False
        stored_password = user.get('password') or user.get('password_hash')
        
        if not stored_password:
            return JsonResponse({
                'error': 'Config error',
                'message': 'User has no password set'
            }, status=500)
            
        # 1. Try Django's check_password (pbkdf2, etc.)
        try:
            is_valid = check_password(password, stored_password)
        except:
            is_valid = False
            
        # 2. Try SHA256 if standard check fails (for legacy/seed users)
        if not is_valid:
            sha256_hash = hashlib.sha256(password.encode()).hexdigest()
            if sha256_hash == stored_password:
                is_valid = True
                # Automatically upgrade password to more secure hash
                users.update_one(
                    {'_id': user['_id']},
                    {'$set': {'password': hash_password(password)}}
                )
        
        if not is_valid:
            _record_failure(throttle_key)
            return JsonResponse({
                'error': 'Unauthorized',
                'message': 'Invalid username or password'
            }, status=401)
            
        login_attempts.delete_one({'_id': throttle_key})

        token, user_info = build_session(user)
        return JsonResponse({'token': token, 'user': user_info})
        
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

@csrf_exempt
@require_http_methods(["GET"])
def get_roles(request):
    """
    Get all available roles
    Admin only.
    Endpoint: GET /api/auth/roles
    """
    try:
        if getattr(request, 'role', '') != 'Admin':
            return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can manage roles.'}, status=403)
        # Get all roles from MongoDB
        all_roles = list(roles.find())
        
        # Convert ObjectId to string for serialization
        for role in all_roles:
            role['_id'] = str(role['_id'])
            
        return JsonResponse({
            'roles': all_roles
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def create_role(request):
    """
    Create a new role
    Admin only.
    Endpoint: POST /api/auth/roles
    """
    try:
        if getattr(request, 'role', '') != 'Admin':
            return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can manage roles.'}, status=403)
        # Parse JSON data
        data = json.loads(request.body)
        name = data.get('name')
        permissions = data.get('permissions', {})
        
        # Validate required fields
        if not name:
            return JsonResponse({
                'error': 'Missing data',
                'message': 'Role name is required'
            }, status=400)
            
        # Check if role already exists
        existing_role = roles.find_one({'name': name})
        if existing_role:
            return JsonResponse({
                'error': 'Role exists',
                'message': f'Role {name} already exists'
            }, status=409)
            
        # Create new role
        new_role = {
            'name': name,
            'permissions': permissions,
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
        
        result = roles.insert_one(new_role)
        
        return JsonResponse({
            'message': 'Role created successfully',
            'role_id': str(result.inserted_id)
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

@csrf_exempt
@require_http_methods(["PUT"])
def update_role(request, role_id):
    """
    Update an existing role
    Admin only.
    Endpoint: PUT /api/auth/roles/{role_id}
    """
    try:
        if getattr(request, 'role', '') != 'Admin':
            return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can manage roles.'}, status=403)
        # Parse JSON data
        data = json.loads(request.body)
        name = data.get('name')
        permissions = data.get('permissions')
        
        # Validate required fields
        if not name and not permissions:
            return JsonResponse({
                'error': 'Missing data',
                'message': 'No update data provided'
            }, status=400)
            
        # Check if role exists
        existing_role = roles.find_one({'_id': ObjectId(role_id)})
        if not existing_role:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Role with ID {role_id} not found'
            }, status=404)
            
        # Update role
        update_data = {}
        if name:
            update_data['name'] = name
        if permissions:
            update_data['permissions'] = permissions
            
        update_data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        
        roles.update_one(
            {'_id': ObjectId(role_id)},
            {'$set': update_data}
        )
        
        return JsonResponse({
            'message': 'Role updated successfully'
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

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_role(request, role_id):
    """
    Delete a role
    Admin only.
    Endpoint: DELETE /api/auth/roles/{role_id}
    """
    try:
        if getattr(request, 'role', '') != 'Admin':
            return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can manage roles.'}, status=403)
        # Check if role exists
        existing_role = roles.find_one({'_id': ObjectId(role_id)})
        if not existing_role:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Role with ID {role_id} not found'
            }, status=404)
            
        # Check if any users have this role
        user_count = users.count_documents({'role_id': role_id})
        if user_count > 0:
            return JsonResponse({
                'error': 'Role in use',
                'message': f'Role is assigned to {user_count} users and cannot be deleted'
            }, status=409)
            
        # Delete role
        roles.delete_one({'_id': ObjectId(role_id)})
        
        return JsonResponse({
            'message': 'Role deleted successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """
    Register a new user (Restricted to Admin)
    Endpoint: POST /api/auth/register
    """
    # Security: Only Admin can create new users
    user_role = getattr(request, 'role', '') or ''
    if user_role.strip().lower() != 'admin':
        return JsonResponse({
            'error': 'Forbidden',
            'message': f'Only administrators can create new user credentials. Your role: {user_role or "unknown"}'
        }, status=403)

    try:
        # Parse JSON data
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        role_id = data.get('role_id', '').strip()
        
        # Validate required fields
        if not username or not password or not email:
            return JsonResponse({
                'error': 'Missing data',
                'message': 'Username, password, and email are required'
            }, status=400)
        if len(password) < MIN_PASSWORD_LENGTH:
            return JsonResponse({
                'error': 'Invalid password',
                'message': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'
            }, status=400)
            
        # Check if username already exists
        if users.find_one({'username': username}):
            return JsonResponse({
                'error': 'Conflict',
                'message': f'Username "{username}" is already taken. Please choose a different username.'
            }, status=409)

        # Check if email already exists
        if users.find_one({'email': email}):
            return JsonResponse({
                'error': 'Conflict',
                'message': f'An account with email "{email}" already exists.'
            }, status=409)
            
        # Validate role ID
        role_name = 'Employee'
        if not role_id:
            # Default to Employee role
            role_doc = roles.find_one({'name': 'Employee'})
            role_id = str(role_doc['_id']) if role_doc else None
        
        if role_id:
            try:
                role_doc = roles.find_one({'_id': ObjectId(role_id)})
                if not role_doc:
                    return JsonResponse({
                        'error': 'Invalid role',
                        'message': f'Role with ID {role_id} not found'
                    }, status=400)
                role_name = role_doc.get('name', 'Employee')
            except Exception:
                return JsonResponse({'error': 'Invalid ID', 'message': 'Invalid role ID format'}, status=400)

        employee_id = data.get('employee_id', '') # New linkage field
            
        # Create new user
        new_user = {
            'username': username,
            'password': hashlib.sha256(password.encode()).hexdigest(),  # SHA256 for login compat
            'password_hash': hash_password(password),                    # Django hash as backup
            'email': email,
            'role_id': role_id,
            'employee_id': employee_id,
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'active': True
        }
        
        result = users.insert_one(new_user)
        
        return JsonResponse({
            'message': f'User "{username}" registered successfully with role {role_name}',
            'user_id': str(result.inserted_id)
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid request',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        import logging
        logging.error(f'Register error: {type(e).__name__}: {e}')
        # Handle MongoDB duplicate key errors gracefully
        err_str = str(e)
        if 'duplicate key' in err_str.lower() or 'E11000' in err_str:
            if 'username' in err_str:
                return JsonResponse({'error': 'Conflict', 'message': 'Username already exists'}, status=409)
            if 'email' in err_str:
                return JsonResponse({'error': 'Conflict', 'message': 'Email is already registered'}, status=409)
            return JsonResponse({'error': 'Conflict', 'message': 'A user with these details already exists'}, status=409)
        return JsonResponse({
            'error': 'Server error',
            'message': err_str
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_users(request):
    """
    Get all users (Restricted to Admin)
    Endpoint: GET /api/auth/users
    """
    # Security: Only Admin can list users
    if getattr(request, 'role', '').lower() != 'admin':
        return JsonResponse({
            'error': 'Forbidden',
            'message': 'Only administrators can view the user list'
        }, status=403)

    try:
        # Fetch all users from MongoDB
        all_users = list(users.find())
        
        # Prepare response data
        user_list = []
        for user in all_users:
            # Get role name
            role_name = 'Employee'
            if user.get('role_id'):
                try:
                    role_doc = roles.find_one({'_id': ObjectId(user['role_id'])})
                    if role_doc:
                        role_name = role_doc.get('name', 'Employee')
                except:
                    pass
            
            # Get employee details
            employee_details = {}
            emp_doc = None
            if user.get('employee_id'):
                try:
                    emp_query = {}
                    try:
                        emp_query = {'_id': ObjectId(user['employee_id'])}
                    except Exception:
                        emp_query = {'employee_id': user['employee_id']}
                        
                    emp_doc = employees.find_one(emp_query)
                    if not emp_doc:
                        emp_doc = employees.find_one({'employee_id': user['employee_id']})
                except Exception:
                    pass

            # Fallback lookup by email if not found yet
            if not emp_doc and user.get('email'):
                try:
                    emp_doc = employees.find_one({'email': user.get('email')})
                except Exception:
                    pass

            if emp_doc:
                employee_details = {
                    'first_name': emp_doc.get('first_name', ''),
                    'last_name': emp_doc.get('last_name', ''),
                    'position': emp_doc.get('position', ''),
                    'department': emp_doc.get('department_name', emp_doc.get('department', '')),
                    'phone': emp_doc.get('phone', ''),
                    'employee_code': emp_doc.get('employee_id', '')
                }

            user_list.append({
                'id': str(user['_id']),
                'username': user.get('username'),
                'email': user.get('email'),
                'role_id': user.get('role_id'),
                'role_name': role_name,
                'employee_id': user.get('employee_id') or (str(emp_doc.get('_id')) if emp_doc else ''),
                'active': user.get('active', True),
                'created_at': user.get('created_at'),
                **employee_details
            })
            
        return JsonResponse({'users': user_list})
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
def update_user(request, user_id):
    """
    Update user credentials (Restricted to Admin)
    Endpoint: PUT /api/auth/users/{user_id}
    """
    if getattr(request, 'role', '').lower() != 'admin':
        return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can update users'}, status=403)

    try:
        data = json.loads(request.body)
        
        # Build update document
        update_data = {}
        if 'email' in data:
            update_data['email'] = data['email']
        if 'role_id' in data:
            update_data['role_id'] = data['role_id']
        if 'active' in data:
            update_data['active'] = data['active']
        if 'employee_id' in data:
            update_data['employee_id'] = data['employee_id']
            
        if not update_data:
            return JsonResponse({'error': 'No data provided'}, status=400)
            
        update_data['updated_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        
        result = users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
            
        return JsonResponse({'message': 'User updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_user(request, user_id):
    """
    Delete user credentials (Restricted to Admin)
    Endpoint: DELETE /api/auth/users/{user_id}
    """
    if getattr(request, 'role', '').lower() != 'admin':
        return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can delete users'}, status=403)

    try:
        result = users.delete_one({'_id': ObjectId(user_id)})
        
        if result.deleted_count == 0:
            return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
            
        return JsonResponse({'message': 'User deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def reset_password(request, user_id):
    """
    Reset user password (Restricted to Admin)
    Endpoint: POST /api/auth/users/{user_id}/reset-password
    """
    if getattr(request, 'role', '').lower() != 'admin':
        return JsonResponse({'error': 'Forbidden', 'message': 'Only administrators can reset passwords'}, status=403)

    try:
        data = json.loads(request.body)
        new_password = data.get('password')
        
        if not new_password:
            return JsonResponse({'error': 'Missing data', 'message': 'New password is required'}, status=400)
            
        if len(new_password) < MIN_PASSWORD_LENGTH:
            return JsonResponse({'error': 'Invalid password',
                                 'message': f'Password must be at least {MIN_PASSWORD_LENGTH} characters'}, status=400)

        # Only a salted Django hash is stored (older accounts may still carry an unsalted legacy hash; drop it)
        result = users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'password': make_password(new_password),
                      'updated_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()},
             '$unset': {'password_hash': ''}}
        )
        
        if result.matched_count == 0:
            return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
            
        return JsonResponse({'message': 'Password reset successfully'})
        
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)


@csrf_exempt
def roles_handler(request):
    """Combined handler for GET (list) and POST (create) on /roles/"""
    if request.method == 'GET':
        return get_roles(request)
    elif request.method == 'POST':
        return create_role(request)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def role_detail_handler(request, role_id):
    """Combined handler for PUT/PATCH (update) and DELETE on /roles/<role_id>/"""
    if request.method in ('PUT', 'PATCH'):
        return update_role(request, role_id)
    elif request.method == 'DELETE':
        return delete_role(request, role_id)
    return JsonResponse({'error': 'Method not allowed'}, status=405)



@csrf_exempt
@require_http_methods(["POST"])
def refresh_token(request):
    """
    POST /api/auth/refresh/ - exchange a still-valid token for a fresh one.
    The middleware has already verified the presented token, so expired tokens cannot be refreshed.
    """
    payload = dict(getattr(request, 'user_info', {}) or {})
    user = None
    try:
        user = users.find_one({'_id': ObjectId(request.user_id)})
    except Exception:
        pass
    if not user or user.get('active') is False:
        return JsonResponse({'error': 'Unauthorized', 'message': 'Account not found or disabled'}, status=401)
    expiry = datetime.datetime.now(tz=datetime.timezone.utc) + settings.JWT_EXPIRATION_DELTA
    payload['exp'] = expiry
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return JsonResponse({'token': token, 'expires': expiry.isoformat()})


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def profile(request):
    """
    GET /api/auth/profile/ - the logged-in user's account.
    PUT /api/auth/profile/ - update own email.
    """
    try:
        user = users.find_one({'_id': ObjectId(request.user_id)})
    except Exception:
        user = None
    if not user:
        return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
    if request.method == 'PUT':
        try:
            body = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        email = (body.get('email') or '').strip()
        if email:
            if users.find_one({'email': email, '_id': {'$ne': user['_id']}}):
                return JsonResponse({'error': 'Conflict', 'message': 'Email already in use'}, status=409)
            users.update_one({'_id': user['_id']}, {'$set': {'email': email}})
            user['email'] = email
    return JsonResponse({
        'id': str(user['_id']), 'username': user.get('username'), 'email': user.get('email', ''),
        'role': request.role, 'employee_id': str(getattr(request, 'employee_id', '') or ''),
    })


@csrf_exempt
@require_http_methods(["POST"])
def change_password(request):
    """POST /api/auth/change-password/ {current_password, new_password}"""
    try:
        body = json.loads(request.body or '{}')
        user = users.find_one({'_id': ObjectId(request.user_id)})
    except Exception:
        return JsonResponse({'error': 'Invalid request'}, status=400)
    if not user:
        return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
    current, new = body.get('current_password') or '', body.get('new_password') or ''
    stored = user.get('password') or user.get('password_hash') or ''
    valid = False
    try:
        valid = check_password(current, stored)
    except Exception:
        pass
    if not valid and hashlib.sha256(current.encode()).hexdigest() == stored:
        valid = True
    if not valid:
        return JsonResponse({'error': 'Unauthorized', 'message': 'Current password is incorrect'}, status=401)
    if len(new) < MIN_PASSWORD_LENGTH:
        return JsonResponse({'error': 'Invalid password', 'message': 'New password must be at least 8 characters'}, status=400)
    if new == current:
        return JsonResponse({'error': 'Invalid password', 'message': 'Choose a password different from the current one'}, status=400)
    users.update_one({'_id': user['_id']}, {'$set': {'password': hash_password(new)}, '$unset': {'password_hash': ''}})
    return JsonResponse({'success': True, 'message': 'Password updated'})
