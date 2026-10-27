"""
Training & development: course catalogue, assignments, skill-gap recommendations.

Collections: `Courses`, `TrainingAssignments`.
"""
from collections import Counter

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ai_analytics.insights import is_active, skill_list
from hr_backend.db import db, employees
from utils.auth_utils import forbidden, is_privileged, scope_query
from utils.hr_common import body, current_employee, emp_name, error, now_iso, oid, serialize, today_str
from utils.notify import notify, user_id_for_employee

courses = db['Courses']
assignments = db['TrainingAssignments']

MEMBER_STATUSES = ('Assigned', 'In Progress', 'Completed')


def _clean_skills(value):
    raw = value.split(',') if isinstance(value, str) else (value or [])
    return [str(s).strip() for s in raw if str(s).strip()]


@csrf_exempt
@require_http_methods(["GET", "POST"])
def courses_handler(request):
    """GET /api/training/courses/ (all) - POST (Admin/Manager/HR) creates a course."""
    if request.method == 'GET':
        return JsonResponse({'success': True, 'courses': [serialize(c) for c in courses.find().sort('title', 1)]})
    if not is_privileged(request):
        return forbidden()
    data = body(request)
    title = (data.get('title') or '').strip()
    if not title:
        return error('title is required')
    doc = {
        'title': title, 'description': data.get('description', ''), 'skills': _clean_skills(data.get('skills')),
        'mandatory': bool(data.get('mandatory', False)), 'duration_hours': data.get('duration_hours') or 0,
        'url': data.get('url', ''), 'created_at': now_iso(),
    }
    doc['_id'] = courses.insert_one(dict(doc)).inserted_id
    return JsonResponse({'success': True, 'course': serialize(doc)}, status=201)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def course_detail(request, course_id):
    if not is_privileged(request):
        return forbidden()
    _id = oid(course_id)
    if not _id or not courses.find_one({'_id': _id}):
        return error('Course not found', 404)
    if request.method == 'DELETE':
        courses.delete_one({'_id': _id})
        assignments.delete_many({'course_id': str(_id)})
        return JsonResponse({'success': True})
    data = body(request)
    update = {}
    for key in ('title', 'description', 'url'):
        if key in data:
            update[key] = data[key]
    if 'skills' in data:
        update['skills'] = _clean_skills(data['skills'])
    if 'mandatory' in data:
        update['mandatory'] = bool(data['mandatory'])
    if 'duration_hours' in data:
        update['duration_hours'] = data['duration_hours']
    if update:
        courses.update_one({'_id': _id}, {'$set': update})
    return JsonResponse({'success': True, 'course': serialize(courses.find_one({'_id': _id}))})


@csrf_exempt
@require_http_methods(["POST"])
def assign(request):
    """POST /api/training/assign/ {course_id, employee_ids?: [], all?: true, due_date?} (Admin/Manager/HR)."""
    if not is_privileged(request):
        return forbidden()
    data = body(request)
    course = courses.find_one({'_id': oid(data.get('course_id'))}) if oid(data.get('course_id')) else None
    if not course:
        return error('Course not found', 404)
    if data.get('all'):
        targets = [e for e in employees.find() if is_active(e)]
    elif data.get('department'):
        targets = [e for e in employees.find({'department': data['department']}) if is_active(e)]
    else:
        targets = [e for e in (employees.find_one({'_id': oid(i)}) for i in data.get('employee_ids') or []) if e]
    if not targets:
        return error('No employees selected')
    created = 0
    for emp in targets:
        key = {'course_id': str(course['_id']), 'employee_id': str(emp['_id'])}
        if assignments.find_one(key):
            continue
        assignments.insert_one({**key, 'employee_name': emp_name(emp), 'course_title': course['title'],
                                'department': emp.get('department', ''),
                                'mandatory': course.get('mandatory', False), 'status': 'Assigned',
                                'due_date': data.get('due_date') or '', 'assigned_at': now_iso(),
                                'assigned_by': str(getattr(request, 'user_id', ''))})
        notify(user_id_for_employee(emp['_id']), 'New training assigned',
               f"{course['title']}" + (f" - due {data['due_date']}" if data.get('due_date') else ''),
               type='training_assigned')
        created += 1
    return JsonResponse({'success': True, 'created': created, 'skipped': len(targets) - created})


@csrf_exempt
@require_http_methods(["GET"])
def my_assignments(request):
    emp = current_employee(request)
    if not emp:
        return error('Account is not linked to an employee profile')
    rows = assignments.find({'employee_id': str(emp['_id'])}).sort('assigned_at', -1)
    result = []
    today = today_str()
    for a in rows:
        a = serialize(a)
        a['overdue'] = bool(a.get('due_date')) and a['status'] != 'Completed' and a['due_date'] < today
        result.append(a)
    return JsonResponse({'success': True, 'assignments': result})


@csrf_exempt
@require_http_methods(["GET"])
def all_assignments(request):
    """GET /api/training/assignments/?status=&course_id= (Admin/Manager/HR)."""
    if not is_privileged(request):
        return forbidden()
    query = scope_query(request, 'employee_id', {k: request.GET[k] for k in ('status', 'course_id') if request.GET.get(k)})
    today = today_str()
    result = []
    dept_of = {str(e['_id']): e.get('department', '') for e in employees.find({}, {'department': 1})}
    for a in assignments.find(query).sort('assigned_at', -1):
        a['department'] = dept_of.get(a.get('employee_id'), a.get('department', ''))
        a = serialize(a)
        a['overdue'] = bool(a.get('due_date')) and a['status'] != 'Completed' and a['due_date'] < today
        result.append(a)
    return JsonResponse({'success': True, 'assignments': result})


@csrf_exempt
@require_http_methods(["PUT"])
def assignment_detail(request, assignment_id):
    """PUT /api/training/assignments/<id>/ {status} - owner or Admin/Manager/HR."""
    _id = oid(assignment_id)
    a = assignments.find_one({'_id': _id}) if _id else None
    if not a:
        return error('Assignment not found', 404)
    emp = current_employee(request)
    is_owner = bool(emp) and str(emp['_id']) == a['employee_id']
    if not (is_owner or is_privileged(request)):
        return forbidden()
    status = body(request).get('status')
    if status not in MEMBER_STATUSES:
        return error(f"status must be one of {', '.join(MEMBER_STATUSES)}")
    update = {'status': status, 'updated_at': now_iso()}
    if status == 'Completed':
        update['completed_at'] = now_iso()
        course = courses.find_one({'_id': oid(a['course_id'])}) or {}
        target = employees.find_one({'_id': oid(a['employee_id'])})
        if target and course.get('skills'):
            have = {s.lower() for s in skill_list(target)}
            new = [{'name': s, 'proficiency': 5} for s in course['skills'] if s.lower() not in have]
            if new:
                employees.update_one({'_id': target['_id']}, {'$push': {'skills': {'$each': new}}})
                update['skills_gained'] = [s['name'] for s in new]
    assignments.update_one({'_id': _id}, {'$set': update})
    return JsonResponse({'success': True, 'assignment': serialize(assignments.find_one({'_id': _id}))})


def recommendations_for(emp):
    """Courses covering skills the employee lacks, where the skill is in demand (open jobs, department peers)."""
    have = {s.lower() for s in skill_list(emp)}
    demand = Counter()
    dept_name = (emp.get('department') or '').lower()
    for job in db['jobs'].find():
        if str(job.get('status', 'Open')).lower() != 'open':
            continue
        raw = job.get('skills') or []
        job_skills = [x.strip().lower() for x in (raw.split(',') if isinstance(raw, str) else raw) if x.strip()]
        # an opening is only relevant to people in that department or who already have one of its skills
        if (job.get('department') or '').lower() != dept_name and not (have & set(job_skills)):
            continue
        for s in job_skills:
            demand[s] += 2
    peers = [e for e in employees.find({'department_id': emp.get('department_id')}) if e['_id'] != emp['_id']] \
        if emp.get('department_id') else []
    if peers:
        freq = Counter(s.lower() for e in peers for s in set(skill_list(e)))
        for s, c in freq.items():
            if c / len(peers) >= 0.5:
                demand[s] += 1
    gaps = {s: w for s, w in demand.items() if s not in have}
    taken = {a['course_id'] for a in assignments.find({'employee_id': str(emp['_id'])})}
    ranked = []
    for course in courses.find():
        if str(course['_id']) in taken:
            continue
        covered = [s for s in course.get('skills', []) if s.lower() in gaps]
        if covered:
            ranked.append((sum(gaps[s.lower()] for s in covered), covered, course))
    ranked.sort(key=lambda r: -r[0])
    return [{'course': serialize(c), 'covers': cov, 'score': score,
             'reason': f"Fills skill gap: {', '.join(cov)}"} for score, cov, c in ranked[:10]], sorted(gaps)


@csrf_exempt
@require_http_methods(["GET"])
def recommendations(request):
    """GET /api/training/recommendations/?employee_id= - own by default; others need Admin/Manager/HR."""
    emp = current_employee(request)
    ref = request.GET.get('employee_id')
    if ref and (not emp or ref not in (str(emp['_id']), emp.get('employee_id'))):
        if not is_privileged(request):
            return forbidden()
        emp = employees.find_one({'_id': oid(ref)}) or employees.find_one({'employee_id': ref})
    if not emp:
        return error('Employee not found', 404)
    recs, gaps = recommendations_for(emp)
    return JsonResponse({'success': True, 'employee': emp_name(emp), 'skill_gaps': gaps, 'recommendations': recs})
