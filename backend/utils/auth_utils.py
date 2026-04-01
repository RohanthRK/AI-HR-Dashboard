from functools import wraps
from django.http import JsonResponse
from hr_backend.db import teams, employees
from bson import ObjectId

def require_role(allowed_roles):
    """
    Decorator to restrict access to specific roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not hasattr(request, 'role') or request.role not in allowed_roles:
                return JsonResponse({
                    'error': 'Forbidden',
                    'message': 'You do not have permission to perform this action.'
                }, status=403)
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def require_self_or_role(allowed_roles):
    """
    Decorator that allows access if:
    1. The user's employee_id matches the employee_id in the URL.
    2. The user has one of the allowed roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Get target employee_id from kwargs
            target_employee_id = kwargs.get('employee_id')
            
            # Check if user is the owner
            is_owner = hasattr(request, 'employee_id') and str(request.employee_id) == str(target_employee_id)
            
            # Check if user has allowed role
            has_permission = is_owner or (hasattr(request, 'role') and request.role in allowed_roles)
            
            if not has_permission:
                return JsonResponse({
                    'error': 'Forbidden',
                    'message': 'You do not have permission to modify this resource.'
                }, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def require_team_leader_or_role(allowed_roles):
    """
    Decorator that allows access if:
    1. The user is the leader of the team specified by pk/id in the URL.
    2. The user has one of the allowed roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Depending on url pattern, ID might be 'pk' or 'team_id'
            team_id = kwargs.get('pk') or kwargs.get('team_id')
            
            if not team_id:
                 return view_func(request, *args, **kwargs) # Move on if id is missing
            
            # Check if user has allowed role (shortcut)
            if hasattr(request, 'role') and request.role in allowed_roles:
                return view_func(request, *args, **kwargs)
            
            # Fetch the team to check leadership
            try:
                team_oid = ObjectId(team_id) if len(team_id) == 24 else team_id
                team_doc = teams.find_one({'_id': team_oid})
                
                if not team_doc:
                    return JsonResponse({'error': 'Not found', 'message': 'Team not found'}, status=404)
                
                # Check if current user is the leader
                # Usually teams have a 'leader_id' or 'employees' list with 'is_leader' flag
                user_employee_id = getattr(request, 'employee_id', None)
                
                is_leader = False
                if team_doc.get('leader_id') == user_employee_id:
                    is_leader = True
                else:
                    # Also check employees list for is_leader flag
                    for emp in team_doc.get('employees', []):
                        if str(emp.get('id')) == str(user_employee_id) and emp.get('is_leader'):
                            is_leader = True
                            break
                            
                if not is_leader:
                    return JsonResponse({
                        'error': 'Forbidden',
                        'message': 'Only the Team Leader or authorized staff can modify this team.'
                    }, status=403)
                    
            except Exception as e:
                print(f"Auth check error: {e}")
                # Fallback to forbidden if we can't verify
                return JsonResponse({'error': 'Forbidden', 'message': 'Permission verification failed'}, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
