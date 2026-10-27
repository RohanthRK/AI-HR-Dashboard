"""Small helpers shared by the training, survey, compliance and offboarding modules."""
import datetime
import json

from bson import ObjectId
from django.http import JsonResponse

from hr_backend.db import employees, roles, users


def now_iso():
    return datetime.datetime.now(tz=datetime.timezone.utc).isoformat()


def today_str():
    return datetime.datetime.now(tz=datetime.timezone.utc).strftime('%Y-%m-%d')


def body(request):
    try:
        data = json.loads(request.body or '{}')
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def oid(value):
    """ObjectId from a string, or None."""
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def current_employee(request):
    """Employee document of the logged-in user (by _id or business code), or None."""
    ref = str(getattr(request, 'employee_id', '') or '')
    if not ref:
        return None
    emp = employees.find_one({'employee_id': ref})
    if not emp and oid(ref):
        emp = employees.find_one({'_id': oid(ref)})
    return emp


def employee_by_ref(ref):
    ref = str(ref or '')
    emp = employees.find_one({'employee_id': ref})
    if not emp and oid(ref):
        emp = employees.find_one({'_id': oid(ref)})
    return emp


def emp_name(emp):
    return f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip() or emp.get('email', '')


# Yearly paid entitlement per leave type (None = unlimited, unpaid). The single source for the API and the AI assistant.
LEAVE_ENTITLEMENTS = {'Earned Leaves': 18, 'Sick Leaves': 10, 'LOP Leaves': None}


def employee_names():
    """{employee _id string or employee code: full name} for labelling records that reference either."""
    from hr_backend.db import employees as coll
    names = {}
    for e in coll.find({}, {'first_name': 1, 'last_name': 1, 'email': 1, 'employee_id': 1}):
        name = emp_name(e)
        names[str(e['_id'])] = name
        if e.get('employee_id'):
            names[e['employee_id']] = name
    return names


def serialize(doc):
    """Make a Mongo document JSON-safe (ObjectId -> str)."""
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [serialize(i) if isinstance(i, dict) else (str(i) if isinstance(i, ObjectId) else i) for i in v]
        elif isinstance(v, dict):
            out[k] = serialize(v)
        else:
            out[k] = v
    return out


def privileged_user_ids(role_names=('Admin', 'Manager')):
    """Users._id strings of everyone holding one of the given roles (for admin notifications)."""
    role_ids = [str(r['_id']) for r in roles.find({'name': {'$in': list(role_names)}})]
    return [str(u['_id']) for u in users.find({'role_id': {'$in': role_ids}})]


def error(message, status=400):
    return JsonResponse({'success': False, 'error': message}, status=status)
