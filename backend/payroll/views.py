"""
Payroll for an Indian company: payslips in the `Payroll` collection, built by payroll/engine.py.

Pay-run workflow (HR / administrators):
    generate  -> payslips are created as *Draft* (only HR sees them) and can be recalculated and adjusted
    release   -> Draft becomes *Processed*: employees can see and download their payslip and are notified
    mark paid -> Processed becomes *Paid* and the month is locked

Employee `salary` is the annual CTC in rupees. Loss-of-pay leave, joining and leaving mid-month change the days paid.
One-off adjustments (bonus, arrears, recoveries) live in `PayrollAdjustments` so they survive a recalculation.
"""
import csv
import datetime
import io
import json
import re

from bson import ObjectId
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db, employees
from payroll import engine
from utils.app_settings import get_settings
from utils.auth_utils import forbidden, is_admin, owns_employee
from utils.events import emit
from utils.notify import notify, user_id_for_employee
from utils.workdays import holiday_map, workdays

payroll_collection = db['Payroll']
adjustments_collection = db['PayrollAdjustments']

PRIVILEGED = ('Admin', 'HR')
IFSC_RE = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')
PAN_RE = re.compile(r'^[A-Z]{5}[0-9]{4}[A-Z]$')
STANDARD_DAY_HOURS = 8.0
HOURS_PER_MONTH = 173.33          # 2080 working hours / 12


# ------------------------------------------------------------------------------------------------ helpers

def _employee_for(ref):
    ref = str(ref or '')
    if not ref:
        return None
    emp = employees.find_one({'employee_id': ref})
    if not emp and len(ref) == 24:
        try:
            emp = employees.find_one({'_id': ObjectId(ref)})
        except Exception:
            emp = None
    return emp


def _keys(emp):
    return [str(emp['_id']), emp.get('employee_id')]


def _body(request):
    try:
        data = json.loads(request.body or '{}')
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _fail(message, status=400):
    return JsonResponse({'success': False, 'message': message, 'error': message}, status=status)


def _require_admin(request):
    if not is_admin(request):
        return _fail('Admin role required', 403)
    return None


def _serialize(doc):
    doc = dict(doc)
    doc['_id'] = str(doc['_id'])
    return doc


def _period_label(dt=None):
    return (dt or datetime.datetime.now()).strftime('%B %Y')


def _valid_period(period):
    try:
        datetime.datetime.strptime(period, '%B %Y')
        return True
    except (TypeError, ValueError):
        return False


def _date(value):
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def overtime_hours(emp, period):
    """Hours beyond 8 per attendance day in the pay period."""
    try:
        month = datetime.datetime.strptime(period, '%B %Y')
    except ValueError:
        return 0.0
    prefix = month.strftime('%Y-%m')
    total = 0.0
    for rec in db['Attendance'].find({'employee_id': {'$in': _keys(emp)}, 'date': {'$regex': f'^{prefix}'}}):
        hours = rec.get('hours_worked', rec.get('total_hours'))
        try:
            total += max(float(hours) - STANDARD_DAY_HOURS, 0)
        except (TypeError, ValueError):
            pass
    return round(total, 2)


def lop_days(emp, start, end, holidays):
    """Approved loss-of-pay leave days that fall on working days between start and end."""
    window = set(workdays(start, end, holidays))
    days = set()
    for leave in db['Leaves'].find({'employee_id': {'$in': _keys(emp)}, 'leave_type': 'LOP Leaves', 'status': 'Approved'}):
        a, b = _date(leave.get('start_date')), _date(leave.get('end_date'))
        if not a or not b:
            continue
        d = a
        while d <= b:
            if d in window:
                days.add(d)
            d += datetime.timedelta(days=1)
    return len(days)


def _adjustments_for(emp, period):
    return list(adjustments_collection.find({'employee_id': str(emp['_id']), 'period': period}))


def _mask(value, keep=4):
    value = str(value or '')
    return ('X' * max(len(value) - keep, 0)) + value[-keep:] if value else ''


def build_payslip(emp, period, rates=None, holidays=None):
    """
    The payslip document for one employee and month (no status or date), or None when they were not employed that month
    or have no salary. Pass `rates` / `holidays` when building many slips to avoid reading settings each time.
    """
    annual = float(emp.get('salary') or 0)
    if annual <= 0:
        return None
    settings = get_settings()
    rates = rates or settings['payroll']
    holidays = holiday_map() if holidays is None else holidays
    first, last = engine.month_bounds(period)
    hired, left = _date(emp.get('hire_date')), _date(emp.get('termination_date'))
    if (hired and hired > last) or (left and left < first):
        return None
    start, end = max(first, hired or first), min(last, left or last)
    total_days = len(workdays(first, last, holidays))
    in_window = len(workdays(start, end, holidays))
    lop = min(lop_days(emp, start, end, holidays), in_window)
    paid_days = max(in_window - lop, 0)
    ratio = paid_days / total_days if total_days else 1.0

    earnings, deductions = [], []
    items = [{'name': i['name'], 'kind': i['kind'], 'amount': float(i['amount'])} for i in emp.get('pay_items', []) if i.get('amount')]
    for i in items:
        (earnings if i['kind'] == 'benefit' else deductions).append((i['name'], i['amount']))
    adjustments = [{'name': a['name'], 'kind': a['kind'], 'amount': float(a['amount']), 'id': str(a['_id'])} for a in _adjustments_for(emp, period)]
    for a in adjustments:
        (earnings if a['kind'] == 'earning' else deductions).append((a['name'], a['amount']))

    hours, overtime_pay = 0.0, 0.0
    if rates.get('payOvertime'):
        hours = overtime_hours(emp, period)
        hourly = annual / 12 / HOURS_PER_MONTH
        overtime_pay = hours * hourly * rates.get('overtimeMultiplier', 1.5)
    c = engine.compute(annual, rates, ratio, overtime_pay, earnings, deductions)
    bank = emp.get('bank_details') or {}
    return {
        'employee_id': str(emp['_id']), 'employee_code': emp.get('employee_id', ''),
        'employee_name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
        'designation': emp.get('position', ''), 'department': emp.get('department', ''), 'location': emp.get('location', ''),
        'date_of_joining': emp.get('hire_date', ''), 'pan': emp.get('tax_id', ''), 'uan': emp.get('uan', ''),
        'bank_name': bank.get('bank_name', ''), 'bank_account': bank.get('account_number', ''), 'ifsc': bank.get('ifsc') or bank.get('routing_code', ''),
        'period': period, 'working_days': total_days, 'paid_days': paid_days, 'lop_days': lop,
        'ctc_monthly': c['ctc_monthly'], 'basic': c['basic'], 'hra': c['hra'], 'special_allowance': c['special_allowance'],
        'allowances': c['special_allowance'], 'gross_salary': c['earnings_total'], 'overtime_hours': hours, 'overtime_pay': c['overtime_pay'],
        'benefits_total': c['extra_earnings'], 'provident_fund': c['provident_fund'], 'esi': c['esi'], 'professional_tax': c['professional_tax'],
        'tax': c['tax'], 'deductions_total': c['other_deductions'], 'total_deductions': c['total_deductions'], 'net_salary': c['net_salary'],
        'employer_pf': c['employer_pf'], 'employer_esi': c['employer_esi'], 'pay_items': items, 'adjustments': adjustments,
        'amount_in_words': engine.rupees_in_words(c['net_salary']),
    }


def _financial_year(date):
    year = date.year if date.month >= 4 else date.year - 1
    return datetime.date(year, 4, 1), datetime.date(year + 1, 3, 31)


def ytd(slip):
    """Financial-year-to-date totals (April to the slip's pay date) from released and paid payslips."""
    pay_date = _date(slip.get('date')) or datetime.date.today()
    fy_start, _ = _financial_year(pay_date)
    totals = {'earnings': 0, 'provident_fund': 0, 'tax': 0, 'net': 0}
    for s in payroll_collection.find({'employee_id': slip['employee_id'], 'status': {'$ne': 'Draft'},
                                      'date': {'$gte': fy_start.isoformat(), '$lte': pay_date.isoformat()}}):
        totals['earnings'] += s.get('gross_salary', 0)
        totals['provident_fund'] += s.get('provident_fund', 0)
        totals['tax'] += s.get('tax', 0)
        totals['net'] += s.get('net_salary', 0)
    return totals


def _can_see_slip(request, slip):
    if getattr(request, 'role', '') in PRIVILEGED:
        return True
    me = _employee_for(getattr(request, 'employee_id', None))
    return bool(me) and slip.get('status') != 'Draft' and str(slip.get('employee_id')) in [str(k) for k in _keys(me)]


# ------------------------------------------------------------------------------------------------ employee views

@csrf_exempt
@require_http_methods(["GET"])
def get_my_payroll(request):
    """GET /api/payroll/me/ - released payslips for the current employee (newest first)."""
    emp = _employee_for(getattr(request, 'employee_id', None))
    if not emp:
        return _fail('Not linked to an employee profile')
    records = payroll_collection.find({'employee_id': {'$in': _keys(emp)}, 'status': {'$ne': 'Draft'}}).sort('date', -1)
    return JsonResponse({'success': True, 'results': [_serialize(r) for r in records]})


@csrf_exempt
@require_http_methods(["GET"])
def payroll_summary(request):
    """GET /api/payroll/summary/ - this month's projected pay for the current employee (numbers in rupees)."""
    emp = _employee_for(getattr(request, 'employee_id', None))
    if not emp:
        return _fail('Not linked to an employee profile')
    slip = build_payslip(emp, _period_label()) if emp.get('salary') else None
    if not slip:
        return JsonResponse({'success': True, 'summary': None, 'message': 'No salary recorded'})
    bank = emp.get('bank_details') or {}
    return JsonResponse({
        'success': True, 'period': slip['period'],
        'summary': {k: slip[k] for k in ('basic', 'hra', 'special_allowance', 'gross_salary', 'provident_fund', 'esi', 'professional_tax', 'tax',
                                         'total_deductions', 'net_salary', 'ctc_monthly', 'employer_pf', 'pay_items', 'paid_days', 'working_days', 'lop_days')},
        'annual_ctc': float(emp.get('salary') or 0),
        'missing': [name for name, ok in (('bank account', bool(bank.get('account_number'))), ('PAN', bool(emp.get('tax_id'))),
                                           ('IFSC code', bool(bank.get('ifsc') or bank.get('routing_code')))) if not ok],
    })


@csrf_exempt
@require_http_methods(["GET"])
def payslip_detail(request, payslip_id):
    """GET /api/payroll/payslip/<id>/ - everything needed to show one payslip on screen (owner once released, or HR)."""
    try:
        slip = payroll_collection.find_one({'_id': ObjectId(payslip_id)})
    except Exception:
        return _fail('Invalid payslip id')
    if not slip or not _can_see_slip(request, slip):
        return _fail('Payslip not found', 404)
    out = _serialize(slip)
    out['ytd'] = ytd(slip)
    out['company'] = get_settings()['general']['companyName']
    out['pan_masked'] = _mask(slip.get('pan'), 5)
    out['bank_account_masked'] = _mask(slip.get('bank_account'), 4)
    return JsonResponse({'success': True, 'payslip': out})


# ------------------------------------------------------------------------------------------------ HR: pay run

def _run_status(slips):
    if not slips:
        return 'Not generated'
    if all(s['status'] == 'Paid' for s in slips):
        return 'Paid'
    if any(s['status'] == 'Draft' for s in slips):
        return 'Draft'
    return 'Released'


def _checks(period, slips):
    """Things HR should look at before releasing money: gaps in the data and unusual amounts."""
    first, last = engine.month_bounds(period)
    active = [e for e in employees.find() if str(e.get('employment_status') or 'Active').lower() == 'active']
    by_emp = {s['employee_id']: s for s in slips}
    checks = []

    def add(severity, title, detail, names):
        if names:
            checks.append({'severity': severity, 'title': title, 'detail': detail, 'employees': sorted(names)})

    name = lambda e: f"{e.get('first_name', '')} {e.get('last_name', '')}".strip()
    add('error', 'No salary recorded', 'These employees get no payslip until their CTC is set (Salary structure tab).',
        [name(e) for e in active if not e.get('salary')])
    add('error', 'Bank details missing', 'Their salary cannot be transferred. Add the account number and IFSC code on the employee profile.',
        [s['employee_name'] for s in slips if not (s.get('bank_account') and s.get('ifsc'))])
    add('warning', 'PAN missing', 'Without a PAN, TDS is deducted at a higher rate by law. Collect it from the employee.',
        [s['employee_name'] for s in slips if not s.get('pan')])
    add('info', 'Loss of pay this month', 'Approved unpaid leave reduces the days paid.',
        [f"{s['employee_name']} ({s['lop_days']} day{'s' if s['lop_days'] != 1 else ''})" for s in slips if s.get('lop_days')])
    add('info', 'Joined this month', 'Paid for the days from the joining date only.',
        [s['employee_name'] for s in slips if (_date(s.get('date_of_joining')) or datetime.date.min) >= first])
    add('info', 'Left this month', 'Paid up to the last working day.',
        [name(e) for e in employees.find() if first <= (_date(e.get('termination_date')) or datetime.date.min) <= last])
    add('info', 'One-off adjustments applied', 'Bonus, arrears or recoveries added for this month.',
        [f"{s['employee_name']} ({len(s['adjustments'])})" for s in slips if s.get('adjustments')])
    add('warning', 'Not in this run', 'Active employees with a salary but no payslip for this month.',
        [name(e) for e in active if e.get('salary') and str(e['_id']) not in by_emp and not ((_date(e.get('hire_date')) or datetime.date.min) > last)])
    return checks


@csrf_exempt
@require_http_methods(["GET"])
def run_summary(request):
    """GET /api/payroll/run/?period=October 2026 - status, totals and pre-release checks of one pay run (HR)."""
    denied = _require_admin(request)
    if denied:
        return denied
    period = request.GET.get('period') or _period_label()
    if not _valid_period(period):
        return _fail("period must look like 'October 2026'")
    slips = list(payroll_collection.find({'period': period}))
    total = lambda key: sum(s.get(key, 0) for s in slips)
    return JsonResponse({
        'success': True, 'period': period, 'status': _run_status(slips),
        'totals': {'employees': len(slips), 'gross': total('gross_salary'), 'deductions': total('total_deductions'), 'net': total('net_salary'),
                   'employer_cost': total('gross_salary') + total('employer_pf') + total('employer_esi'),
                   'provident_fund': total('provident_fund'), 'employer_pf': total('employer_pf'), 'esi': total('esi') + total('employer_esi'),
                   'professional_tax': total('professional_tax'), 'tds': total('tax'), 'lop_days': total('lop_days')},
        'checks': _checks(period, slips),
        'counts': {s: sum(1 for x in slips if x['status'] == s) for s in ('Draft', 'Processed', 'Paid')},
    })


@csrf_exempt
@require_http_methods(["GET"])
def list_payroll(request):
    """GET /api/payroll/?period=September 2026 - every payslip of the period, drafts included (HR)."""
    denied = _require_admin(request)
    if denied:
        return denied
    query = {'period': request.GET['period']} if request.GET.get('period') else {}
    records = payroll_collection.find(query).sort([('date', -1), ('employee_name', 1)])
    return JsonResponse({'success': True, 'results': [_serialize(r) for r in records]})


def _pay_date(period):
    return engine.month_bounds(period)[1].isoformat()


def _save_slip(emp, period, rates, holidays, status_if_new='Draft'):
    """Create or refresh one payslip. Returns 'created', 'updated' or 'skipped' (locked or not payable)."""
    slip = build_payslip(emp, period, rates, holidays)
    if not slip:
        return 'skipped'
    existing = payroll_collection.find_one({'employee_id': slip['employee_id'], 'period': period})
    if existing and existing.get('status') == 'Paid':
        return 'skipped'
    slip['date'] = _pay_date(period)
    slip['status'] = existing['status'] if existing else status_if_new
    if existing:
        payroll_collection.update_one({'_id': existing['_id']}, {'$set': slip})
        return 'updated'
    slip['created_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    payroll_collection.insert_one(slip)
    return 'created'


@csrf_exempt
@require_http_methods(["POST"])
def generate_payroll(request):
    """
    POST /api/payroll/generate/ {"period": "October 2026"} (HR)
    Creates draft payslips for every active employee with a salary and recalculates drafts and released slips (never paid ones).
    """
    denied = _require_admin(request)
    if denied:
        return denied
    period = _body(request).get('period') or _period_label()
    if not _valid_period(period):
        return _fail("period must look like 'October 2026'")
    rates, holidays = get_settings()['payroll'], holiday_map()
    counts = {'created': 0, 'updated': 0, 'skipped': 0}
    for emp in employees.find():
        status = str(emp.get('employment_status') or 'Active').lower()
        terminated_here = _date(emp.get('termination_date')) and engine.month_bounds(period)[0] <= _date(emp.get('termination_date'))
        if status != 'active' and not terminated_here:
            counts['skipped'] += 1
            continue
        counts[_save_slip(emp, period, rates, holidays)] += 1
    emit('payroll.generated', {'period': period, **{k: counts[k] for k in ('created', 'updated')}})
    return JsonResponse({'success': True, 'period': period, **counts})


@csrf_exempt
@require_http_methods(["POST"])
def release_payroll(request):
    """POST /api/payroll/release/ {"period"} (HR): Draft -> Processed. Employees can now see their payslip and are notified."""
    denied = _require_admin(request)
    if denied:
        return denied
    period = _body(request).get('period') or _period_label()
    drafts = list(payroll_collection.find({'period': period, 'status': 'Draft'}))
    if not drafts:
        return _fail('There are no draft payslips to release for this month. Generate them first.')
    missing_bank = [d['employee_name'] for d in drafts if not (d.get('bank_account') and d.get('ifsc'))]
    if missing_bank and not _body(request).get('force'):
        return JsonResponse({'success': False, 'error': 'Some employees have no bank details', 'message': 'Some employees have no bank details.',
                             'needs_confirmation': True, 'employees': sorted(missing_bank)}, status=409)
    payroll_collection.update_many({'period': period, 'status': 'Draft'}, {'$set': {'status': 'Processed', 'released_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()}})
    for d in drafts:
        notify(user_id_for_employee(d['employee_id']), f'Payslip for {period} is ready', 'Open Payroll to view or download it.', type='payroll')
    return JsonResponse({'success': True, 'period': period, 'released': len(drafts)})


@csrf_exempt
@require_http_methods(["POST"])
def mark_paid(request):
    """POST /api/payroll/mark-paid/ {"period"} (HR): Processed -> Paid and the month is locked."""
    denied = _require_admin(request)
    if denied:
        return denied
    period = _body(request).get('period') or _period_label()
    if payroll_collection.count_documents({'period': period, 'status': 'Draft'}):
        return _fail('Release the draft payslips before marking the month as paid.')
    result = payroll_collection.update_many({'period': period, 'status': 'Processed'}, {'$set': {'status': 'Paid', 'paid_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()}})
    return JsonResponse({'success': True, 'period': period, 'updated': result.modified_count})


# ------------------------------------------------------------------------------------------------ HR: adjustments

@csrf_exempt
@require_http_methods(["GET", "POST"])
def adjustments(request):
    """
    GET  /api/payroll/adjustments/?period= - one-off earnings / deductions of the month (HR)
    POST /api/payroll/adjustments/ {employee_id, period, kind: earning|deduction, name, amount} (HR): recalculates that payslip
    """
    denied = _require_admin(request)
    if denied:
        return denied
    if request.method == 'GET':
        query = {'period': request.GET['period']} if request.GET.get('period') else {}
        return JsonResponse({'success': True, 'results': [_serialize(a) for a in adjustments_collection.find(query).sort('created_at', -1)]})
    data = _body(request)
    emp = _employee_for(data.get('employee_id'))
    period = data.get('period') or _period_label()
    if not emp or not _valid_period(period):
        return _fail('Choose an employee and a month')
    try:
        amount = round(float(data.get('amount')), 2)
    except (TypeError, ValueError):
        return _fail('Amount must be a number')
    name = str(data.get('name') or '').strip()[:80]
    if data.get('kind') not in ('earning', 'deduction') or not name or not 0 < amount <= 100_000_000:
        return _fail('Give a name, whether it is an earning or a deduction, and a positive amount')
    if payroll_collection.find_one({'employee_id': str(emp['_id']), 'period': period, 'status': 'Paid'}):
        return _fail('This month is already paid and locked.', 409)
    doc = {'employee_id': str(emp['_id']), 'period': period, 'kind': data['kind'], 'name': name, 'amount': amount,
           'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(), 'created_by': str(getattr(request, 'user_id', ''))}
    doc['_id'] = adjustments_collection.insert_one(dict(doc)).inserted_id
    _save_slip_if_exists(emp, period)
    return JsonResponse({'success': True, 'adjustment': _serialize(doc)}, status=201)


def _save_slip_if_exists(emp, period):
    if payroll_collection.find_one({'employee_id': str(emp['_id']), 'period': period}):
        _save_slip(emp, period, get_settings()['payroll'], holiday_map())


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_adjustment(request, adjustment_id):
    denied = _require_admin(request)
    if denied:
        return denied
    try:
        doc = adjustments_collection.find_one({'_id': ObjectId(adjustment_id)})
    except Exception:
        doc = None
    if not doc:
        return _fail('Adjustment not found', 404)
    if payroll_collection.find_one({'employee_id': doc['employee_id'], 'period': doc['period'], 'status': 'Paid'}):
        return _fail('This month is already paid and locked.', 409)
    adjustments_collection.delete_one({'_id': doc['_id']})
    emp = _employee_for(doc['employee_id'])
    if emp:
        _save_slip_if_exists(emp, doc['period'])
    return JsonResponse({'success': True})


# ------------------------------------------------------------------------------------------------ exports

def _csv_response(rows, filename):
    buf = io.StringIO()
    csv.writer(buf).writerows(rows)
    response = HttpResponse(buf.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@csrf_exempt
@require_http_methods(["GET"])
def export_payroll(request):
    """
    GET /api/payroll/export/?period=&kind=register|bank|statutory (HR)
      register  - every component of every payslip
      bank      - the salary transfer file for the bank (name, account, IFSC, amount) for slips that are Processed or Paid
      statutory - PF, ESI, professional tax and TDS per employee, for the monthly challans and returns
    """
    denied = _require_admin(request)
    if denied:
        return denied
    period = request.GET.get('period') or ''
    kind = request.GET.get('kind', 'register')
    query = {'period': period} if period else {}
    slips = list(payroll_collection.find(query).sort([('date', -1), ('employee_name', 1)]))
    tag = period.replace(' ', '-').lower() or 'all'
    if kind == 'bank':
        rows = [['Employee ID', 'Account holder', 'Bank', 'Account number', 'IFSC', 'Amount (INR)', 'Narration']]
        for s in slips:
            if s['status'] == 'Draft' or not (s.get('bank_account') and s.get('ifsc')):
                continue
            holder = (employees.find_one({'_id': ObjectId(s['employee_id'])}) or {}).get('bank_details', {}).get('account_holder') or s['employee_name']
            rows.append([s['employee_code'], holder, s.get('bank_name', ''), s['bank_account'], s['ifsc'], s['net_salary'], f"Salary {s['period']}"])
        return _csv_response(rows, f'bank-transfer-{tag}.csv')
    if kind == 'statutory':
        rows = [['Employee ID', 'Name', 'PAN', 'UAN', 'Gross', 'PF wage (basic)', 'Employee PF', 'Employer PF', 'Employee ESI', 'Employer ESI', 'Professional tax', 'TDS']]
        for s in slips:
            rows.append([s['employee_code'], s['employee_name'], s.get('pan', ''), s.get('uan', ''), s['gross_salary'], s['basic'], s['provident_fund'],
                         s.get('employer_pf', 0), s.get('esi', 0), s.get('employer_esi', 0), s.get('professional_tax', 0), s['tax']])
        rows.append(['', 'TOTAL', '', '', *[sum(r[i] for r in rows[1:]) for i in range(4, 12)]])
        return _csv_response(rows, f'statutory-{tag}.csv')
    cols = ['employee_code', 'employee_name', 'department', 'period', 'working_days', 'paid_days', 'lop_days', 'basic', 'hra', 'special_allowance',
            'benefits_total', 'overtime_pay', 'gross_salary', 'provident_fund', 'esi', 'professional_tax', 'tax', 'deductions_total',
            'total_deductions', 'net_salary', 'employer_pf', 'employer_esi', 'status', 'date']
    return _csv_response([cols] + [[s.get(c, '') for c in cols] for s in slips], f'payroll-register-{tag}.csv')


@csrf_exempt
@require_http_methods(["GET"])
def payslip_pdf(request, payslip_id):
    """GET /api/payroll/payslip/<id>/pdf/ - PDF payslip (owner once released, or HR)."""
    try:
        slip = payroll_collection.find_one({'_id': ObjectId(payslip_id)})
    except Exception:
        return _fail('Invalid payslip id')
    if not slip:
        return _fail('Payslip not found', 404)
    if not _can_see_slip(request, slip):
        return _fail('Permission denied', 403)

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    company = get_settings()['general']['companyName']
    money = lambda v: engine.inr(v, symbol='')
    styles = getSampleStyleSheet()
    small = ParagraphStyle('small', parent=styles['Normal'], fontSize=8, textColor=colors.grey)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=f"Payslip {slip.get('period', '')} - {slip.get('employee_name', '')}",
                            leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=14 * mm)
    grey = colors.HexColor('#f1f1f1')

    info = [
        ['Employee name', slip.get('employee_name', ''), 'Employee ID', slip.get('employee_code', '')],
        ['Designation', slip.get('designation', '') or '-', 'Department', slip.get('department', '') or '-'],
        ['Date of joining', slip.get('date_of_joining', '') or '-', 'Location', slip.get('location', '') or '-'],
        ['PAN', _mask(slip.get('pan'), 5) or '-', 'UAN', slip.get('uan', '') or '-'],
        ['Bank', slip.get('bank_name', '') or '-', 'Account number', _mask(slip.get('bank_account'), 4) or '-'],
        ['Working days', str(slip.get('working_days', '')), 'Days paid', f"{slip.get('paid_days', '')}  (loss of pay: {slip.get('lop_days', 0)})"],
    ]
    info_table = Table(info, colWidths=[32 * mm, 56 * mm, 32 * mm, 56 * mm])
    info_table.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 9), ('TEXTCOLOR', (0, 0), (0, -1), colors.grey), ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
                                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOX', (0, 0), (-1, -1), 0.5, colors.grey)]))

    earnings = [('Basic', slip.get('basic', 0)), ('House rent allowance', slip.get('hra', 0)), ('Special allowance', slip.get('special_allowance', slip.get('allowances', 0)))]
    deductions = [('Provident fund', slip.get('provident_fund', 0)), ('ESI', slip.get('esi', 0)), ('Professional tax', slip.get('professional_tax', 0)),
                  ('Income tax (TDS)', slip.get('tax', 0))]
    if slip.get('overtime_pay'):
        earnings.append(('Overtime', slip['overtime_pay']))
    for item in slip.get('pay_items', []):
        (earnings if item['kind'] == 'benefit' else deductions).append((item['name'], item['amount']))
    for item in slip.get('adjustments', []):
        (earnings if item['kind'] == 'earning' else deductions).append((item['name'], item['amount']))
    deductions = [d for d in deductions if d[1] or d[0] in ('Provident fund', 'Income tax (TDS)')]
    rows = [['Earnings', 'Amount (Rs.)', 'Deductions', 'Amount (Rs.)']]
    for i in range(max(len(earnings), len(deductions))):
        e = earnings[i] if i < len(earnings) else ('', None)
        d = deductions[i] if i < len(deductions) else ('', None)
        rows.append([e[0], money(e[1]) if e[1] is not None else '', d[0], money(d[1]) if d[1] is not None else ''])
    rows.append(['Gross earnings', money(slip.get('gross_salary', 0)), 'Total deductions', money(slip.get('total_deductions', 0))])
    pay = Table(rows, colWidths=[52 * mm, 36 * mm, 52 * mm, 36 * mm])
    pay.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#222222')), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'), ('BACKGROUND', (0, -1), (-1, -1), grey),
        ('FONTSIZE', (0, 0), (-1, -1), 9), ('ALIGN', (1, 0), (1, -1), 'RIGHT'), ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, -2), 0.25, colors.lightgrey), ('BOX', (0, 0), (-1, -1), 0.5, colors.grey), ('LINEAFTER', (1, 0), (1, -1), 0.5, colors.grey),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    net = Table([[f"Net pay   Rs. {money(slip.get('net_salary', 0))}"], [slip.get('amount_in_words') or engine.rupees_in_words(slip.get('net_salary', 0))]],
                colWidths=[176 * mm])
    net.setStyle(TableStyle([('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (0, 0), 13), ('FONTSIZE', (0, 1), (0, 1), 9),
                             ('BOX', (0, 0), (-1, -1), 1, colors.black), ('BACKGROUND', (0, 0), (-1, -1), grey)]))
    y = ytd(slip)
    ytd_table = Table([['Year to date (April onwards)', 'Gross earnings', 'Provident fund', 'Income tax (TDS)', 'Net pay'],
                       ['', money(y['earnings']), money(y['provident_fund']), money(y['tax']), money(y['net'])]], colWidths=[52 * mm, 31 * mm, 31 * mm, 31 * mm, 31 * mm])
    ytd_table.setStyle(TableStyle([('FONTSIZE', (0, 0), (-1, -1), 8), ('TEXTCOLOR', (0, 0), (-1, 0), colors.grey), ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                                   ('BOX', (0, 0), (-1, -1), 0.25, colors.lightgrey)]))
    employer_note = (f"Employer contributions this month: provident fund Rs. {money(slip.get('employer_pf', 0))}"
                     + (f", ESI Rs. {money(slip.get('employer_esi', 0))}" if slip.get('employer_esi') else '')
                     + f". Monthly CTC Rs. {money(slip.get('ctc_monthly', 0))}.")
    doc.build([
        Paragraph(f"<b>{company}</b>", ParagraphStyle('co', parent=styles['Title'], fontSize=18, spaceAfter=2)),
        Paragraph(f"Payslip for {slip.get('period', '')}", ParagraphStyle('sub', parent=styles['Normal'], fontSize=11, alignment=1, spaceAfter=10)),
        info_table, Spacer(1, 8), pay, Spacer(1, 8), net, Spacer(1, 8), ytd_table, Spacer(1, 6),
        Paragraph(employer_note, small), Spacer(1, 4),
        Paragraph('This is a computer-generated payslip and does not need a signature. Income tax is calculated under the new tax regime.', small),
    ])
    response = HttpResponse(buf.getvalue(), content_type='application/pdf')
    filename = f"payslip-{slip.get('employee_code', '')}-{slip.get('period', '').replace(' ', '-')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ------------------------------------------------------------------------------------------------ profile: bank, statutory, pay items, salary

def _target_employee(request, employee_ref):
    emp = _employee_for(employee_ref)
    if not emp:
        return None, _fail('Employee not found', 404)
    return emp, None


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def bank_details(request, employee_id):
    """GET/PUT /api/payroll/bank/<employee>/ - bank account, IFSC, PAN and UAN (the employee themself or HR)."""
    emp, err = _target_employee(request, employee_id)
    if err:
        return err
    if not (is_admin(request) or owns_employee(request, str(emp['_id']))):
        return forbidden()
    if request.method == 'PUT':
        data = _body(request)
        if 'routing_code' in data and 'ifsc' not in data:
            data['ifsc'] = data['routing_code']
        clean = {k: re.sub(r'\s+', ' ', str(data[k] or '')).strip()[:100] for k in ('account_holder', 'bank_name', 'branch') if k in data}
        if 'account_number' in data:
            number = re.sub(r'[\s-]', '', str(data['account_number'] or ''))
            if number and not re.fullmatch(r'\d{9,18}', number):
                return _fail('Account number must be 9 to 18 digits')
            clean['account_number'] = number
        if 'ifsc' in data:
            ifsc = str(data['ifsc'] or '').strip().upper()
            if ifsc and not IFSC_RE.match(ifsc):
                return _fail('IFSC code must look like HDFC0001234')
            clean['ifsc'] = ifsc
        update = {f'bank_details.{k}': v for k, v in clean.items()}
        if 'pan' in data:
            pan = str(data['pan'] or '').strip().upper()
            if pan and not PAN_RE.match(pan):
                return _fail('PAN must look like ABCDE1234F')
            update['tax_id'] = pan
        if 'uan' in data:
            uan = re.sub(r'\s', '', str(data['uan'] or ''))
            if uan and not re.fullmatch(r'\d{12}', uan):
                return _fail('UAN must be 12 digits')
            update['uan'] = uan
        if update:
            employees.update_one({'_id': emp['_id']}, {'$set': update})
            emp = employees.find_one({'_id': emp['_id']})
    bank = dict(emp.get('bank_details', {}))
    if 'routing_code' in bank and 'ifsc' not in bank:
        bank['ifsc'] = bank['routing_code']
    return JsonResponse({'success': True, 'bank_details': bank, 'pan': emp.get('tax_id', ''), 'uan': emp.get('uan', '')})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def pay_items(request, employee_id):
    """
    GET  /api/payroll/items/<employee>/ - recurring benefits/deductions (employee or HR)
    POST /api/payroll/items/<employee>/ {kind: benefit|deduction, name, amount} - HR
    """
    emp, err = _target_employee(request, employee_id)
    if err:
        return err
    if request.method == 'GET':
        if not (is_admin(request) or owns_employee(request, str(emp['_id']))):
            return forbidden()
        return JsonResponse({'success': True, 'items': emp.get('pay_items', [])})
    if not is_admin(request):
        return forbidden()
    data = _body(request)
    try:
        amount = round(float(data.get('amount')), 2)
    except (TypeError, ValueError):
        return _fail('amount must be a number')
    name = str(data.get('name') or '').strip()
    if data.get('kind') not in ('benefit', 'deduction') or not name or amount <= 0:
        return _fail('kind (benefit|deduction), name and a positive amount are required')
    item = {'id': str(ObjectId()), 'kind': data['kind'], 'name': name[:80], 'amount': amount}
    employees.update_one({'_id': emp['_id']}, {'$push': {'pay_items': item}})
    return JsonResponse({'success': True, 'item': item}, status=201)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_pay_item(request, employee_id, item_id):
    if not is_admin(request):
        return forbidden()
    emp, err = _target_employee(request, employee_id)
    if err:
        return err
    result = employees.update_one({'_id': emp['_id']}, {'$pull': {'pay_items': {'id': item_id}}})
    if not result.modified_count:
        return _fail('Item not found', 404)
    return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def salary(request, employee_id):
    """
    GET  /api/payroll/salary/<employee>/ - the CTC breakup and revision history (the employee themself or HR)
    POST /api/payroll/salary/<employee>/ {annual_ctc, effective_from, reason} (HR) - revise the CTC; recorded in the history
    """
    emp, err = _target_employee(request, employee_id)
    if err:
        return err
    if not (is_admin(request) or owns_employee(request, str(emp['_id']))):
        return forbidden()
    rates = get_settings()['payroll']
    if request.method == 'POST':
        if not is_admin(request):
            return forbidden()
        data = _body(request)
        try:
            new_ctc = round(float(data.get('annual_ctc')))
        except (TypeError, ValueError):
            return _fail('annual_ctc must be a number')
        if not 0 < new_ctc <= 1_000_000_000:
            return _fail('Annual CTC must be between 1 and 100 crore rupees')
        effective = str(data.get('effective_from') or datetime.date.today().isoformat())[:10]
        if not _date(effective):
            return _fail('effective_from must be a date (YYYY-MM-DD)')
        entry = {'annual_ctc': new_ctc, 'previous_ctc': float(emp.get('salary') or 0), 'effective_from': effective,
                 'reason': str(data.get('reason') or '').strip()[:200], 'changed_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                 'changed_by': str(getattr(request, 'user_id', ''))}
        employees.update_one({'_id': emp['_id']}, {'$set': {'salary': float(new_ctc)}, '$push': {'salary_history': entry}})
        emp = employees.find_one({'_id': emp['_id']})
    annual = float(emp.get('salary') or 0)
    structure = engine.structure(annual, rates) if annual else None
    full = engine.compute(annual, rates) if annual else None
    return JsonResponse({
        'success': True, 'annual_ctc': annual, 'structure': structure,
        'monthly': {k: full[k] for k in ('basic', 'hra', 'special_allowance', 'gross', 'provident_fund', 'esi', 'professional_tax', 'tax', 'total_deductions', 'net_salary',
                                         'employer_pf', 'employer_esi', 'ctc_monthly')} if full else None,
        'history': list(reversed(emp.get('salary_history', []))),
    })
