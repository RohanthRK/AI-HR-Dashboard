"""
Exit management: resignation requests, exit checklist, exit-interview survey, attrition analytics.

Collection: `Offboarding`.
"""
import datetime
from collections import Counter

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ai_analytics.insights import attrition_12m, parse_dt, tenure_years
from feedback.views import ensure_exit_survey, survey_results
from hr_backend.db import db, employees, users
from utils.auth_utils import forbidden, is_privileged, is_admin, scope_query
from utils.hr_common import body, current_employee, emp_name, error, now_iso, oid, serialize
from utils.events import emit
from utils.notify import notify, notify_staff, user_id_for_employee

offboarding = db['Offboarding']

REASONS = ('Compensation', 'Career growth', 'Management', 'Work-life balance', 'Relocation', 'Higher studies', 'Personal',
           'Performance', 'Retirement', 'End of contract', 'Other')
EXIT_TYPES = ('Resignation', 'Termination', 'Retirement', 'End of contract')
NOTICE_PERIOD_DAYS = 60            # the usual notice period for an Indian private-sector company
DEFAULT_CHECKLIST = ['Resignation accepted and relieving date confirmed', 'Return company assets (laptop, ID and access cards)',
                     'Revoke system and e-mail access', 'Knowledge transfer and handover', 'Exit interview',
                     'Clear pending expense claims and recoveries', 'Full and final settlement (salary, leave encashment, gratuity if eligible)',
                     'Issue relieving and experience letters', 'PF (UAN) exit and Form 16 details shared']
STATUSES = ('Pending', 'Approved', 'Rejected', 'Completed', 'Withdrawn')


@csrf_exempt
@require_http_methods(["GET", "POST"])
def requests_handler(request):
    """
    POST /api/offboarding/ {last_working_day, reason_category, reason} - resign (any employee).
    GET  /api/offboarding/ - Admin/Manager/HR see all; employees see their own.
    """
    emp = current_employee(request)
    if request.method == 'POST':
        if not emp:
            return error('Account is not linked to an employee profile')
        data = body(request)
        # HR can start an exit for someone else (termination, retirement, end of contract); everybody else resigns for themself
        initiated_for = None
        if data.get('employee_id') and str(data['employee_id']) != str(emp['_id']):
            if not is_admin(request):
                return forbidden('Only HR can start an exit for another employee.')
            initiated_for = employees.find_one({'_id': oid(data['employee_id'])})
            if not initiated_for:
                return error('Employee not found', 404)
        who = initiated_for or emp
        exit_type = data.get('exit_type') or 'Resignation'
        if exit_type not in EXIT_TYPES or (exit_type != 'Resignation' and not initiated_for):
            return error(f"exit_type must be one of {', '.join(EXIT_TYPES)} (only HR can use the ones other than Resignation)")
        last_day = str(data.get('last_working_day') or '')[:10]
        try:
            datetime.date.fromisoformat(last_day)
        except ValueError:
            return error('last_working_day must be a date (YYYY-MM-DD)')
        if data.get('reason_category') not in REASONS:
            return error(f"reason_category must be one of {', '.join(REASONS)}")
        if offboarding.find_one({'employee_id': str(who['_id']), 'status': {'$in': ['Pending', 'Approved']}}):
            return error('There is already an open exit request for this employee', 409)
        doc = {'employee_id': str(who['_id']), 'employee_name': emp_name(who), 'department_id': who.get('department_id'),
               'department': who.get('department', ''), 'employee_code': who.get('employee_id', ''),
               'position': who.get('position', ''), 'last_working_day': last_day, 'exit_type': exit_type,
               'reason_category': data['reason_category'], 'reason': str(data.get('reason', ''))[:1000],
               'status': 'Pending', 'checklist': [], 'requested_at': now_iso(), 'notice_period_days': NOTICE_PERIOD_DAYS,
               'tenure_years_at_request': round(tenure_years(who) or 0, 1)}
        doc['_id'] = offboarding.insert_one(dict(doc)).inserted_id
        notify_staff(f'{exit_type} recorded', f"{emp_name(who)}: {exit_type.lower()} submitted.", type='offboarding')
        return JsonResponse({'success': True, 'request': serialize(doc)}, status=201)

    if is_admin(request):
        query = {}
    elif is_privileged(request):
        query = scope_query(request, 'employee_id')
    else:
        query = {'employee_id': str(emp['_id']) if emp else '__none__'}
    dept = {str(e['_id']): (e.get('department', ''), e.get('employee_id', '')) for e in employees.find({}, {'department': 1, 'employee_id': 1})}
    out = []
    for r in offboarding.find(query).sort('requested_at', -1):
        r['department'] = r.get('department') or dept.get(r['employee_id'], ('', ''))[0]
        r['employee_code'] = r.get('employee_code') or dept.get(r['employee_id'], ('', ''))[1]
        r.setdefault('exit_type', 'Resignation')
        out.append(serialize(r))
    return JsonResponse({'success': True, 'requests': out, 'notice_period_days': NOTICE_PERIOD_DAYS})


@csrf_exempt
@require_http_methods(["PUT"])
def decide(request, request_id):
    """PUT /api/offboarding/<id>/ {status: Approved|Rejected|Completed|Withdrawn}"""
    _id = oid(request_id)
    doc = offboarding.find_one({'_id': _id}) if _id else None
    if not doc:
        return error('Request not found', 404)
    status = body(request).get('status')
    if status not in STATUSES:
        return error(f"status must be one of {', '.join(STATUSES)}")
    emp = current_employee(request)
    is_owner = bool(emp) and str(emp['_id']) == doc['employee_id']
    if status == 'Withdrawn':
        if not (is_owner and doc['status'] == 'Pending'):
            return forbidden('Only the employee can withdraw a pending request')
    elif not is_admin(request):
        return forbidden('Only HR / administrators decide resignations.')
    elif is_owner:
        return forbidden('You cannot decide your own resignation')

    update = {'status': status, 'decided_at': now_iso(), 'decided_by': str(getattr(request, 'user_id', ''))}
    if status == 'Approved':
        if not doc.get('checklist'):
            update['checklist'] = [{'id': i + 1, 'task': t, 'done': False} for i, t in enumerate(DEFAULT_CHECKLIST)]
        ensure_exit_survey()
    if status == 'Completed':
        pending = [c for c in doc.get('checklist', []) if not c['done']]
        if doc['status'] != 'Approved':
            return error('Only approved requests can be completed')
        if pending:
            return error(f"{len(pending)} checklist item(s) are still open")
        target = employees.find_one({'_id': oid(doc['employee_id'])})
        if target:
            employees.update_one({'_id': target['_id']}, {'$set': {
                'employment_status': 'Terminated', 'termination_date': doc['last_working_day'], 'active': False}})
            if target.get('user_id') and oid(target['user_id']):
                users.update_one({'_id': oid(target['user_id'])}, {'$set': {'active': False}})
    offboarding.update_one({'_id': _id}, {'$set': update})
    if status == 'Completed':
        emit('employee.terminated', {'employee_id': doc['employee_id'], 'name': doc.get('employee_name'),
                                      'last_working_day': doc.get('last_working_day'), 'reason': doc.get('reason_category')})
    if status in ('Approved', 'Rejected'):
        notify(user_id_for_employee(doc['employee_id']), f'Resignation {status.lower()}',
               f"Your resignation request was {status.lower()}.", type='offboarding')
    return JsonResponse({'success': True, 'request': serialize(offboarding.find_one({'_id': _id}))})


@csrf_exempt
@require_http_methods(["PUT"])
def toggle_checklist(request, request_id, item_id):
    """PUT /api/offboarding/<id>/checklist/<item>/ {done: bool} (Admin/Manager/HR)"""
    if not is_admin(request):
        return forbidden()
    _id = oid(request_id)
    doc = offboarding.find_one({'_id': _id}) if _id else None
    if not doc:
        return error('Request not found', 404)
    done = bool(body(request).get('done', True))
    result = offboarding.update_one({'_id': _id, 'checklist.id': int(item_id)}, {'$set': {'checklist.$.done': done}})
    if not result.matched_count:
        return error('Checklist item not found', 404)
    return JsonResponse({'success': True, 'request': serialize(offboarding.find_one({'_id': _id}))})


@csrf_exempt
@require_http_methods(["GET"])
def analytics(request):
    """GET /api/offboarding/analytics/ (Admin/HR): why people leave, tenure at exit, exit-interview results."""
    if not is_admin(request):
        return forbidden()
    rows = list(offboarding.find({'status': {'$in': ['Approved', 'Completed']}}))
    reasons = Counter(r['reason_category'] for r in rows)
    by_month = Counter((parse_dt(r.get('last_working_day')) or parse_dt(r['requested_at'])).strftime('%Y-%m') for r in rows)
    tenures = [r.get('tenure_years_at_request') for r in rows if r.get('tenure_years_at_request') is not None]
    exit_survey = db['Surveys'].find_one({'type': 'exit'})
    dept_names = {str(d['_id']): d['name'] for d in db['Departments'].find()}
    exits_by_dept = Counter(dept_names.get(str(r.get('department_id')), 'Unknown') for r in rows)
    active_by_dept = Counter(e.get('department') or 'Unknown' for e in db['Employees'].find({'employment_status': 'Active'}))
    by_department = [{'department': d, 'exits': exits_by_dept.get(d, 0), 'active': active_by_dept.get(d, 0),
                      'rate': round(exits_by_dept.get(d, 0) / max(active_by_dept.get(d, 0) + exits_by_dept.get(d, 0), 1) * 100, 1)}
                     for d in sorted(set(exits_by_dept) | set(active_by_dept))]
    turnover_rate, exits_12m = attrition_12m(list(employees.find({}, {'hire_date': 1, 'termination_date': 1})))
    return JsonResponse({
        'by_department': by_department, 'exits_12m': exits_12m,
        'turnover_rate_12m': turnover_rate,
        'success': True, 'total_exits': len(rows), 'open_requests': offboarding.count_documents({'status': 'Pending'}),
        'reasons': dict(reasons.most_common()), 'exits_by_month': dict(sorted(by_month.items())),
        'avg_tenure_years': round(sum(tenures) / len(tenures), 1) if tenures else None,
        'exit_survey': survey_results(exit_survey) if exit_survey else None,
    })
