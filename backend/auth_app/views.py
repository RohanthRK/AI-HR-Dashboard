from django.shortcuts import render

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

from hr_backend.db import users, roles

def hash_password(password):
    """Hash a password using Django's password hasher"""
    return make_password(password)

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
            
        # Find user in MongoDB
        user = users.find_one({'username': username})
        
        if not user:
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
            return JsonResponse({
                'error': 'Unauthorized',
                'message': 'Invalid username or password'
            }, status=401)
            
        # Generate JWT token
        expiry = datetime.datetime.now(tz=datetime.timezone.utc) + settings.JWT_EXPIRATION_DELTA
        
        # Get role name
        role_name = 'Employee' # Default
        if user.get('role_id'):
            role_doc = roles.find_one({'_id': ObjectId(user['role_id'])})
            if role_doc:
                role_name = role_doc.get('name', 'Employee')
        
        payload = {
            'user_id': str(user['_id']),
            'username': user['username'],
            'role': role_name,
            'employee_id': user.get('employee_id', ''),
            'exp': expiry
        }
        
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        
        # Return token and user info
        return JsonResponse({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'role': role_name,
                'email': user.get('email', ''),
                'employee_id': user.get('employee_id', ''),
                'expires': expiry.isoformat()
            }
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
@require_http_methods(["GET"])
def get_roles(request):
    """
    Get all available roles
    MODIFIED: Permission check disabled for development
    Endpoint: GET /api/auth/roles
    """
    try:
        # DEVELOPMENT MODE: No permission check required
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
    MODIFIED: Permission check disabled for development
    Endpoint: POST /api/auth/roles
    """
    try:
        # DEVELOPMENT MODE: No permission check required
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
    MODIFIED: Permission check disabled for development
    Endpoint: PUT /api/auth/roles/{role_id}
    """
    try:
        # DEVELOPMENT MODE: No permission check required
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
    MODIFIED: Permission check disabled for development
    Endpoint: DELETE /api/auth/roles/{role_id}
    """
    try:
        # DEVELOPMENT MODE: No permission check required
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
    Register a new user
    Endpoint: POST /api/auth/register
    """
    try:
        # Parse JSON data
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        role_id = data.get('role_id')
        
        # Validate required fields
        if not username or not password or not email:
            return JsonResponse({
                'error': 'Missing data',
                'message': 'Username, password, and email are required'
            }, status=400)
            
        # Check if username already exists
        existing_user = users.find_one({'username': username})
        if existing_user:
            return JsonResponse({
                'error': 'Username taken',
                'message': 'Username already exists'
            }, status=409)
            
        # Validate role ID if provided
        if role_id:
            role = roles.find_one({'_id': ObjectId(role_id)})
            if not role:
                return JsonResponse({
                    'error': 'Invalid role',
                    'message': f'Role with ID {role_id} not found'
                }, status=400)
        else:
            # Default to Employee role
            default_role = roles.find_one({'name': 'Employee'})
            role_id = str(default_role['_id']) if default_role else None
            
        # Create new user
        new_user = {
            'username': username,
            'password_hash': hash_password(password),
            'email': email,
            'role_id': role_id,
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'active': True
        }
        
        result = users.insert_one(new_user)
        
        return JsonResponse({
            'message': 'User registered successfully',
            'user_id': str(result.inserted_id)
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
