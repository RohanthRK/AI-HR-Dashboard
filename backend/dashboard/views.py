"""
GET /api/dashboard/ - everything the home page shows, in one call, scoped to the signed-in user.

  Admin / HR  : the whole company
  Manager     : themself and the people who report to them (headcount and the like stay company-wide, as in the directory)
  Employee    : themself

Nothing here is invented: every number is counted from the database and a section with nothing to show is returned empty,
so the page can say so instead of filling the gap.
"""
import datetime
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db, employees
from utils.app_settings import get_settings
from utils.auth_utils import is_admin, is_privileged, scope_query, visible_refs
from utils.hr_common import current_employee, emp_name

DAYS_AHEAD = 30


def _today():
    return datetime.datetime.now(tz=datetime.timezone.utc).date()


def _date(value):
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _is_active(e):
    return str(e.get('employment_status') or 'Active').lower() == 'active' and e.get('active', True) is not False


def _call(view, request, *args):
    """Run another view with this request and read its JSON (used for the attendance summary and leave balance)."""
    try:
        response = view(request, *args)
        return json.loads(response.content) if response.status_code == 200 else None
    except Exception:
        return None


def _next_occurrence(day, today):
    """The next time a month/day falls on or after today (29 Feb counts as 28 Feb in other years)."""
    for year in (today.year, today.year + 1):
        try:
            candidate = day.replace(year=year)
        except ValueError:
            candidate = day.replace(year=year, day=28)
        if candidate >= today:
            return candidate
    return None


def _item(id_, label, count, link, severity='warning', hint=''):
    return {'id': id_, 'label': label, 'count': count, 'link': link, 'severity': severity, 'hint': hint} if count else None


def _attention(request, role, me, today, scope):
    """Things waiting for this person, most urgent first. Only items with something to do are returned."""
    items = []
    my_user = str(getattr(request, 'user_id', ''))
    my_keys = [str(me['_id']), me.get('employee_id')] if me else []
    now_iso = today.isoformat()

    if role in ('admin', 'manager'):
        pending_leaves = db['Leaves'].count_documents(scope_query(request, 'employee_id', {'status': 'Pending'}))
        items.append(_item('leaves', 'Leave requests waiting for your decision', pending_leaves, '/leaves/pending', 'warning'))
        pending_expenses = db['expenses'].count_documents(scope_query(request, 'employee_id', {'status': 'Pending'}))
        items.append(_item('expenses', 'Expense claims waiting for approval', pending_expenses, '/expenses', 'warning'))
    if role == 'admin':
        items.append(_item('resignations', 'Resignations waiting for a decision', db['Offboarding'].count_documents({'status': 'Pending'}), '/offboarding', 'warning'))
        from reports.views import compliance_alerts
        alerts = compliance_alerts()
        critical = sum(1 for a in alerts if a['severity'] == 'critical')
        items.append(_item('compliance-critical', 'Critical compliance issues (expired or overdue)', critical, '/compliance', 'error'))
        items.append(_item('compliance-warning', 'Compliance warnings (missing or expiring soon)', len(alerts) - critical, '/compliance', 'warning'))
        items.append(_item('tickets', 'Open helpdesk tickets', db['helpdesk_tickets'].count_documents({'status': {'$nin': ['Resolved', 'Closed']}}), '/helpdesk', 'info'))
        items.append(_item('applications', 'New applications to look at', db['candidates'].count_documents({'stage': 'Applied'}), '/recruitment', 'info'))
        month = today.strftime('%B %Y')
        slips = list(db['Payroll'].find({'period': month}, {'status': 1}))
        first_of_next = (today.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
        days_left = (first_of_next - today).days
        if not slips and days_left <= 10:
            items.append(_item('payroll', f'Payroll for {month} has not been generated yet', 1, '/payroll', 'warning', f'{days_left} day(s) left in the month'))
        elif any(s['status'] == 'Draft' for s in slips):
            items.append(_item('payroll', f'Payroll for {month} is still in draft', 1, '/payroll', 'info', 'Review and release it'))
        items.append(_item('overdue-training', 'Overdue trainings across the company',
                           db['TrainingAssignments'].count_documents({'status': {'$ne': 'Completed'}, 'due_date': {'$nin': ['', None], '$lt': now_iso}}), '/training', 'warning'))
    if role == 'manager':
        team_overdue = db['TrainingAssignments'].count_documents(scope_query(request, 'employee_id', {'status': {'$ne': 'Completed'}, 'due_date': {'$nin': ['', None], '$lt': now_iso}}))
        items.append(_item('team-overdue-training', 'Overdue trainings in your team', team_overdue, '/training', 'warning'))

    if me:
        mine = {'employee_id': {'$in': my_keys}}
        items.append(_item('my-leaves', 'Your leave requests waiting for a decision', db['Leaves'].count_documents({**mine, 'status': 'Pending'}), '/leaves', 'info'))
        assigned = list(db['TrainingAssignments'].find({'employee_id': str(me['_id']), 'status': {'$ne': 'Completed'}}))
        overdue = [a for a in assigned if a.get('due_date') and a['due_date'] < now_iso]
        items.append(_item('my-overdue-training', 'Your trainings are overdue', len(overdue), '/training', 'error'))
        items.append(_item('my-training', 'Trainings to complete', len(assigned) - len(overdue), '/training', 'info'))
        onboarding = db['Onboarding'].find_one({'employee_id': str(me['_id']), 'completed_at': None})
        if onboarding:
            open_tasks = sum(1 for t in onboarding.get('tasks', []) if not t.get('done') and t.get('owner') == 'employee')
            items.append(_item('my-onboarding', 'Onboarding tasks for you to finish', open_tasks, '/onboarding', 'warning'))
        items.append(_item('my-tickets', 'Your helpdesk tickets that are still open',
                           db['helpdesk_tickets'].count_documents({'employee_id': {'$in': my_keys}, 'status': {'$nin': ['Resolved', 'Closed']}}), '/helpdesk', 'info'))
        items.append(_item('my-reviews', 'Reviews you still have to complete',
                           db['Reviews'].count_documents({'reviewer_id': {'$in': my_keys}, 'status': {'$nin': ['Completed', 'completed']}}), '/performance', 'warning'))
        items.append(_item('my-expenses', 'Your expense claims waiting for approval', db['expenses'].count_documents({'employee_id': {'$in': my_keys}, 'status': 'Pending'}), '/expenses', 'info'))
    items.append(_item('notifications', 'Unread notifications', db['Notifications'].count_documents({'user_id': my_user, 'read': {'$nin': [True, 'True', 'true']}}), None, 'info'))
    order = {'error': 0, 'warning': 1, 'info': 2}
    return sorted([i for i in items if i], key=lambda i: order[i['severity']])


def _people(today, active):
    """Birthdays, work anniversaries and new joiners. Only names and the day of the month are shown, never ages."""
    birthdays, anniversaries, joiners = [], [], []
    for e in active:
        name = emp_name(e)
        born = _date(e.get('date_of_birth'))
        if born:
            nxt = _next_occurrence(born, today)
            if nxt and (nxt - today).days <= DAYS_AHEAD:
                birthdays.append({'name': name, 'date': nxt.isoformat(), 'days_away': (nxt - today).days, 'department': e.get('department', '')})
        hired = _date(e.get('hire_date'))
        if hired:
            nxt = _next_occurrence(hired, today)
            years = nxt.year - hired.year if nxt else 0
            if nxt and years >= 1 and (nxt - today).days <= DAYS_AHEAD:
                anniversaries.append({'name': name, 'date': nxt.isoformat(), 'days_away': (nxt - today).days, 'years': years, 'department': e.get('department', '')})
            if today - datetime.timedelta(days=DAYS_AHEAD) <= hired <= today:
                joiners.append({'id': str(e['_id']), 'name': name, 'position': e.get('position', ''), 'department': e.get('department', ''), 'date': hired.isoformat()})
    by_day = lambda r: (r['days_away'], r['name'])
    return {'birthdays': sorted(birthdays, key=by_day)[:8], 'anniversaries': sorted(anniversaries, key=by_day)[:8],
            'new_joiners': sorted(joiners, key=lambda r: r['date'], reverse=True)[:8]}


def _activity(request, role, me, today, active, names):
    """A genuine feed built from what happened recently (and that this person may see), newest first."""
    feed = []
    since = (today - datetime.timedelta(days=21)).isoformat()
    for e in active:
        hired = _date(e.get('hire_date'))
        if hired and hired.isoformat() >= since and hired <= today:
            feed.append({'id': f"join-{e['_id']}", 'type': 'joined', 'title': 'New joiner', 'description': f"{emp_name(e)} joined{(' ' + e['department']) if e.get('department') else ''} as {e.get('position') or 'a team member'}",
                         'at': hired.isoformat(), 'link': f"/employees/{e['_id']}"})
    for l in db['Leaves'].find(scope_query(request, 'employee_id', {'created_at': {'$gte': since}})).sort('created_at', -1).limit(8) if is_privileged(request) or me else []:
        if not is_privileged(request) and me and l.get('employee_id') not in (me.get('employee_id'), str(me['_id'])):
            continue
        who = l.get('employee_name') or 'Someone'
        feed.append({'id': f"leave-{l['_id']}", 'type': 'leave', 'title': f"Leave {str(l.get('status', 'requested')).lower()}",
                     'description': f"{who}: {l.get('leave_type', 'leave')}, {l.get('days', 1):g} day(s) from {l.get('start_date')}", 'at': l.get('created_at'),
                     'link': '/leaves/pending' if l.get('status') == 'Pending' and is_privileged(request) else '/leaves'})
    for r in db['Recognitions'].find({'created_at': {'$gte': since}}).sort('created_at', -1).limit(5):
        feed.append({'id': f"rec-{r['_id']}", 'type': 'recognition', 'title': 'Recognition', 'description': f"{names.get(r['from_employee_id'], 'Someone')} recognised {names.get(r['to_employee_id'], 'a colleague')}: {r.get('message', '')[:80]}",
                     'at': r['created_at'], 'link': '/recognition'})
    if is_privileged(request):
        for c in db['candidates'].find({'appliedAt': {'$gte': since}}).sort('appliedAt', -1).limit(5):
            feed.append({'id': f"cand-{c['_id']}", 'type': 'application', 'title': 'New application', 'description': f"{c.get('name', 'A candidate')} applied ({c.get('source') or 'direct'})", 'at': c.get('appliedAt'), 'link': '/recruitment'})
    if role == 'admin':
        for o in db['Offboarding'].find({'requested_at': {'$gte': since}}).sort('requested_at', -1).limit(3):
            feed.append({'id': f"exit-{o['_id']}", 'type': 'exit', 'title': f"{o.get('exit_type', 'Resignation')} ({o.get('status', '')})", 'description': f"{o.get('employee_name', 'An employee')}, last day {o.get('last_working_day')}", 'at': o.get('requested_at'), 'link': '/offboarding'})
    if me:
        for p in db['Payroll'].find({'employee_id': str(me['_id']), 'status': {'$in': ['Processed', 'Paid']}}).sort('date', -1).limit(1):
            feed.append({'id': f"pay-{p['_id']}", 'type': 'payslip', 'title': 'Payslip', 'description': f"Your payslip for {p['period']} is available", 'at': p.get('released_at') or p.get('date'), 'link': '/payroll'})
    feed = [f for f in feed if f.get('at')]
    feed.sort(key=lambda f: str(f['at']), reverse=True)
    return feed[:12]


@csrf_exempt
@require_http_methods(["GET"])
def dashboard(request):
    today = _today()
    role = 'admin' if is_admin(request) else 'manager' if is_privileged(request) else 'employee'
    me = current_employee(request)
    scope = visible_refs(request)
    everyone = list(employees.find())
    active = [e for e in everyone if _is_active(e)]
    names = {str(e['_id']): emp_name(e) for e in everyone}
    in_scope = active if scope is None else [e for e in active if {str(e['_id']), e.get('employee_id', '')} & scope]

    # ---- attendance
    attendance = None
    if role in ('admin', 'manager'):
        from attendance.views import team_attendance
        data = _call(team_attendance, request)
        if data is not None:
            s = data.get('summary', {})
            attendance = {'title': 'Attendance today', 'weekend': bool(data.get('non_working_day')),
                          'rows': [] if data.get('non_working_day') else [
                              {'label': 'In', 'value': s.get('present', 0) + s.get('working', 0), 'tone': 'success'},
                              {'label': 'On leave', 'value': s.get('on_leave', 0), 'tone': 'info'},
                              {'label': 'Not in yet', 'value': s.get('absent', 0), 'tone': 'error'},
                              {'label': 'Late', 'value': s.get('late', 0), 'tone': 'warning'}]}
    elif me:
        month = today.strftime('%Y-%m')
        recs = [r for r in db['Attendance'].find({'employee_id': {'$in': [str(me['_id']), me.get('employee_id')]}, 'date': {'$regex': f'^{month}'}}) if r.get('clock_in')]
        hours = [float(r['total_hours']) for r in recs if (r.get('total_hours') or 0) > 0]
        attendance = {'title': 'My attendance this month', 'weekend': False, 'rows': [
            {'label': 'Days in', 'value': len(recs), 'tone': 'success'},
            {'label': 'Avg hours / day', 'value': round(sum(hours) / len(hours), 1) if hours else None, 'tone': 'info'}]}

    # ---- my leave balance
    leave_balance = None
    if me:
        from leaves.views import get_leave_balance
        bal = _call(get_leave_balance, request, me.get('employee_id') or str(me['_id']))
        if bal:
            leave_balance = {k: bal.get(k, {}) for k in ('entitlements', 'used', 'pending', 'remaining')}

    # ---- headline numbers
    month_start = today.replace(day=1)
    joined_month = sum(1 for e in active if (_date(e.get('hire_date')) or datetime.date.min) >= month_start)
    team_docs = list(db['Teams'].find({}, {'department': 1}))
    kpis = [{'id': 'employees', 'label': 'Employees', 'value': len(active), 'hint': f'{joined_month} joined this month', 'link': '/employees'},
            {'id': 'teams', 'label': 'Teams', 'value': len(team_docs), 'hint': f"{len({t.get('department') for t in team_docs if t.get('department')})} departments", 'link': '/teams'}]
    if role == 'manager':
        reports = [e for e in in_scope if me and str(e['_id']) != str(me['_id'])]
        kpis.append({'id': 'reports', 'label': 'Your team', 'value': len(reports), 'hint': 'people who report to you', 'link': '/teams'})
    if role == 'admin':
        open_jobs = db['jobs'].count_documents({'status': {'$in': ['Open', None]}})
        kpis.append({'id': 'jobs', 'label': 'Open positions', 'value': open_jobs, 'hint': f"{db['candidates'].count_documents({'stage': {'$nin': ['Hired', 'Rejected']}})} candidates in process", 'link': '/recruitment'})

    # ---- charts
    by_dept = {}
    for e in (active if role == 'admin' else in_scope if role == 'manager' else []):
        by_dept[e.get('department') or 'Unassigned'] = by_dept.get(e.get('department') or 'Unassigned', 0) + 1
    department_distribution = [{'label': k, 'value': v} for k, v in sorted(by_dept.items(), key=lambda kv: -kv[1])]
    hires = []
    if role == 'admin':
        for i in range(11, -1, -1):
            index = today.year * 12 + today.month - 1 - i
            y, m = divmod(index, 12)
            first = datetime.date(y, m + 1, 1)
            hires.append({'month': first.strftime('%b %Y'), 'value': sum(1 for e in everyone if (_date(e.get('hire_date')) or datetime.date.min).replace(day=1) == first)})

    upcoming_holidays = [h for h in get_settings()['general'].get('holidays', []) if h.get('date', '') >= today.isoformat()][:3]
    out_today = []
    iso = today.isoformat()
    if today.weekday() < 5:
        for l in db['Leaves'].find({'status': 'Approved', 'start_date': {'$lte': iso}, 'end_date': {'$gte': iso}}):
            who = l.get('employee_name')
            if who:
                out_today.append({'name': who, 'leave_type': l.get('leave_type', 'Leave'), 'until': l.get('end_date')})

    return JsonResponse({
        'role': role, 'generated_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
        'attention': _attention(request, role, me, today, scope), 'kpis': kpis, 'attendance': attendance, 'leave_balance': leave_balance,
        'holidays': upcoming_holidays, 'department_distribution': department_distribution, 'hires_by_month': hires,
        'out_today': sorted(out_today, key=lambda r: r['name'])[:10], 'people': _people(today, active),
        'activity': _activity(request, role, me, today, active, names),
    })
