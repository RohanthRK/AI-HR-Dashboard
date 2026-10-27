"""
Compliance monitoring: employee documents that expire and mandatory trainings that are missing or overdue.
"""
import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ai_analytics.insights import is_active
from hr_backend.db import db, employees
from utils.auth_utils import forbidden, is_admin
from utils.hr_common import body, emp_name, now_iso, today_str
from utils.notify import notify, user_id_for_employee
from utils.app_settings import get_settings

WARN_DAYS = 60


def compliance_alerts():
    today = today_str()
    soon = (datetime.date.today() + datetime.timedelta(days=WARN_DAYS)).isoformat()
    people = {str(e['_id']): e for e in employees.find() if is_active(e)}
    alerts = []

    for doc in db['Documents'].find({'expires_on': {'$nin': ['', None]}}):
        emp = people.get(str(doc.get('employee_id')))
        expires = str(doc['expires_on'])[:10]
        if not emp or expires > soon:
            continue
        expired = expires < today
        alerts.append({
            'kind': 'document', 'severity': 'critical' if expired else 'warning', 'employee_id': str(emp['_id']),
            'employee': emp_name(emp), 'item': doc.get('name', 'Document'), 'date': expires,
            'message': f"{doc.get('name', 'Document')} {'expired on' if expired else 'expires on'} {expires}",
        })

    required = [d for d in get_settings()['knowledge']['requiredDocuments']]
    if required:
        names_by_emp = {}
        for doc in db['Documents'].find():
            names_by_emp.setdefault(str(doc.get('employee_id')), set()).update(
                {str(doc.get('name', '')).lower(), str(doc.get('category', '')).lower()})
        for eid, emp in people.items():
            have = names_by_emp.get(eid, set())
            for need in required:
                if not any(need.lower() in h for h in have):
                    alerts.append({'kind': 'document', 'severity': 'warning', 'employee_id': eid, 'employee': emp_name(emp),
                                   'item': need, 'date': '', 'message': f"Required document '{need}' has not been uploaded"})

    for course in db['Courses'].find({'mandatory': True}):
        cid = str(course['_id'])
        done = {a['employee_id']: a for a in db['TrainingAssignments'].find({'course_id': cid})}
        for eid, emp in people.items():
            a = done.get(eid)
            if a is None:
                alerts.append({'kind': 'training', 'severity': 'warning', 'employee_id': eid, 'employee': emp_name(emp),
                               'item': course['title'], 'date': '',
                               'message': f"Mandatory training '{course['title']}' has not been assigned"})
            elif a['status'] != 'Completed' and a.get('due_date') and a['due_date'] < today:
                alerts.append({'kind': 'training', 'severity': 'critical', 'employee_id': eid, 'employee': emp_name(emp),
                               'item': course['title'], 'date': a['due_date'],
                               'message': f"Mandatory training '{course['title']}' was due {a['due_date']}"})
    for a in alerts:
        a['department'] = (people.get(a['employee_id']) or {}).get('department', '')
        a['employee_code'] = (people.get(a['employee_id']) or {}).get('employee_id', '')
    alerts.sort(key=lambda a: (a['severity'] != 'critical', a['date'] or '9999'))
    return alerts


@csrf_exempt
@require_http_methods(["GET"])
def compliance(request):
    """GET /api/reports/compliance/ (Admin/Manager/HR)"""
    if not is_admin(request):
        return forbidden()
    alerts = compliance_alerts()
    return JsonResponse({'success': True, 'generated_at': now_iso(), 'total': len(alerts),
                         'critical': sum(a['severity'] == 'critical' for a in alerts), 'alerts': alerts})


@csrf_exempt
@require_http_methods(["POST"])
def compliance_notify(request):
    """POST /api/reports/compliance/notify/ - send each affected employee a reminder (Admin/Manager/HR)."""
    if not is_admin(request):
        return forbidden()
    sent = 0
    only = (body(request).get('employee_id') or '') if request.body else ''
    for alert in compliance_alerts():
        if only and alert['employee_id'] != only:
            continue
        if notify(user_id_for_employee(alert['employee_id']), 'Compliance reminder', alert['message'], type='compliance'):
            sent += 1
    return JsonResponse({'success': True, 'sent': sent})
