"""
Integration hub: outbound webhooks (events -> external systems) and employee CSV export / import
(for moving data to or from Workday, BambooHR, SAP or a spreadsheet).
"""
import csv
import datetime
import io
import secrets

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db, employees
from utils.events import EVENTS, _send, host_is_public, webhooks
from utils.hr_common import body, error, now_iso, oid, serialize
from utils.auth_utils import forbidden


def _admin(request):
    return getattr(request, 'role', '') == 'Admin'


def _public(hook):
    out = serialize(hook)
    out['secret'] = (out.get('secret') or '')[:4] + '...'   # the secret is only shown once, on creation
    return out


@csrf_exempt
@require_http_methods(["GET", "POST"])
def webhooks_handler(request):
    """GET lists webhooks, POST {name, url, events} registers one (Admin). The signing secret is returned once."""
    if not _admin(request):
        return forbidden('Admin role required')
    if request.method == 'GET':
        return JsonResponse({'success': True, 'events': list(EVENTS),
                             'webhooks': [_public(h) for h in webhooks.find().sort('created_at', -1)]})
    data = body(request)
    url, name = str(data.get('url') or '').strip(), str(data.get('name') or '').strip()
    events = [e for e in data.get('events') or [] if e in EVENTS or e == '*']
    if not name or not events:
        return error('name and at least one valid event are required')
    if not host_is_public(url):
        return error('url must be a public http(s) address')
    secret = secrets.token_hex(24)
    doc = {'name': name[:80], 'url': url, 'events': events, 'secret': secret, 'active': True, 'created_at': now_iso()}
    doc['_id'] = webhooks.insert_one(dict(doc)).inserted_id
    out = serialize(doc)          # full secret returned this once
    return JsonResponse({'success': True, 'webhook': out}, status=201)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def webhook_detail(request, webhook_id):
    if not _admin(request):
        return forbidden('Admin role required')
    _id = oid(webhook_id)
    hook = webhooks.find_one({'_id': _id}) if _id else None
    if not hook:
        return error('Webhook not found', 404)
    if request.method == 'DELETE':
        webhooks.delete_one({'_id': _id})
        return JsonResponse({'success': True})
    data = body(request)
    update = {}
    if 'active' in data:
        update['active'] = bool(data['active'])
    if 'events' in data:
        events = [e for e in data['events'] if e in EVENTS or e == '*']
        if not events:
            return error('at least one valid event is required')
        update['events'] = events
    if 'url' in data:
        if not host_is_public(str(data['url'])):
            return error('url must be a public http(s) address')
        update['url'] = str(data['url']).strip()
    if update:
        webhooks.update_one({'_id': _id}, {'$set': update})
    return JsonResponse({'success': True, 'webhook': _public(webhooks.find_one({'_id': _id}))})


@csrf_exempt
@require_http_methods(["POST"])
def webhook_test(request, webhook_id):
    """Send a `ping` event to the endpoint and report the result."""
    if not _admin(request):
        return forbidden('Admin role required')
    _id = oid(webhook_id)
    hook = webhooks.find_one({'_id': _id}) if _id else None
    if not hook:
        return error('Webhook not found', 404)
    ok = _send(hook, 'ping', {'message': 'Test delivery from HR Dashboard'})
    return JsonResponse({'success': ok, 'last_delivery': webhooks.find_one({'_id': _id}).get('last_delivery')})


EXPORT_FIELDS = ['employee_id', 'first_name', 'last_name', 'email', 'phone', 'position', 'department', 'hire_date',
                 'employment_status', 'salary', 'manager_id']


@csrf_exempt
@require_http_methods(["GET"])
def export_employees(request):
    """GET /api/integrations/employees/export/ - CSV of all employees (Admin; includes salary)."""
    if not _admin(request):
        return forbidden('Admin role required')
    from ai_analytics.insights import Context
    ctx = Context(attendance_days=1)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(EXPORT_FIELDS)
    for e in ctx.employees:
        row = {**e, 'department': ctx.dept(e)}
        writer.writerow([row.get(f, '') for f in EXPORT_FIELDS])
    response = HttpResponse(buf.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="employees.csv"'
    return response


@csrf_exempt
@require_http_methods(["POST"])
def import_employees(request):
    """
    POST /api/integrations/employees/import/ (Admin) - multipart `file` (CSV) or raw CSV body.
    Required columns: first_name, last_name, email, employee_id. Optional: phone, position, department, hire_date,
    salary. Existing employees (same employee_id or email) are skipped. `?dry_run=true` validates without writing.
    """
    if not _admin(request):
        return forbidden('Admin role required')
    upload = request.FILES.get('file')
    raw = upload.read() if upload else request.body
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return error('The file must be UTF-8 encoded CSV')
    reader = csv.DictReader(io.StringIO(text))
    headers = {(h or '').strip().lower() for h in (reader.fieldnames or [])}
    missing = {'first_name', 'last_name', 'email', 'employee_id'} - headers
    if missing:
        return error(f"Missing required column(s): {', '.join(sorted(missing))}")
    dry_run = request.GET.get('dry_run', '').lower() in ('1', 'true', 'yes')
    departments = {d['name'].lower(): str(d['_id']) for d in db['Departments'].find()}
    created, skipped, errors = 0, [], []
    for line, row in enumerate(reader, start=2):
        row = {(k or '').strip().lower(): (v or '').strip() for k, v in row.items()}
        if not (row.get('first_name') and row.get('last_name') and row.get('email') and row.get('employee_id')):
            errors.append({'line': line, 'error': 'first_name, last_name, email and employee_id are required'})
            continue
        if '@' not in row['email']:
            errors.append({'line': line, 'error': f"invalid email '{row['email']}'"})
            continue
        if employees.find_one({'$or': [{'employee_id': row['employee_id']}, {'email': row['email'].lower()}]}):
            skipped.append({'line': line, 'reason': 'already exists', 'employee_id': row['employee_id']})
            continue
        doc = {'employee_id': row['employee_id'], 'first_name': row['first_name'], 'last_name': row['last_name'],
               'email': row['email'].lower(), 'phone': row.get('phone', ''), 'position': row.get('position', ''),
               'employment_status': 'Active', 'skills': [], 'documents': [],
               'hire_date': row.get('hire_date') or datetime.date.today().isoformat(),
               'created_at': now_iso()}
        if row.get('department'):
            dept_id = departments.get(row['department'].lower())
            if not dept_id:
                errors.append({'line': line, 'error': f"unknown department '{row['department']}'"})
                continue
            doc['department_id'], doc['department'] = dept_id, row['department']
        if row.get('salary'):
            try:
                doc['salary'] = float(row['salary'].replace(',', ''))
            except ValueError:
                errors.append({'line': line, 'error': f"invalid salary '{row['salary']}'"})
                continue
        if not dry_run:
            inserted = employees.insert_one(doc)
            doc['_id'] = inserted.inserted_id
            try:
                from onboarding.views import start_onboarding
                from utils.events import emit
                start_onboarding(doc)
                emit('employee.created', {'employee_id': doc['employee_id'], 'name': f"{doc['first_name']} {doc['last_name']}", 'email': doc['email']})
            except Exception:
                pass
        created += 1
    return JsonResponse({'success': not errors, 'dry_run': dry_run, 'created': created, 'skipped': skipped, 'errors': errors})
