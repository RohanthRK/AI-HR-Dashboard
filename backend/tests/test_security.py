"""Authorization regressions found in the whole-codebase audit."""
from unittest import mock

from bson import ObjectId

from hr_backend.db import db, employees, users
from tests.test_api import ApiTestCase, make_token


class RoleAdministrationTests(ApiTestCase):
    def test_only_admins_manage_roles(self):
        for call in (lambda h: self.c.get('/api/auth/roles/', **h),
                     lambda h: self.post('/api/auth/roles/', {'name': 'Boss', 'permissions': {}}, **h),
                     lambda h: self.put(f'/api/auth/roles/{ObjectId()}/', {'name': 'X'}, **h),
                     lambda h: self.c.delete(f'/api/auth/roles/{ObjectId()}/', **h)):
            self.assertEqual(call(self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/auth/roles/', **self.admin).status_code, 200)


class ProjectPermissionTests(ApiTestCase):
    def test_employees_cannot_write_projects(self):
        body = {'name': 'Secret skunkworks', 'status': 'Planning'}
        self.assertEqual(self.post('/api/projects/new/', body, **self.emp).status_code, 403)
        made = self.post('/api/projects/new/', body, **self.admin)
        self.assertEqual(made.status_code, 201, made.content)
        pid = made.json()['project_id']
        self.assertEqual(self.put(f'/api/projects/{pid}/update/', {'status': 'Completed'}, **self.emp).status_code, 403)
        self.assertEqual(self.c.delete(f'/api/projects/{pid}/delete/', **self.emp).status_code, 403)
        self.assertEqual(self.c.delete(f'/api/projects/{pid}/delete/', **self.admin).status_code, 200)


class ReviewPrivacyTests(ApiTestCase):
    def setUp(self):
        db['Reviews'].delete_many({})
        db['Reviews'].insert_many([
            {'employee_id': str(self.emp_emp), 'employee_name': 'Bob Worker', 'reviewer_id': 'EMP-A', 'status': 'Completed', 'review_date': '2026-07-01'},
            {'employee_id': str(self.other_emp), 'employee_name': 'Cy Other', 'reviewer_id': 'EMP-A', 'status': 'Completed', 'review_date': '2026-07-02'},
        ])

    def test_employee_only_sees_reviews_about_themselves(self):
        names = {r['employee_name'] for r in self.c.get('/api/reviews/', **self.emp).json()['results']}
        self.assertEqual(names, {'Bob Worker'})
        self.assertEqual(self.c.get(f'/api/reviews/?employee_id={self.other_emp}', **self.emp).json()['count'], 0)
        self.assertEqual(self.c.get('/api/reviews/', **self.admin).json()['count'], 2)

    def test_only_staff_can_submit_and_nobody_reviews_themselves(self):
        self.assertEqual(self.put(f'/api/reviews/{self.other_emp}/submit/', {'performance': 5}, **self.emp).status_code, 403)
        mgr_user = users.insert_one({'username': 'mia'}).inserted_id
        mgr = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(mgr_user, self.admin_emp, 'Manager')}
        self.assertEqual(self.put(f'/api/reviews/{self.admin_emp}/submit/', {'performance': 5}, **mgr).status_code, 403)
        self.assertEqual(self.put(f'/api/reviews/{self.other_emp}/submit/', {'performance': 4}, **mgr).status_code, 403)   # not their report
        employees.update_one({'_id': self.other_emp}, {'$set': {'manager_id': str(self.admin_emp)}})
        self.assertEqual(self.put(f'/api/reviews/{self.other_emp}/submit/', {'performance': 4}, **mgr).status_code, 200)
        employees.update_one({'_id': self.other_emp}, {'$set': {'manager_id': ''}})

    def test_team_reviews_are_staff_only(self):
        for path in ('/api/ai/team-reviews/', f'/api/ai/team-reviews/{ObjectId()}/'):
            self.assertEqual(self.c.get(path, **self.emp).status_code, 403)
            self.assertEqual(self.c.get(path, **self.admin).status_code, 200)
        self.assertEqual(self.post('/api/ai/team-reviews/', {'team_id': 'x'}, **self.emp).status_code, 403)


class DataExposureTests(ApiTestCase):
    def test_colleagues_do_not_expose_leave_balance_or_documents(self):
        employees.update_one({'_id': self.other_emp}, {'$set': {'leave_balance': {'remaining': 3}, 'documents': [{'name': 'passport'}]}})
        rows = {e['first_name']: e for e in self.c.get('/api/employees/', **self.emp).json()['results']}
        self.assertNotIn('leave_balance', rows['Cy'])
        self.assertNotIn('documents', rows['Cy'])
        self.assertNotIn('salary', rows['Cy'])

    def test_empty_database_is_never_filled_with_sample_employees(self):
        saved = list(employees.find())
        employees.delete_many({})
        try:
            body = self.c.get('/api/employees/', **self.admin).json()
            self.assertEqual(body['count'], 0)
            self.assertEqual(self.c.get('/api/employees/debug/', **self.admin).json()['count'], 0)
            self.assertEqual(employees.count_documents({}), 0)
        finally:
            employees.insert_many(saved)


class ErrorSanitizerTests(ApiTestCase):
    def test_server_errors_do_not_leak_details(self):
        with mock.patch('leaves.views.leaves.find', side_effect=RuntimeError('mongo://user:secret@host exploded')):
            r = self.c.get('/api/leaves/', **self.admin)
        self.assertEqual(r.status_code, 500)
        self.assertNotIn('secret', r.content.decode())
        self.assertIn('Something went wrong', r.json()['message'])


class ManagerScopeTests2(ApiTestCase):
    """A line manager sees their own reports, not the company."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.mia = employees.insert_one({'employee_id': 'EMP-M', 'first_name': 'Mia', 'last_name': 'Manager', 'email': 'mia@x.com',
                                        'salary': 90000, 'employment_status': 'Active', 'hire_date': '2024-01-01'}).inserted_id
        employees.update_one({'_id': cls.emp_emp}, {'$set': {'manager_id': str(cls.mia)}})
        mia_user = users.insert_one({'username': 'mia', 'email': 'mia@x.com'}).inserted_id
        cls.mgr = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(mia_user, cls.mia, 'Manager')}

    def setUp(self):
        for name in ('expenses', 'Payroll', 'pips', 'Offboarding', 'Reviews', 'Attendance'):
            db[name].delete_many({})

    def test_payroll_is_admin_only(self):
        db['Payroll'].insert_one({'employee_id': str(self.emp_emp), 'period': 'May 2026', 'net_salary': 1, 'employee_name': 'Bob Worker'})
        self.assertEqual(self.c.get('/api/payroll/', **self.mgr).status_code, 403)
        self.assertEqual(self.c.get('/api/payroll/export/', **self.mgr).status_code, 403)
        self.assertEqual(self.post(f'/api/payroll/items/{self.emp_emp}/', {'kind': 'benefit', 'name': 'x', 'amount': 5}, **self.mgr).status_code, 403)
        self.assertEqual(self.c.get('/api/payroll/', **self.admin).status_code, 200)

    def test_salary_and_bank_details_follow_the_reporting_line(self):
        employees.update_one({'_id': self.emp_emp}, {'$set': {'bank_details': {'account_number': '123'}}})
        rows = {e['first_name']: e for e in self.c.get('/api/employees/', **self.mgr).json()['results']}
        self.assertEqual(rows['Bob']['salary'], 60000)                 # a report
        self.assertNotIn('bank_details', rows['Bob'])                  # never for a manager
        self.assertNotIn('salary', rows['Ada'])                        # not a report
        self.assertEqual(rows['Mia']['salary'], 90000)                 # themself

    def test_expenses_reviews_pips_and_exits_are_limited_to_reports(self):
        for who in (self.emp_emp, self.other_emp):
            ref = str(who)
            db['expenses'].insert_one({'employee_id': ref, 'amount': 5, 'status': 'Pending', 'description': ref})
            db['Reviews'].insert_one({'employee_id': ref, 'reviewer_id': 'EMP-A', 'status': 'Completed', 'review_date': '2026-01-01', 'employee_name': ref})
            db['pips'].insert_one({'employee_id': ref, 'status': 'Active', 'title': ref})
            db['Offboarding'].insert_one({'employee_id': ref, 'status': 'Pending', 'reason_category': 'Other', 'requested_at': '2026-01-01', 'employee_name': ref})
        mine = str(self.emp_emp)
        self.assertEqual([e['description'] for e in self.c.get('/api/expenses/', **self.mgr).json()['expenses']], [mine])
        self.assertEqual([r['employee_name'] for r in self.c.get('/api/reviews/', **self.mgr).json()['results']], [mine])
        self.assertEqual([p['title'] for p in self.c.get('/api/performance/pips/', **self.mgr).json()['data']], [mine])
        self.assertEqual([r['employee_name'] for r in self.c.get('/api/offboarding/', **self.mgr).json()['requests']], [mine])
        for coll, n in (('expenses', 2), ('Reviews', 2), ('pips', 2), ('Offboarding', 2)):
            self.assertEqual(db[coll].count_documents({}), n)
        self.assertEqual(len(self.c.get('/api/expenses/', **self.admin).json()['expenses']), 2)

    def test_manager_cannot_open_or_decide_someone_elses_items(self):
        other = db['expenses'].insert_one({'employee_id': str(self.other_emp), 'amount': 5, 'status': 'Pending'}).inserted_id
        self.assertEqual(self.c.get(f'/api/expenses/{other}/', **self.mgr).status_code, 403)
        self.assertEqual(self.put(f'/api/expenses/{other}/', {'status': 'Approved'}, **self.mgr).status_code, 403)
        mine = db['expenses'].insert_one({'employee_id': str(self.mia), 'amount': 5, 'status': 'Pending'}).inserted_id
        self.assertEqual(self.put(f'/api/expenses/{mine}/', {'status': 'Approved'}, **self.mgr).status_code, 403)   # own claim

    def test_resignations_are_decided_by_hr(self):
        req = db['Offboarding'].insert_one({'employee_id': str(self.emp_emp), 'status': 'Pending', 'reason_category': 'Other',
                                            'requested_at': '2026-01-01', 'last_working_day': '2026-12-01', 'employee_name': 'Bob'}).inserted_id
        self.assertEqual(self.put(f'/api/offboarding/{req}/', {'status': 'Approved'}, **self.mgr).status_code, 403)
        self.assertEqual(self.put(f'/api/offboarding/{req}/', {'status': 'Approved'}, **self.admin).status_code, 200)
        self.assertEqual(self.c.get('/api/offboarding/analytics/', **self.mgr).status_code, 403)

    def test_analytics_with_named_people_are_admin_only(self):
        for path in ('/api/ai/attrition-risk/', '/api/ai/talent-insights/employees/', '/api/ai/talent-insights/growth/',
                     '/api/ai/attendance-anomalies/', '/api/ai/payroll-anomalies/', '/api/reports/compliance/'):
            self.assertEqual(self.c.get(path, **self.mgr).status_code, 403, path)
            self.assertEqual(self.c.get(path, **self.admin).status_code, 200, path)
        self.assertEqual(self.c.get(f'/api/ai/talent-insights/employee/{self.other_emp}/', **self.mgr).status_code, 403)
        self.assertEqual(self.c.get(f'/api/ai/talent-insights/employee/{self.emp_emp}/', **self.mgr).status_code, 200)

    def test_team_attendance_only_lists_the_managers_people(self):
        rows = self.c.get('/api/attendance/team/?date=2026-10-21', **self.mgr).json()['rows']
        self.assertEqual({r['name'] for r in rows}, {'Mia Manager', 'Bob Worker'})
        self.assertGreaterEqual(len(self.c.get('/api/attendance/team/?date=2026-10-21', **self.admin).json()['rows']), 4)
