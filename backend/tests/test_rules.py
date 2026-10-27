"""Business rules: leave day counting and balances, input validation, who may edit what."""
import datetime
import json

from hr_backend.db import db, employees, users
from tests.test_api import ApiTestCase, workday
from utils.workdays import india_holidays, workdays


class LeaveRuleTests(ApiTestCase):
    def apply(self, **body):
        body.setdefault('leave_type', 'Earned Leaves')
        body.setdefault('reason', 'x')
        return self.post('/api/leaves/apply/', body, **self.emp)

    def setUp(self):
        db['Leaves'].delete_many({})

    def test_only_working_days_count(self):
        start = datetime.date.fromisoformat(workday(60))
        end = start + datetime.timedelta(days=13)                         # two calendar weeks
        r = self.apply(start_date=start.isoformat(), end_date=end.isoformat())
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['days'], len(workdays(start, end)))
        self.assertLessEqual(r.json()['days'], 10)

    def test_weekends_and_holidays_are_rejected(self):
        today = datetime.date.today()
        saturday = today + datetime.timedelta(days=(5 - today.weekday()) % 7 + 14)
        r = self.apply(start_date=saturday.isoformat(), end_date=(saturday + datetime.timedelta(days=1)).isoformat())
        self.assertEqual((r.status_code, r.json()['error']), (400, 'No working days'))
        christmas = next(h['date'] for h in india_holidays(today.year + 1) if h['name'] == 'Christmas Day')
        if datetime.date.fromisoformat(christmas).weekday() < 5:
            self.assertEqual(self.apply(start_date=christmas, end_date=christmas).status_code, 400)

    def test_unknown_type_ancient_and_far_future_dates(self):
        d = workday(20)
        self.assertEqual(self.apply(leave_type='Banana', start_date=d, end_date=d).status_code, 400)
        old = (datetime.date.today() - datetime.timedelta(days=90)).isoformat()
        self.assertEqual(self.apply(start_date=old, end_date=old).status_code, 400)
        far = (datetime.date.today() + datetime.timedelta(days=900)).isoformat()
        self.assertEqual(self.apply(start_date=far, end_date=far).status_code, 400)

    def test_balance_is_enforced_per_type_and_year(self):
        start = datetime.date.fromisoformat(workday(30))
        year = start.year
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'leave_type': 'Sick Leaves', 'status': 'Approved', 'days': 9.0,
                                 'start_date': f'{year}-01-05', 'end_date': f'{year}-01-16'})
        end = start + datetime.timedelta(days=6)                           # a full week needs more than the 1 sick day left
        r = self.apply(leave_type='Sick Leaves', start_date=start.isoformat(), end_date=end.isoformat())
        self.assertEqual((r.status_code, r.json()['error']), (400, 'Insufficient balance'))
        self.assertEqual(self.apply(leave_type='LOP Leaves', start_date=start.isoformat(), end_date=end.isoformat()).status_code, 201)   # unpaid: no limit


class InputValidationTests(ApiTestCase):
    def test_expense_amounts(self):
        for bad in (-5, 0, 'abc', None, 10 ** 9):
            r = self.post('/api/expenses/', {'title': 'x', 'amount': bad, 'category': 'Travel'}, **self.emp)
            self.assertEqual(r.status_code, 400, bad)
        self.assertEqual(self.post('/api/expenses/', {'amount': 5}, **self.emp).status_code, 400)           # needs a title
        ok = self.post('/api/expenses/', {'title': 'Taxi', 'amount': '12.345'}, **self.emp)
        self.assertEqual((ok.status_code, ok.json()['expense']['amount']), (201, 12.35))

    def test_employee_creation_rules(self):
        base = {'first_name': 'New', 'last_name': 'Hire', 'email': 'new.hire@x.com', 'employee_id': 'EMP-NEW'}
        self.assertEqual(self.post('/api/employees/new/', base, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/employees/new/', dict(base, email='not-an-email'), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/employees/new/', dict(base, salary=-1), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/employees/new/', dict(base, hire_date='soon'), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/employees/new/', dict(base, email='ADA@x.com'), **self.admin).status_code, 409)     # e-mails are unique, any case
        self.assertEqual(self.post('/api/employees/new/', dict(base, employee_id='emp-a'), **self.admin).status_code, 409)
        self.assertEqual(self.post('/api/employees/new/', base, **self.admin).status_code, 201)

    def test_employees_edit_only_their_personal_details(self):
        patch = lambda who, ref, body: self.c.patch(f'/api/employees/{ref}/partial/', data=json.dumps(body), content_type='application/json', **who)
        r = patch(self.emp, self.emp_emp, {'phone': '555-0100', 'salary': 999999, 'position': 'CEO', 'employment_status': 'Terminated', 'manager_id': 'x'})
        self.assertEqual(r.status_code, 200, r.content)
        bob = employees.find_one({'_id': self.emp_emp})
        self.assertEqual(bob['phone'], '555-0100')
        self.assertEqual(bob['salary'], 60000)                                 # untouched
        self.assertNotEqual(bob.get('position'), 'CEO')
        self.assertEqual(bob['employment_status'], 'Active')
        self.assertEqual(patch(self.emp, self.other_emp, {'phone': '1'}).status_code, 403)
        self.assertEqual(self.put(f'/api/employees/{self.emp_emp}/update/', {'salary': 1}, **self.emp).status_code, 403)
        self.assertEqual(patch(self.admin, self.emp_emp, {'salary': 70000}).status_code, 200)
        self.assertEqual(employees.find_one({'_id': self.emp_emp})['salary'], 70000)

    def test_password_change_rules(self):
        from django.contrib.auth.hashers import make_password
        users.update_one({'_id': self.emp_user}, {'$set': {'password': make_password('First#Pass1')}})
        change = lambda new: self.post('/api/auth/change-password/', {'current_password': 'First#Pass1', 'new_password': new}, **self.emp).status_code
        self.assertEqual(change('First#Pass1'), 400)
        self.assertEqual(change('abc'), 400)
        self.assertEqual(change('Second#Pass2'), 200)

    def test_json_bodies_must_be_objects(self):
        for payload in ('{"x":', '[]', '"text"'):
            r = self.c.post('/api/expenses/', data=payload, content_type='application/json', **self.emp)
            self.assertEqual(r.status_code, 400, payload)


class EmployeeCodeTests(ApiTestCase):
    def test_blank_employee_id_gets_the_next_number(self):
        employees.insert_one({'employee_id': 'EMP-1007', 'first_name': 'Old', 'last_name': 'Timer', 'email': 'old@x.com'})
        made = self.post('/api/employees/new/', {'first_name': 'Fresh', 'last_name': 'Face', 'email': 'fresh@x.com', 'employee_id': ''}, **self.admin)
        self.assertEqual(made.status_code, 201, made.content)
        self.assertEqual(employees.find_one({'email': 'fresh@x.com'})['employee_id'], 'EMP-1008')
