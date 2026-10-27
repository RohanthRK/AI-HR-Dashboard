import json
import logging

import jwt
from bson import ObjectId
from django.conf import settings
from django.http import JsonResponse

log = logging.getLogger(__name__)

def _account_is_valid(user_id):
    """A signed token is only good while its account still exists and is active (deleted, reseeded or deactivated accounts are signed out)."""
    from hr_backend.db import users
    try:
        user = users.find_one({'_id': ObjectId(str(user_id))}, {'active': 1})
    except Exception:
        return False
    return bool(user) and user.get('active', True) is not False


class JWTAuthMiddleware:
    """
    Middleware that validates JWT tokens and attaches user info to request
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Always allow OPTIONS requests to pass through for CORS preflight
        if request.method == 'OPTIONS':
            return self.get_response(request)

        # List of paths that don't require authentication
        public_paths = [
            '/api/auth/login',
            '/api/health/',
            '/api/auth/sso/',   # OAuth2 login redirect/callback
            '/api/public/',   # careers page: open jobs, apply, candidate chatbot (rate limited)
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
            
            if not _account_is_valid(payload.get('user_id')):
                return JsonResponse({
                    'error': 'Account unavailable',
                    'message': 'Your account no longer exists or has been deactivated. Please sign in again.'
                }, status=401)

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

class ErrorSanitizerMiddleware:
    """
    Keeps internals out of responses. Server errors (5xx) are logged with the original text and replaced by a
    generic message, and unexpected exceptions become the same JSON error instead of an HTML debug page.
    """
    GENERIC = {'error': 'Server error', 'message': 'Something went wrong on our side. Please try again; contact support if it keeps happening.'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        bad = self._bad_json(request)
        if bad:
            return bad
        response = self.get_response(request)
        if response.status_code >= 500 and 'json' in (response.get('Content-Type') or ''):
            log.error('%s %s -> %s %s', request.method, request.path, response.status_code, bytes(response.content)[:500])
            return JsonResponse(self.GENERIC, status=response.status_code)
        return response

    @staticmethod
    def _bad_json(request):
        """JSON requests must carry a valid JSON object; everything else is a client error, not a crash."""
        if request.method not in ('POST', 'PUT', 'PATCH') or not request.path.startswith('/api/'):
            return None
        if 'json' not in (request.content_type or '') or not request.body:
            return None
        try:
            parsed = json.loads(request.body)
        except ValueError:
            return JsonResponse({'error': 'Invalid JSON', 'message': 'The request body is not valid JSON.'}, status=400)
        if not isinstance(parsed, dict):
            return JsonResponse({'error': 'Invalid JSON', 'message': 'The request body must be a JSON object.'}, status=400)
        return None

    def process_exception(self, request, exception):
        log.exception('Unhandled error on %s %s', request.method, request.path)
        if request.path.startswith('/api/'):
            return JsonResponse(self.GENERIC, status=500)
        return None
