"""
New-hire onboarding: a checklist per employee built from Settings (employee tasks, HR tasks), the required
documents list and mandatory trainings. Document and training items tick themselves off when satisfied.

Collection: `Onboarding`.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db
from utils.app_settings import get_settings
from utils.auth_utils import forbidden, is_privileged, is_admin, scope_query
from utils.hr_common import body, current_employee, emp_name, employee_by_ref, error, now_iso, oid, serialize
from utils.notify import notify, user_id_for_employee

onboarding = db['Onboarding']


def build_tasks(emp):
    knowledge = get_settings()['knowledge']
    tasks, n = [], 0

    def add(title, owner, auto=None):
        nonlocal n
        n += 1
        tasks.append({'id': n, 'title': title, 'owner': owner, 'done': False, 'auto': auto})

    for t in knowledge['employeeTasks']:
        add(t, 'employee')
    for doc in knowledge['requiredDocuments']:
        add(f'Upload document: {doc}', 'employee', {'type': 'document', 'name': doc})
    for course in db['Courses'].find({'mandatory': True}):
        add(f"Complete training: {course['title']}", 'employee', {'type': 'course', 'course_id': str(course['_id'])})
    for t in knowledge['hrTasks']:
        add(t, 'hr')
    return tasks


def start_onboarding(emp):
    """Create the checklist for an employee (idempotent). Returns the document."""
    existing = onboarding.find_one({'employee_id': str(emp['_id'])})
    if existing:
        return existing
    doc = {'employee_id': str(emp['_id']), 'employee_name': emp_name(emp), 'position': emp.get('position', ''),
           'tasks': build_tasks(emp), 'started_at': now_iso(), 'completed_at': None}
    doc['_id'] = onboarding.insert_one(dict(doc)).inserted_id
    notify(user_id_for_employee(emp['_id']), 'Welcome aboard!', 'Your onboarding checklist is ready.', type='onboarding')
    return doc


def _sync_auto_tasks(doc):
    """Tick document / training tasks that the employee has already satisfied."""
    eid = doc['employee_id']
    changed = False
    names = {str(d.get('name', '')).lower() for d in db['Documents'].find({'employee_id': oid(eid)})} | \
            {str(d.get('category', '')).lower() for d in db['Documents'].find({'employee_id': oid(eid)})}
    for task in doc['tasks']:
        auto = task.get('auto')
        if not auto or task['done']:
            continue
        if auto['type'] == 'document' and any(auto['name'].lower() in n for n in names):
            task['done'] = changed = True
        elif auto['type'] == 'course' and db['TrainingAssignments'].find_one(
                {'employee_id': eid, 'course_id': auto['course_id'], 'status': 'Completed'}):
            task['done'] = changed = True
    if all(t['done'] for t in doc['tasks']) and doc['tasks'] and not doc.get('completed_at'):
        doc['completed_at'] = now_iso()
        changed = True
    if changed:
        onboarding.update_one({'_id': doc['_id']}, {'$set': {'tasks': doc['tasks'], 'completed_at': doc.get('completed_at')}})
    return doc


def _present(doc):
    out = serialize(_sync_auto_tasks(doc))
    person = db['Employees'].find_one({'_id': oid(doc['employee_id'])}) or {}
    out.update({'department': person.get('department', ''), 'team': person.get('team', ''), 'hire_date': person.get('hire_date', ''),
                'employee_code': person.get('employee_id', ''), 'email': person.get('email', ''),
                'manager_name': emp_name(db['Employees'].find_one({'_id': oid(person.get('manager_id'))}) or {}) if person.get('manager_id') else ''})
    done = sum(t['done'] for t in out['tasks'])
    out['progress'] = round(done / len(out['tasks']) * 100) if out['tasks'] else 100
    return out


@csrf_exempt
@require_http_methods(["GET"])
def list_onboarding(request):
    """GET /api/onboarding/ - Admin/Manager/HR see everyone, employees see their own checklist."""
    if is_admin(request):
        rows = onboarding.find().sort('started_at', -1)
    elif is_privileged(request):
        rows = onboarding.find(scope_query(request, 'employee_id')).sort('started_at', -1)
    else:
        emp = current_employee(request)
        rows = onboarding.find({'employee_id': str(emp['_id']) if emp else '__none__'})
    return JsonResponse({'success': True, 'onboardings': [_present(r) for r in rows]})


@csrf_exempt
@require_http_methods(["POST"])
def start(request):
    """POST /api/onboarding/start/ {employee_id} (Admin/Manager/HR)"""
    if not is_admin(request):
        return forbidden()
    emp = employee_by_ref(body(request).get('employee_id'))
    if not emp:
        return error('Employee not found', 404)
    return JsonResponse({'success': True, 'onboarding': _present(start_onboarding(emp))}, status=201)


@csrf_exempt
@require_http_methods(["PUT"])
def update_task(request, onboarding_id, task_id):
    """PUT /api/onboarding/<id>/tasks/<task>/ {done} - employee tasks by the employee, any task by staff."""
    _id = oid(onboarding_id)
    doc = onboarding.find_one({'_id': _id}) if _id else None
    if not doc:
        return error('Onboarding not found', 404)
    task = next((t for t in doc['tasks'] if str(t['id']) == str(task_id)), None)
    if not task:
        return error('Task not found', 404)
    emp = current_employee(request)
    is_owner = bool(emp) and str(emp['_id']) == doc['employee_id']
    if not (is_privileged(request) or (is_owner and task['owner'] == 'employee')):
        return forbidden()
    task['done'] = bool(body(request).get('done', True))
    doc['completed_at'] = None
    onboarding.update_one({'_id': _id}, {'$set': {'tasks': doc['tasks'], 'completed_at': None}})
    return JsonResponse({'success': True, 'onboarding': _present(onboarding.find_one({'_id': _id}))})
