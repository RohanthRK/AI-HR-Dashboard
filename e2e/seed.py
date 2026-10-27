"""Seed a scratch database for the browser tests (users ada=Admin, max=Manager, eve and sam=Employees; password Passw0rd!)."""
import os, sys, datetime
BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)
os.environ.setdefault('MONGODB_URI', 'mongodb://localhost:27017/')
os.environ['MONGODB_NAME'] = os.environ.get('E2E_DB', 'hr_e2e')
os.environ['DJANGO_SETTINGS_MODULE'] = 'hr_backend.settings'
import django
django.setup()
import logging
logging.disable(logging.CRITICAL)
from django.contrib.auth.hashers import make_password
from hr_backend.db import db

assert db.name.startswith('hr_e2e'), 'refusing to wipe a non-e2e database'
db.client.drop_database(db.name)
today = datetime.date.today()
iso = lambda d: d.isoformat()

roles = {n: str(db['Roles'].insert_one({'name': n}).inserted_id) for n in ('Admin', 'Manager', 'Employee')}
depts = {n: str(db['Departments'].insert_one({'name': n}).inserted_id) for n in ('Engineering', 'Sales')}
people = [
    ('EMP001', 'Ada', 'Admin', 'ada', 'Admin', 'Engineering', 150000, ['Python', 'SQL', 'AWS']),
    ('EMP002', 'Max', 'Manager', 'max', 'Manager', 'Engineering', 110000, ['Python', 'Leadership']),
    ('EMP003', 'Eve', 'Employee', 'eve', 'Employee', 'Engineering', 70000, ['JavaScript', 'React']),
    ('EMP004', 'Sam', 'Sales', 'sam', 'Employee', 'Sales', 60000, ['Communication']),
]
emp_ids = {}
for code, first, last, user, role, dept, salary, skills in people:
    eid = db['Employees'].insert_one({
        'employee_id': code, 'first_name': first, 'last_name': last, 'email': f'{user}@x.com', 'position': role,
        'salary': salary, 'employment_status': 'Active', 'department_id': depts[dept], 'department': dept,
        'skills': [{'name': s, 'proficiency': 7} for s in skills], 'hire_date': iso(today - datetime.timedelta(days=200))}).inserted_id
    uid = db['Users'].insert_one({'username': user, 'email': f'{user}@x.com', 'password': make_password('Passw0rd!'),
                                  'role_id': roles[role], 'employee_id': str(eid)}).inserted_id
    db['Employees'].update_one({'_id': eid}, {'$set': {'user_id': str(uid)}})
    emp_ids[user] = str(eid)
    for d in range(1, 15):
        day = today - datetime.timedelta(days=d)
        if day.weekday() < 5:
            db['Attendance'].insert_one({'employee_id': str(eid), 'date': iso(day), 'hours_worked': 8 + (d % 3),
                                         'clock_in': f'{iso(day)}T09:00:00+00:00', 'clock_out': f'{iso(day)}T18:00:00+00:00'})
    db['objectives'].insert_one({'title': f'{first} goal', 'employee_id': str(eid), 'progress': 60, 'status': 'On Track'})
db['Leaves'].insert_one({'employee_id': emp_ids['eve'], 'leave_type': 'Earned Leaves', 'start_date': iso(today), 'end_date': iso(today),
                         'days': 1, 'status': 'Pending', 'requested_at': iso(today)})
db['jobs'].insert_one({'title': 'Backend Dev', 'department': 'Engineering', 'skills': 'Python, SQL', 'status': 'Open'})
print('seeded')
