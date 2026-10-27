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
    1. The user's employee_id matches the employee_id in the URL (either _id or physical ID).
    2. The user has one of the allowed roles.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Get target employee_id from kwargs (can be _id or physical ID)
            target_id = kwargs.get('employee_id')
            
            # Check if user has allowed role (shortcut for Admin/Manager)
            if hasattr(request, 'role') and request.role in allowed_roles:
                return view_func(request, *args, **kwargs)
                
            # Check if user is the owner
            user_employee_id = getattr(request, 'employee_id', None)
            if not user_employee_id:
                return JsonResponse({'error': 'Unauthorized', 'message': 'User employee context missing'}, status=401)
            
            # Case 1: Direct match with physical ID
            is_owner = str(user_employee_id) == str(target_id)
            
            # Case 2: Match via MongoDB _id
            if not is_owner:
                try:
                    # Find employee record for target_id to see if it matches our user
                    query = {'_id': target_id}
                    if len(str(target_id)) == 24:
                        try: query = {'_id': ObjectId(target_id)}
                        except: pass
                    
                    target_emp = employees.find_one(query)
                    if target_emp and target_emp.get('employee_id') == user_employee_id:
                        is_owner = True
                except:
                    pass
            
            if not is_owner:
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
                # Fallback to forbidden if we can't verify
                return JsonResponse({'error': 'Forbidden', 'message': 'Permission verification failed'}, status=403)
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


PRIVILEGED_ROLES = ('Admin', 'Manager', 'HR')


def is_privileged(request):
    """True for Admin / Manager / HR."""
    return getattr(request, 'role', '') in PRIVILEGED_ROLES


def owns_employee(request, emp_ref):
    """True if emp_ref (Mongo _id string or business code) refers to the logged-in user's employee."""
    mine = str(getattr(request, 'employee_id', '') or '')
    ref = str(emp_ref or '')
    if not mine or not ref:
        return False
    if mine == ref:
        return True
    keys = set()
    for ident in (mine, ref):
        doc = employees.find_one({'employee_id': ident})
        if not doc and len(ident) == 24:
            try:
                doc = employees.find_one({'_id': ObjectId(ident)})
            except Exception:
                doc = None
        keys.add(frozenset(filter(None, [str(doc['_id']), doc.get('employee_id')])) if doc else frozenset([ident]))
    return len(keys) == 1


def forbidden(message='You do not have permission to perform this action.'):
    return JsonResponse({'error': 'Forbidden', 'message': message}, status=403)


SENSITIVE_EMPLOYEE_FIELDS = (
    'salary', 'date_of_birth', 'emergency_contact', 'emergency_contact_name', 'emergency_contact_phone',
    'emergency_contact_relationship', 'personal_email', 'address', 'marital_status', 'bank_details', 'tax_id',
    'pay_items', 'leave_balance', 'documents',
)


MANAGER_HIDDEN_FIELDS = ('bank_details', 'tax_id', 'personal_email', 'documents', 'emergency_contact', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship', 'address', 'marital_status', 'date_of_birth')


def redact_employee(request, doc):
    """
    Pay and personal details: everyone sees their own; Admin sees all; a manager also sees salary (not bank or tax
    details) for the people who report to them; everyone else gets the directory view.
    """
    if is_admin(request):
        return doc
    mine = str(getattr(request, 'employee_id', '') or '')
    if mine and mine in {str(doc.get('_id', '')), str(doc.get('employee_id', ''))}:
        return doc
    if getattr(request, 'role', '') == 'Manager':
        scope = visible_refs(request) or set()
        if {str(doc.get('_id', '')), str(doc.get('employee_id', ''))} & scope:
            return {k: v for k, v in doc.items() if k not in MANAGER_HIDDEN_FIELDS}
    return {k: v for k, v in doc.items() if k not in SENSITIVE_EMPLOYEE_FIELDS}


def is_admin(request):
    """Admin (HR) accounts see everything."""
    return getattr(request, 'role', '') == 'Admin'


def visible_refs(request):
    """
    Whose records the viewer may see: None for Admin (everyone); otherwise a set holding every identifier
    (Mongo _id string and employee code) of the viewer, everyone who reports to them (directly or not) and the
    members of teams they manage or lead. Managers use it to stay within their own reports.
    """
    if is_admin(request):
        return None
    cached = getattr(request, '_visible_refs', None)
    if cached is not None:
        return cached
    mine = str(getattr(request, 'employee_id', '') or '')
    me = employees.find_one({'employee_id': mine}) or (employees.find_one({'_id': ObjectId(mine)}) if len(mine) == 24 else None)
    refs = {mine} if mine else set()
    if me:
        refs |= {str(me['_id']), me.get('employee_id', '')}
        if getattr(request, 'role', '') == 'Manager':
            people = {str(e['_id']): e for e in employees.find({}, {'manager_id': 1, 'employee_id': 1})}
            frontier = {str(me['_id'])}
            below = set()
            while frontier:
                nxt = {pid for pid, e in people.items() if str(e.get('manager_id') or '') in frontier and pid not in below}
                below |= nxt
                frontier = nxt
            for team in teams.find({'$or': [{'manager_id': str(me['_id'])}, {'leader_id': str(me['_id'])}]}):
                below |= {str(m) for m in team.get('members', [])}
            below.discard(str(me['_id']))
            for pid in below:
                refs |= {pid, people[pid].get('employee_id', '')} if pid in people else {pid}
    refs.discard('')
    request._visible_refs = refs
    return refs


def can_see_employee(request, emp_ref):
    """Admin: always. Manager: themself and their reports. Employee: only themself."""
    scope = visible_refs(request)
    if scope is None:
        return True
    ref = str(emp_ref or '')
    if ref in scope:
        return True
    doc = employees.find_one({'employee_id': ref}) or (employees.find_one({'_id': ObjectId(ref)}) if len(ref) == 24 else None)
    return bool(doc) and bool({str(doc['_id']), doc.get('employee_id', '')} & scope)


def scope_query(request, field, query=None):
    """Add `field in scope` to a Mongo query unless the viewer is Admin."""
    query = dict(query or {})
    scope = visible_refs(request)
    if scope is not None:
        query[field] = {'$in': sorted(scope)}
    return query
