"""Organisation-wide settings stored as a single document in the `Settings` collection."""
import datetime
import json
import re
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import settings_collection
from utils.delivery import integrations
from utils.workdays import DEFAULT_HOLIDAYS

DEFAULTS = {
    'general': {
        'companyName': 'My Company',
        'timezone': 'Asia/Kolkata',
        'workHoursPerDay': 8.0,             # hours expected on a working day (a person can have their own)
        'lateAfter': '09:30',               # a first clock-in after this time (company timezone) counts as late
        'holidays': DEFAULT_HOLIDAYS,       # company holidays: not counted as leave days, shown on the calendar
    },
    'payroll': {                         # see payroll/engine.py for how these are used
        'basicPct': 40.0,                # basic, % of monthly CTC
        'hraPct': 50.0,                  # HRA, % of basic
        'pfPct': 12.0,                   # provident fund, % of PF wage (employee and employer each)
        'pfWageCeiling': 15000,          # PF wage cap per month, rupees
        'esiThreshold': 21000,           # ESI applies at or below this monthly gross, rupees
        'ptAmount': 200,                 # professional tax per month, rupees
        'ptThreshold': 25000,            # professional tax applies at or above this monthly gross, rupees
        'tdsEnabled': True,              # deduct income tax (new regime) every month
        'payOvertime': False,
        'overtimeMultiplier': 1.5,
    },
    'knowledge': {
        'faq': [
            {'q': 'How do I apply for leave?', 'a': 'Open Leaves > Request Leave, choose the dates and submit. Your manager is notified.'},
            {'q': 'Where can I find my payslip?', 'a': 'Payroll > Payslip History. Payslips can be downloaded as PDF.'},
            {'q': 'What should I do in my first week?', 'a': 'Complete your profile, upload your documents, finish assigned trainings and meet your manager.'},
        ],
        'requiredDocuments': [],
        'employeeTasks': ['Complete your profile', 'Read the employee handbook', 'Meet your manager and team'],
        'hrTasks': ['Create accounts and email', 'Assign laptop and assets', 'Schedule orientation'],
    },
    'notifications': {
        'leaveApprovals': True,
        'expenseUpdates': True,
        'ticketUpdates': True,
        'emailDelivery': False,
        'webhookDelivery': False,
    },
}
KEY = 'app'


def get_settings():
    doc = settings_collection.find_one({'_key': KEY}) or {}
    merged = {}
    for section, defaults in DEFAULTS.items():
        merged[section] = {**defaults, **{k: v for k, v in (doc.get(section) or {}).items() if k in defaults}}
    return merged


def _clean_list(key, value):
    if not isinstance(value, list) or len(value) > (400 if key == 'holidays' else 100):
        return None
    if key == 'faq':
        items = []
        for item in value:
            if not isinstance(item, dict) or not str(item.get('q', '')).strip() or not str(item.get('a', '')).strip():
                return None
            items.append({'q': str(item['q']).strip()[:300], 'a': str(item['a']).strip()[:2000]})
        return items
    if key == 'holidays':
        items, seen = [], set()
        for item in value:
            try:
                day = datetime.date.fromisoformat(str(item.get('date', '')))
            except (ValueError, AttributeError):
                return None
            name = str(item.get('name', '')).strip()
            if not name or day.isoformat() in seen:
                return None
            seen.add(day.isoformat())
            items.append({'date': day.isoformat(), 'name': name[:80]})
        return sorted(items, key=lambda h: h['date'])
    return [str(v).strip() for v in value if str(v).strip()]


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def settings_handler(request):
    """GET /api/settings/ (any user) - PUT /api/settings/ (Admin only)."""
    if request.method == 'GET':
        everything = {**get_settings(), 'integrations': integrations()}
        if getattr(request, 'role', '') in ('Admin', 'Manager', 'HR'):
            return JsonResponse(everything)
        # payroll rates, notification switches and integration status are not for everyone
        return JsonResponse({'general': everything['general'], 'knowledge': everything['knowledge']})
    if getattr(request, 'role', '') != 'Admin':
        return JsonResponse({'error': 'Forbidden', 'message': 'Admin role required'}, status=403)
    try:
        body = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    update = {}
    for section, defaults in DEFAULTS.items():
        for key, value in (body.get(section) or {}).items():
            if key not in defaults:
                continue
            if key == 'lateAfter':
                if not (isinstance(value, str) and re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', value)):
                    return JsonResponse({'error': 'Invalid value', 'message': 'lateAfter must be a time like 09:30'}, status=400)
                update[f'{section}.{key}'] = value
            elif key == 'workHoursPerDay':
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not 1 <= value <= 16:
                    return JsonResponse({'error': 'Invalid value', 'message': 'Working hours per day must be between 1 and 16'}, status=400)
                update[f'{section}.{key}'] = float(value)
            elif isinstance(defaults[key], float) and isinstance(value, (int, float)) and not isinstance(value, bool):
                if not 0 <= value <= 100:
                    return JsonResponse({'error': 'Invalid value', 'message': f'{key} must be between 0 and 100'}, status=400)
                update[f'{section}.{key}'] = float(value)
            elif isinstance(defaults[key], list):
                cleaned = _clean_list(key, value)
                if cleaned is None:
                    return JsonResponse({'error': 'Invalid value', 'message': f'{key} has an invalid format'}, status=400)
                update[f'{section}.{key}'] = cleaned
            elif isinstance(defaults[key], int) and not isinstance(defaults[key], bool):      # rupee amounts
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 <= value <= 10_000_000:
                    return JsonResponse({'error': 'Invalid value', 'message': f'{key} must be an amount between 0 and 1,00,00,000'}, status=400)
                update[f'{section}.{key}'] = int(value)
            elif isinstance(value, type(defaults[key])):
                update[f'{section}.{key}'] = value
    if update:
        settings_collection.update_one({'_key': KEY}, {'$set': update}, upsert=True)
    return JsonResponse({**get_settings(), 'integrations': integrations()})


NOTIFICATION_SETTING_FOR_TYPE = {
    'leave_request': 'leaveApprovals',
    'leave_update': 'leaveApprovals',
    'expense_update': 'expenseUpdates',
    'ticket_update': 'ticketUpdates',
}


def notification_enabled(notification_type):
    """False when an admin switched this kind of notification off in Settings."""
    key = NOTIFICATION_SETTING_FOR_TYPE.get(notification_type)
    return True if key is None else bool(get_settings()['notifications'].get(key, True))
