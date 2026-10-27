"""Module-level tests: leaves, expenses, assets, PIPs, reviews, teams."""
import json

from bson import ObjectId

from hr_backend.db import db, employees, notifications, users
from tests.test_api import ApiTestCase, make_token, workday


class LeaveTests(ApiTestCase):
    def apply(self, headers, start=None, end=None):
        start = start or workday(30)
        end = end or workday(32)
        if end < start:
            end = start
        return self.post('/api/leaves/apply/', {'leave_type': 'Earned Leaves', 'start_date': start,
                                                'end_date': end, 'reason': 'trip'}, **headers)

    def test_request_approve_and_notify(self):
        r = self.apply(self.emp)
        self.assertEqual(r.status_code, 201, r.content)
        leave_id = r.json()['leave_id']
        import datetime
        from utils.workdays import workdays
        self.assertEqual(r.json()['days'], len(workdays(datetime.date.fromisoformat(workday(30)), datetime.date.fromisoformat(workday(32)))))
        # employees cannot approve
        self.assertEqual(self.put(f'/api/leaves/{leave_id}/approve/', **self.emp).status_code, 403)
        before = notifications.count_documents({'type': 'leave_update'})
        ok = self.put(f'/api/leaves/{leave_id}/approve/', **self.admin)
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(notifications.count_documents({'type': 'leave_update'}), before + 1)
        mine = self.c.get('/api/leaves/me/', **self.emp).json()
        self.assertEqual(mine['leaves'][0]['status'], 'Approved')

    def test_cannot_approve_own_leave(self):
        leave_id = self.apply(self.admin, workday(50), workday(50)).json()['leave_id']
        self.assertEqual(self.put(f'/api/leaves/{leave_id}/approve/', **self.admin).status_code, 403)

    def test_balance_is_private(self):
        self.assertEqual(self.c.get(f'/api/leaves/balance/{self.admin_emp}/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f'/api/leaves/balance/{self.emp_emp}/', **self.emp).status_code, 200)
        self.assertEqual(self.c.get(f'/api/leaves/balance/{self.emp_emp}/', **self.admin).status_code, 200)

    def test_cancel_pending(self):
        leave_id = self.apply(self.emp, workday(60), workday(60)).json()['leave_id']
        r = self.c.delete(f'/api/leaves/{leave_id}/cancel/', **self.emp)
        self.assertEqual(r.status_code, 200, r.content)


class ExpenseTests(ApiTestCase):
    def test_claim_lifecycle_and_privacy(self):
        r = self.post('/api/expenses/', {'amount': 40, 'title': 'Taxi', 'category': 'Travel', 'status': 'Approved',
                                         'employee_id': 'EMP-A'}, **self.emp)
        self.assertEqual(r.status_code, 201)
        exp = r.json()['expense']
        self.assertEqual(exp['status'], 'Pending')           # cannot self-approve
        self.assertEqual(exp['employee_id'], str(self.emp_emp))  # ownership comes from the token
        # another employee's token cannot read it
        other_token = {'HTTP_AUTHORIZATION': 'Bearer ' + __import__('tests.test_api', fromlist=['x']).make_token(
            self.admin_user, self.other_emp, 'Employee')}
        self.assertEqual(self.c.get(f"/api/expenses/{exp['_id']}/", **other_token).status_code, 403)
        self.assertEqual(self.put(f"/api/expenses/{exp['_id']}/", {'status': 'Approved'}, **self.emp).status_code, 403)
        before = notifications.count_documents({'type': 'expense_update'})
        self.assertEqual(self.put(f"/api/expenses/{exp['_id']}/", {'status': 'Approved'}, **self.admin).status_code, 200)
        self.assertEqual(notifications.count_documents({'type': 'expense_update'}), before + 1)
        listing = self.c.get('/api/expenses/', **self.emp).json()['expenses']
        self.assertTrue(all(e['employee_id'] == str(self.emp_emp) for e in listing))


class AssetTests(ApiTestCase):
    def test_admin_only_writes_and_assignee_reads(self):
        self.assertEqual(self.post('/api/assets/', {'name': 'Laptop'}, **self.emp).status_code, 403)
        a = self.post('/api/assets/', {'name': 'Laptop', 'type': 'Laptop', 'assignedTo': 'EMP-A'}, **self.admin).json()['asset']
        self.assertEqual(self.c.get(f"/api/assets/{a['_id']}/", **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f"/api/assets/{a['_id']}/", **self.admin).status_code, 200)
        self.assertEqual(self.c.delete(f"/api/assets/{a['_id']}/", **self.emp).status_code, 403)


class PipTests(ApiTestCase):
    def test_pip_visibility(self):
        self.assertEqual(self.post('/api/performance/pips/new/', {'employee_id': str(self.emp_emp), 'title': 'PIP'},
                                   **self.emp).status_code, 403)
        mine = self.post('/api/performance/pips/new/', {'employee_id': str(self.emp_emp), 'title': 'Mine'}, **self.admin)
        self.assertIn(mine.status_code, (200, 201), mine.content)
        theirs = self.post('/api/performance/pips/new/', {'employee_id': str(self.admin_emp), 'title': 'Theirs'}, **self.admin)
        listing = self.c.get('/api/performance/pips/', **self.emp).json()['data']
        self.assertEqual([p['title'] for p in listing], ['Mine'])
        other_id = db['pips'].find_one({'title': 'Theirs'})['_id']
        self.assertEqual(self.c.get(f'/api/performance/pips/{other_id}/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f'/api/performance/pips/{other_id}/', **self.admin).status_code, 200)
        self.assertEqual(theirs.status_code in (200, 201), True)


class ReviewTests(ApiTestCase):
    def test_review_access(self):
        rid = db['Reviews'].insert_one({'employee_id': str(self.admin_emp), 'reviewer_id': str(self.admin_emp),
                                         'average_score': 4, 'status': 'Completed'}).inserted_id
        self.assertEqual(self.c.get(f'/api/reviews/{rid}/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f'/api/reviews/{rid}/', **self.admin).status_code, 200)
        mine = db['Reviews'].insert_one({'employee_id': str(self.emp_emp), 'reviewer_id': str(self.admin_emp),
                                          'average_score': 3, 'status': 'Completed'}).inserted_id
        self.assertEqual(self.c.get(f'/api/reviews/{mine}/', **self.emp).status_code, 200)


class TeamTests(ApiTestCase):
    def setUp(self):
        db['Teams'].delete_many({})

    def make(self, name, **extra):
        return self.post('/api/teams/teams/mongodb_create/', {'name': name, 'department': 'Engineering', **extra}, **self.admin)

    def test_only_admins_create_teams(self):
        self.assertEqual(self.c.get('/api/teams/mongodb_list/', **self.emp).status_code, 200)
        self.assertEqual(self.post('/api/teams/teams/mongodb_create/', {'name': 'Rogue', 'department': 'X'}, **self.emp).status_code, 403)
        self.assertEqual(self.make('Platform').status_code, 201)
        self.assertEqual(self.c.get('/api/teams/teams/', **self.emp).status_code, 404)        # the old SQL endpoints are gone

    def test_validation(self):
        self.assertEqual(self.post('/api/teams/teams/mongodb_create/', {'name': ' ', 'department': 'X'}, **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/teams/teams/mongodb_create/', {'name': 'NoDept'}, **self.admin).status_code, 400)
        self.assertEqual(self.make('Platform').status_code, 201)
        self.assertEqual(self.make('platform').status_code, 400)                               # names are unique, case-insensitively
        self.assertEqual(self.make('Ghosts', leader_id=str(ObjectId())).status_code, 400)

    def test_an_employee_is_in_exactly_one_team(self):
        a = self.make('Alpha', employee_ids=[str(self.emp_emp)]).json()['id']
        b = self.make('Beta', employee_ids=[str(self.emp_emp)]).json()['id']                   # moves Bob out of Alpha
        alpha, beta = db['Teams'].find_one({'_id': ObjectId(a)}), db['Teams'].find_one({'_id': ObjectId(b)})
        self.assertEqual(alpha['members'], [])
        self.assertEqual(alpha['employees'], [])
        self.assertEqual(beta['members'], [str(self.emp_emp)])
        bob = employees.find_one({'_id': self.emp_emp})
        self.assertEqual((bob['team'], bob['team_id']), ('Beta', b))
        # edit Beta: Bob leaves and nobody is left anywhere
        up = self.put(f'/api/teams/teams/{b}/mongodb_update/', {'employee_ids': []}, **self.admin)
        self.assertEqual(up.status_code, 200, up.content)
        self.assertEqual(db['Teams'].find_one({'_id': ObjectId(b)})['members'], [])
        self.assertEqual(employees.find_one({'_id': self.emp_emp})['team'], '')

    def test_manager_and_leader_are_members_and_can_edit_their_team(self):
        made = self.make('Gamma', manager_id=str(self.emp_emp), leader_id=str(self.admin_emp)).json()
        team = db['Teams'].find_one({'_id': ObjectId(made['id'])})
        self.assertEqual(set(team['members']), {str(self.emp_emp), str(self.admin_emp)})
        cards = {c['name']: c for c in team['employees']}
        self.assertTrue(cards['Bob Worker']['is_manager'] and cards['Ada Admin']['is_leader'])
        users_mgr = users.insert_one({'username': 'bobm'}).inserted_id
        owner = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(users_mgr, self.emp_emp, 'Manager')}
        self.assertEqual(self.put(f"/api/teams/teams/{made['id']}/mongodb_update/", {'description': 'New text'}, **owner).status_code, 200)
        stranger = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(users_mgr, self.other_emp, 'Manager')}
        self.assertEqual(self.put(f"/api/teams/teams/{made['id']}/mongodb_update/", {'description': 'Hijack'}, **stranger).status_code, 403)
        self.assertEqual(self.put(f"/api/teams/teams/{made['id']}/mongodb_update/", {'description': 'Hijack'}, **self.emp).status_code, 403)


class SkillCatalogTests(ApiTestCase):
    def test_catalog_defaults_demand_and_admin_edit(self):
        self.post('/api/recruitment/jobs/', {'title': 'Py dev', 'skills': 'Python', 'status': 'Open'}, **self.admin)
        data = self.c.get('/api/skills/catalog/', **self.emp).json()
        self.assertEqual(len(data['roles']), 5)
        need = [n for n in data['organizationNeeds'] if n['id'] == 'python'][0]
        self.assertEqual((need['filled'], need['gap']), (1, 1))   # Ada has Python; one open job wants it
        self.assertEqual(self.put('/api/skills/catalog/', data, **self.emp).status_code, 403)
        bad = {'categories': data['categories'], 'roles': [{'id': 'x', 'title': 'X', 'requiredSkills': ['nope']}]}
        self.assertEqual(self.put('/api/skills/catalog/', bad, **self.admin).status_code, 400)
        good = {'categories': data['categories'], 'roles': data['roles'][:1]}
        self.assertEqual(len(self.put('/api/skills/catalog/', good, **self.admin).json()['roles']), 1)


class EmployeePrivacyTests(ApiTestCase):
    def test_salary_hidden_from_colleagues(self):
        listing = self.c.get('/api/employees/', **self.emp).json()['results']
        by_code = {e['employee_id']: e for e in listing}
        self.assertNotIn('salary', by_code['EMP-A'])          # a colleague
        self.assertIn('salary', by_code['EMP-B'])             # me
        self.assertNotIn('salary', self.c.get(f'/api/employees/{self.admin_emp}/', **self.emp).json())
        admin_view = self.c.get('/api/employees/', **self.admin).json()['results']
        self.assertTrue(all('salary' in e for e in admin_view))

    def test_document_access(self):
        from hr_backend.db import documents
        d = documents.insert_one({'employee_id': self.admin_emp, 'name': 'passport', 'file_path': 'x', 'expires_on': ''}).inserted_id
        self.assertEqual(self.c.get(f'/api/employees/{self.admin_emp}/documents/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f'/api/employees/{self.admin_emp}/documents/{d}/', **self.emp).status_code, 403)
        self.assertEqual(self.c.delete(f'/api/employees/{self.admin_emp}/documents/{d}/delete/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f'/api/employees/{self.admin_emp}/documents/', **self.admin).status_code, 200)


class DailyAttendanceTests(ApiTestCase):
    def test_daily_scoping(self):
        db['Attendance'].insert_many([
            {'employee_id': str(self.emp_emp), 'date': '2026-02-02', 'hours_worked': 8},
            {'employee_id': str(self.admin_emp), 'date': '2026-02-02', 'hours_worked': 8},
        ])
        everyone = self.c.get('/api/attendance/daily/?date=2026-02-02', **self.admin).json()
        self.assertEqual(everyone['count'], 2)
        mine = self.c.get('/api/attendance/daily/?date=2026-02-02', **self.emp).json()
        self.assertEqual(mine['count'], 1)
        self.assertEqual(self.c.get('/api/attendance/daily/?date=nope', **self.admin).status_code, 400)


class PayItemTests(ApiTestCase):
    def test_bank_details_and_pay_items(self):
        # bank details: self or staff only
        url = f'/api/payroll/bank/{self.emp_emp}/'
        self.assertEqual(self.put(url, {'bank_name': 'ACME Bank', 'account_number': '123456789', 'ifsc': 'hdfc0001234', 'pan': 'abcde1234f'}, **self.emp).status_code, 200)
        self.assertEqual(self.put(url, {'ifsc': 'nope'}, **self.emp).status_code, 400)
        self.assertEqual(self.put(url, {'account_number': '12ab'}, **self.emp).status_code, 400)
        self.assertEqual(self.put(url, {'pan': '123'}, **self.emp).status_code, 400)
        self.assertEqual(self.c.get(url, **self.emp).json()['pan'], 'ABCDE1234F')
        self.assertEqual(self.c.get(url, **self.admin).json()['bank_details']['bank_name'], 'ACME Bank')
        self.assertEqual(self.c.get(f'/api/payroll/bank/{self.admin_emp}/', **self.emp).status_code, 403)
        # bank data and pay items are hidden from colleagues in the directory
        listing = self.c.get('/api/employees/', **self.admin).json()['results']
        self.assertTrue(any('bank_details' in e for e in listing))
        other_view = {e['employee_id']: e for e in self.c.get('/api/employees/', **self.emp).json()['results']}
        self.assertNotIn('bank_details', other_view['EMP-A'])
        # items: staff manage, employee reads own
        items = f'/api/payroll/items/{self.emp_emp}/'
        self.assertEqual(self.post(items, {'kind': 'deduction', 'name': 'Loan', 'amount': 100}, **self.emp).status_code, 403)
        self.assertEqual(self.post(items, {'kind': 'bonus', 'name': 'x', 'amount': 5}, **self.admin).status_code, 400)
        self.post(items, {'kind': 'deduction', 'name': 'Loan', 'amount': 100}, **self.admin)
        benefit = self.post(items, {'kind': 'benefit', 'name': 'Transport', 'amount': 50}, **self.admin).json()['item']
        self.assertEqual(len(self.c.get(items, **self.emp).json()['items']), 2)
        self.assertEqual(self.c.get(f'/api/payroll/items/{self.admin_emp}/', **self.emp).status_code, 403)
        # payroll uses them: the structure's gross + 50 benefit, and the 100 loan comes off the net pay
        from payroll import engine
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
        slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})
        base = engine.compute(60000)
        self.assertEqual((slip['benefits_total'], slip['deductions_total']), (50, 100))
        self.assertEqual(slip['gross_salary'], base['earnings_total'] + 50)
        self.assertEqual(slip['net_salary'], engine.compute(60000, earnings=[('Transport', 50)], deductions=[('Loan', 100)])['net_salary'])
        self.assertEqual(self.c.get(f"/api/payroll/payslip/{slip['_id']}/pdf/", **self.emp).status_code, 403)      # still a draft
        self.post('/api/payroll/release/', {'period': 'July 2026', 'force': True}, **self.admin)
        pdf = self.c.get(f"/api/payroll/payslip/{slip['_id']}/pdf/", **self.emp)
        self.assertEqual(pdf.status_code, 200)
        # remove an item
        self.assertEqual(self.c.delete(f"{items}{benefit['id']}/", **self.emp).status_code, 403)
        self.assertEqual(self.c.delete(f"{items}{benefit['id']}/", **self.admin).status_code, 200)
        self.assertEqual(len(self.c.get(items, **self.emp).json()['items']), 1)


class HardeningTests(ApiTestCase):
    def test_upload_validation_and_unique_names(self):
        import os
        import shutil
        import tempfile
        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        tmp = tempfile.mkdtemp()
        try:
            with override_settings(MEDIA_ROOT=tmp):
                url = f'/api/employees/{self.emp_emp}/documents/upload/'
                post = lambda f, **h: self.c.post(url, {'file': f, 'name': 'doc'}, **h)
                self.assertEqual(post(SimpleUploadedFile('virus.exe', b'MZ'), **self.emp).status_code, 400)
                self.assertEqual(post(SimpleUploadedFile('big.pdf', b'x' * (10 * 1024 * 1024 + 1)), **self.emp).status_code, 413)
                self.assertEqual(post(SimpleUploadedFile('cv.pdf', b'%PDF-1'), **self.admin_other()).status_code, 403)
                a = post(SimpleUploadedFile('cv.pdf', b'%PDF-first'), **self.emp)
                b = post(SimpleUploadedFile('cv.pdf', b'%PDF-second'), **self.emp)
                self.assertEqual((a.status_code, b.status_code), (201, 201), a.content)
                stored = os.listdir(os.path.join(tmp, 'documents', str(self.emp_emp)))
                self.assertEqual(len(stored), 2)                                       # same name did not overwrite
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def admin_other(self):
        # an employee uploading for somebody else's profile must be refused
        from tests.test_api import make_token
        return {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(self.admin_user, self.other_emp, 'Employee')}

    def test_password_policy_and_salted_reset(self):
        r = self.post('/api/auth/register/', {'username': 'newbie', 'email': 'n@x.com', 'password': 'short'}, **self.admin)
        self.assertEqual(r.status_code, 400)
        victim = users.insert_one({'username': 'vic', 'email': 'vic@x.com'}).inserted_id
        self.assertEqual(self.post(f'/api/auth/users/{victim}/reset-password/', {'password': 'short'}, **self.admin).status_code, 400)
        self.assertEqual(self.post(f'/api/auth/users/{victim}/reset-password/', {'password': 'a-long-password'}, **self.admin).status_code, 200)
        doc = users.find_one({'_id': victim})
        self.assertTrue(doc['password'].startswith('pbkdf2_'))          # salted hash, not bare SHA-256
        self.assertNotIn('password_hash', doc)
        self.assertEqual(self.post('/api/auth/login/', {'username': 'vic', 'password': 'a-long-password'}).status_code, 200)


class CreateAdminTests(ApiTestCase):
    def test_bootstrap_admin(self):
        import create_admin
        from hr_backend.db import employees as emps, roles as rls
        self.assertIn('Created administrator', create_admin.create_admin('boot', 'boot@x.com', 'a-long-password'))
        self.assertEqual(self.post('/api/auth/login/', {'username': 'boot', 'password': 'a-long-password'}).json()['user']['role'], 'Admin')
        self.assertEqual(rls.count_documents({'name': 'Admin'}), 1)           # roles are reused, not duplicated
        user = users.find_one({'username': 'boot'})
        self.assertEqual(emps.find_one({'user_id': str(user['_id'])})['position'], 'Administrator')
        self.assertIn('already exists', create_admin.create_admin('boot', 'boot@x.com', 'another-password'))
        self.assertEqual(self.post('/api/auth/login/', {'username': 'boot', 'password': 'another-password'}).status_code, 401)
        self.assertIn('Password reset', create_admin.create_admin('boot', 'boot@x.com', 'another-password', reset_password=True))
        with self.assertRaises(ValueError):
            create_admin.create_admin('x', 'x@x.com', 'short')


class BackupTests(ApiTestCase):
    def test_dump_and_restore_roundtrip(self):
        import shutil
        import tempfile
        import backup
        folder = tempfile.mkdtemp()
        try:
            before = {'emps': employees.count_documents({}), 'users': users.count_documents({})}
            counts = backup.dump(folder)
            self.assertEqual(counts['Employees'], before['emps'])
            self.assertNotIn('LoginAttempts', counts)
            employees.delete_many({})
            users.update_one({'username': 'ada'}, {'$set': {'username': 'changed'}})
            restored = backup.restore(folder)
            self.assertEqual(restored['Employees'], before['emps'])
            self.assertEqual(employees.count_documents({}), before['emps'])
            self.assertEqual(users.count_documents({'username': 'ada'}), 1)       # original value is back, ObjectIds intact
            self.assertEqual(self.c.get('/api/employees/', **self.admin).status_code, 200)
        finally:
            shutil.rmtree(folder, ignore_errors=True)


class ManagerScopeTests(ApiTestCase):
    def test_managers_only_decide_leaves_of_their_own_people(self):
        from tests.test_api import make_token
        mgr_emp = employees.insert_one({'employee_id': 'EMP-M', 'first_name': 'Mina', 'last_name': 'Manager', 'email': 'mina@x.com',
                                        'employment_status': 'Active', 'salary': 90000}).inserted_id
        mgr_user = users.insert_one({'username': 'mina', 'email': 'mina@x.com', 'employee_id': str(mgr_emp)}).inserted_id
        employees.update_one({'_id': mgr_emp}, {'$set': {'user_id': str(mgr_user)}})
        employees.update_one({'_id': self.emp_emp}, {'$set': {'manager_id': str(mgr_emp)}})     # Bob reports to Mina
        mgr = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(mgr_user, mgr_emp, 'Manager')}

        bob_leave = self.post('/api/leaves/apply/', {'leave_type': 'Earned Leaves', 'start_date': workday(70), 'end_date': workday(70)}, **self.emp).json()['leave_id']
        # Cy (not Mina's report) also asks for leave
        cy_user = users.insert_one({'username': 'cy', 'email': 'cy@x.com', 'employee_id': str(self.other_emp)}).inserted_id
        cy = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(cy_user, self.other_emp, 'Employee')}
        cy_leave = self.post('/api/leaves/apply/', {'leave_type': 'Earned Leaves', 'start_date': workday(71), 'end_date': workday(71)}, **cy)
        self.assertEqual(cy_leave.status_code, 201, cy_leave.content)
        cy_leave = cy_leave.json()['leave_id']

        listing = self.c.get('/api/leaves/', **mgr).json()['leaves']
        self.assertEqual([l['_id'] for l in listing], [bob_leave])                      # only her own report's request is visible
        self.assertEqual(self.put(f'/api/leaves/{cy_leave}/approve/', **mgr).status_code, 403)
        self.assertEqual(self.put(f'/api/leaves/{bob_leave}/approve/', **mgr).status_code, 200)
        # a team the manager leads grants the same right over its members
        team_leader_user = users.insert_one({'username': 'lead', 'email': 'lead@x.com', 'employee_id': str(self.admin_emp)}).inserted_id
        db['Teams'].insert_one({'name': 'T', 'manager_id': str(mgr_emp), 'leader_id': str(mgr_emp),
                                'employees': [{'id': str(self.other_emp), 'name': 'Cy'}], 'members': [str(self.other_emp)]})
        self.assertEqual(self.put(f'/api/leaves/{cy_leave}/approve/', **mgr).status_code, 200)
