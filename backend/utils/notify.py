"""Helper for writing in-app notifications from any module."""
import datetime

from hr_backend.db import notifications

# What each kind of notification is called, which group it belongs to (for filters and icons) and where clicking it goes.
TYPE_META = {
    'leave_request': {'category': 'Leave', 'link': '/leaves/pending'},
    'leave_update': {'category': 'Leave', 'link': '/leaves'},
    'expense_update': {'category': 'Expenses', 'link': '/expenses'},
    'ticket_update': {'category': 'Helpdesk', 'link': '/helpdesk'},
    'recognition': {'category': 'People', 'link': '/recognition'},
    'onboarding': {'category': 'People', 'link': '/onboarding'},
    'offboarding': {'category': 'People', 'link': '/offboarding'},
    'training_assigned': {'category': 'Learning', 'link': '/training'},
    'compliance': {'category': 'Compliance', 'link': '/compliance'},
    'payroll': {'category': 'Payroll', 'link': '/payroll'},
    'review': {'category': 'Performance', 'link': '/performance'},
    'recruitment': {'category': 'Hiring', 'link': '/recruitment'},
    'system': {'category': 'System', 'link': None},
}
CATEGORIES = ['Leave', 'Expenses', 'Helpdesk', 'People', 'Learning', 'Compliance', 'Payroll', 'Performance', 'Hiring', 'System']


def meta_for(type_):
    return TYPE_META.get(type_) or {'category': 'System', 'link': None}


def notify(user_id, title, message, type='system', reference_id=None, link=None):
    """Insert a notification for a Users._id. Never raises (notifications are best-effort)."""
    if not user_id:
        return None
    from utils.app_settings import notification_enabled, get_settings
    from utils.delivery import deliver
    if not notification_enabled(type):
        return None
    try:
        inserted = notifications.insert_one({
            'type': type,
            'user_id': str(user_id),
            'title': title,
            'message': message,
            'reference_id': reference_id,
            'link': link or meta_for(type)['link'],
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'read': False,
        }).inserted_id
        prefs = get_settings()['notifications']
        deliver(user_id, title, message, prefs.get('emailDelivery'), prefs.get('webhookDelivery'))
        return inserted
    except Exception:
        return None


def notify_staff(title, message, type='system', link=None):
    """Tell every Admin / HR user (for things like a new application or a resignation)."""
    from utils.hr_common import privileged_user_ids
    sent = 0
    for uid in privileged_user_ids(('Admin',)):
        sent += 1 if notify(uid, title, message, type=type, link=link) else 0
    return sent


def deliver_external(user_id, title, message):
    """E-mail / webhook delivery for notifications that were inserted elsewhere."""
    from utils.app_settings import get_settings
    from utils.delivery import deliver
    try:
        prefs = get_settings()['notifications']
        deliver(user_id, title, message, prefs.get('emailDelivery'), prefs.get('webhookDelivery'))
    except Exception:
        pass


def user_id_for_employee(emp_key):
    """Resolve an employee reference (ObjectId string, EMP code) to the linked Users._id string."""
    from bson import ObjectId
    from hr_backend.db import employees, users
    if not emp_key:
        return None
    emp_key = str(emp_key)
    emp = employees.find_one({'employee_id': emp_key})
    if not emp and len(emp_key) == 24:
        try:
            emp = employees.find_one({'_id': ObjectId(emp_key)})
        except Exception:
            emp = None
    if emp and emp.get('user_id'):
        return str(emp['user_id'])
    user = users.find_one({'employee_id': {'$in': [emp_key, str(emp['_id']) if emp else emp_key]}})
    return str(user['_id']) if user else None
