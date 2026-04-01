import jwt
import datetime
from django.conf import settings
from django.http import JsonResponse
from bson import ObjectId
from hr_backend.db import users

class JWTAuthMiddleware:
    """
    Middleware that validates JWT tokens and attaches user info to request
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # List of paths that don't require authentication
        public_paths = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/employees/debug/', # Keeping this for now as it's used in many places
        ]
        
        # Check if current path is public
        if any(request.path.startswith(path) for path in public_paths):
            return self.get_response(request)

        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({
                'error': 'Unauthorized',
                'message': 'Authentication credentials were not provided.'
            }, status=401)

        token = auth_header.split(' ')[1]
        
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # Attach user info to request object
            request.user_info = payload
            request.user_id = payload.get('user_id')
            request.employee_id = payload.get('employee_id')
            request.role = payload.get('role', 'Employee')

        except jwt.ExpiredSignatureError:
            return JsonResponse({
                'error': 'Token expired',
                'message': 'Your session has expired. Please log in again.'
            }, status=401)
        except Exception as e:
            return JsonResponse({
                'error': 'Invalid token',
                'message': 'Authentication failed.'
            }, status=401)

        return self.get_response(request)