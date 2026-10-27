import datetime
import json
import unittest

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.test import Client

from hr_backend.db import db, employees, roles, users, notifications

assert db.name.startswith('hr_test_'), 'tests must run on a scratch database (use run_tests.py)'


def make_token(user_id, employee_id, role):
    return jwt.encode({
        'user_id': str(user_id), 'employee_id': str(employee_id), 'role': role,
        'exp': datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(hours=1),
    }, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for name in db.list_collection_names():
            db[name].delete_many({})
        admin_role = roles.insert_one({'name': 'Admin'}).inserted_id
        cls.dept = db['Departments'].insert_one({'name': 'Engineering'}).inserted_id
        cls.admin_emp = employees.insert_one({
            'employee_id': 'EMP-A', 'first_name': 'Ada', 'last_name': 'Admin', 'email': 'ada@x.com',
            'salary': 120000, 'employment_status': 'Active', 'department_id': str(cls.dept),
            'skills': [{'name': 'Python', 'proficiency': 9}, 'SQL'], 'hire_date': '2024-01-01'}).inserted_id
        cls.emp_emp = employees.insert_one({
            'employee_id': 'EMP-B', 'first_name': 'Bob', 'last_name': 'Worker', 'email': 'bob@x.com',
            'salary': 60000, 'employment_status': 'Active', 'department_id': str(cls.dept),
            'skills': ['Go'], 'hire_date': '2026-06-01'}).inserted_id
        cls.other_emp = employees.insert_one({
            'employee_id': 'EMP-C', 'first_name': 'Cy', 'last_name': 'Other', 'email': 'cy@x.com',
            'salary': 0, 'employment_status': 'Active', 'skills': []}).inserted_id
        cls.admin_user = users.insert_one({
            'username': 'ada', 'email': 'ada@x.com', 'password': make_password('secret123'),
            'role_id': str(admin_role), 'employee_id': str(cls.admin_emp)}).inserted_id
        cls.emp_user = users.insert_one({'username': 'bob', 'email': 'bob@x.com'}).inserted_id
        employees.update_one({'_id': cls.emp_emp}, {'$set': {'user_id': str(cls.emp_user)}})
        cls.c = Client()
        cls.admin = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(cls.admin_user, cls.admin_emp, 'Admin')}
        cls.emp = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(cls.emp_user, cls.emp_emp, 'Employee')}

    def post(self, path, body=None, **headers):
        return self.c.post(path, data=json.dumps(body or {}), content_type='application/json', **headers)

    def put(self, path, body=None, **headers):
        return self.c.put(path, data=json.dumps(body or {}), content_type='application/json', **headers)


class AuthTests(ApiTestCase):
    def test_login_success_and_failure(self):
        ok = self.post('/api/auth/login/', {'username': 'ada', 'password': 'secret123'})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()['user']['role'], 'Admin')
        self.assertEqual(self.post('/api/auth/login/', {'username': 'ada', 'password': 'nope'}).status_code, 401)
        self.assertEqual(self.post('/api/auth/login/', {}).status_code, 400)

    def test_requires_token(self):
        self.assertEqual(self.c.get('/api/employees/').status_code, 401)
        self.assertEqual(self.c.get('/api/health/').status_code, 200)

    def test_debug_endpoint_is_protected(self):
        self.assertEqual(self.c.get('/api/employees/debug/').status_code, 401)
        self.assertEqual(self.c.get('/api/employees/debug/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/employees/debug/', **self.admin).status_code, 200)


class SessionTests(ApiTestCase):
    def test_lockout_after_repeated_failures(self):
        users.insert_one({'username': 'victim', 'password': make_password('rightpass1')})
        for _ in range(5):
            self.assertEqual(self.post('/api/auth/login/', {'username': 'victim', 'password': 'bad'}).status_code, 401)
        # even the right password is refused while locked
        self.assertEqual(self.post('/api/auth/login/', {'username': 'victim', 'password': 'rightpass1'}).status_code, 429)
        db['LoginAttempts'].delete_many({})
        self.assertEqual(self.post('/api/auth/login/', {'username': 'victim', 'password': 'rightpass1'}).status_code, 200)

    def test_refresh_profile_and_password_change(self):
        tok = self.post('/api/auth/login/', {'username': 'ada', 'password': 'secret123'}).json()['token']
        h = {'HTTP_AUTHORIZATION': 'Bearer ' + tok}
        new = self.post('/api/auth/refresh/', **h).json()['token']
        self.assertEqual(self.c.get('/api/auth/profile/', HTTP_AUTHORIZATION='Bearer ' + new).json()['username'], 'ada')
        self.assertEqual(self.post('/api/auth/change-password/', {'current_password': 'x', 'new_password': 'longenough1'}, **h).status_code, 401)
        self.assertEqual(self.post('/api/auth/change-password/', {'current_password': 'secret123', 'new_password': 'short'}, **h).status_code, 400)
        self.assertEqual(self.post('/api/auth/change-password/', {'current_password': 'secret123', 'new_password': 'longenough1'}, **h).status_code, 200)
        self.assertEqual(self.post('/api/auth/login/', {'username': 'ada', 'password': 'longenough1'}).status_code, 200)
        users.update_one({'username': 'ada'}, {'$set': {'password': make_password('secret123')}})
        self.assertEqual(self.post('/api/auth/refresh/').status_code, 401)  # no token


class RoutingTests(ApiTestCase):
    def test_departments_list_not_shadowed(self):
        r = self.c.get('/api/employees/departments/', **self.admin)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['count'], 1)


class NotificationTests(ApiTestCase):
    def test_lifecycle_is_scoped_to_user(self):
        from utils.notify import notify
        notify(self.emp_user, 'Hi', 'one')
        notify(self.emp_user, 'Hi', 'two')
        notify(self.admin_user, 'Admin only', 'x')
        lst = self.c.get('/api/notifications/', **self.emp).json()
        self.assertEqual(len(lst), 2)
        nid = lst[0]['_id']
        self.assertEqual(self.put(f'/api/notifications/{nid}/read/', **self.emp).status_code, 200)
        self.assertEqual(len(self.c.get('/api/notifications/?unread=true', **self.emp).json()), 1)
        # another user cannot touch it
        self.assertEqual(self.put(f'/api/notifications/{nid}/read/', **self.admin).status_code, 404)
        self.assertEqual(self.c.delete(f'/api/notifications/{nid}/', **self.admin).status_code, 404)
        self.assertEqual(self.put('/api/notifications/read-all/', **self.emp).json()['updated'], 1)
        self.assertEqual(self.c.delete(f'/api/notifications/{nid}/', **self.emp).status_code, 200)


class PayrollTests(ApiTestCase):
    def test_generate_requires_admin(self):
        self.assertEqual(self.post('/api/payroll/generate/', {'period': 'March 2026'}, **self.emp).status_code, 403)

    def test_generate_view_pdf_csv(self):
        from payroll import engine
        db['Payroll'].delete_many({})
        r = self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin).json()
        self.assertEqual(r['created'], 2)  # EMP-C has no salary
        again = self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin).json()
        self.assertEqual((again['created'], again['updated']), (0, 2))
        # drafts are for HR only until they are released
        self.assertEqual(self.c.get('/api/payroll/me/', **self.emp).json()['results'], [])
        self.assertEqual(self.post('/api/payroll/mark-paid/', {'period': 'July 2026'}, **self.admin).status_code, 400)
        blocked = self.post('/api/payroll/release/', {'period': 'July 2026'}, **self.admin)
        self.assertEqual((blocked.status_code, blocked.json()['needs_confirmation']), (409, True))      # nobody has bank details yet
        self.assertEqual(self.post('/api/payroll/release/', {'period': 'July 2026', 'force': True}, **self.admin).json()['released'], 2)
        mine = self.c.get('/api/payroll/me/', **self.emp).json()['results']
        self.assertEqual(len(mine), 1)
        expected = engine.compute(60000)
        self.assertEqual(mine[0]['gross_salary'], expected['earnings_total'])
        self.assertEqual(mine[0]['net_salary'], expected['net_salary'])
        self.assertEqual(mine[0]['amount_in_words'], engine.rupees_in_words(expected['net_salary']))
        pdf = self.c.get(f"/api/payroll/payslip/{mine[0]['_id']}/pdf/", **self.emp)
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.content.startswith(b'%PDF'))
        detail = self.c.get(f"/api/payroll/payslip/{mine[0]['_id']}/", **self.emp).json()['payslip']
        self.assertEqual(detail['ytd']['net'], expected['net_salary'])
        # an employee cannot read someone else's payslip
        other = db['Payroll'].find_one({'employee_code': 'EMP-A'})
        self.assertEqual(self.c.get(f"/api/payroll/payslip/{other['_id']}/pdf/", **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/payroll/export/', **self.emp).status_code, 403)
        csv_resp = self.c.get('/api/payroll/export/?period=July%202026', **self.admin)
        self.assertIn('EMP-B', csv_resp.content.decode())
        self.assertEqual(self.post('/api/payroll/mark-paid/', {'period': 'July 2026'}, **self.admin).json()['updated'], 2)


class PermissionTests(ApiTestCase):
    def test_attendance_admin_endpoints(self):
        self.assertEqual(self.c.get('/api/attendance/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/attendance/', **self.admin).status_code, 200)
        self.assertEqual(self.c.get('/api/attendance/employee/EMP-A/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/attendance/employee/EMP-B/', **self.emp).status_code, 200)
        self.assertEqual(self.c.get('/api/attendance/summary/', **self.emp).status_code, 403)
        summary = self.c.get('/api/attendance/summary/', **self.admin)
        self.assertEqual(summary.status_code, 200)
        self.assertIn('present', summary.json())

    def test_helpdesk_owner_rules(self):
        t = db['helpdesk_tickets'].insert_one({'title': 'x', 'employee_id': str(self.admin_emp), 'status': 'Open'}).inserted_id
        self.assertEqual(self.put(f'/api/helpdesk/{t}/', {'title': 'y'}, **self.emp).status_code, 403)
        mine = db['helpdesk_tickets'].insert_one({'title': 'mine', 'employee_id': str(self.emp_emp), 'status': 'Open'}).inserted_id
        self.assertEqual(self.put(f'/api/helpdesk/{mine}/', {'status': 'Resolved'}, **self.emp).status_code, 403)
        self.assertEqual(self.put(f'/api/helpdesk/{mine}/', {'description': 'more'}, **self.emp).status_code, 200)
        before = notifications.count_documents({})
        self.assertEqual(self.put(f'/api/helpdesk/{mine}/', {'status': 'Resolved'}, **self.admin).status_code, 200)
        self.assertEqual(notifications.count_documents({}), before + 1)

    def test_objectives_owner_rules(self):
        o = db['objectives'].insert_one({'title': 'a', 'employee_id': str(self.admin_emp), 'progress': 10}).inserted_id
        mine = db['objectives'].insert_one({'title': 'b', 'employee_id': str(self.emp_emp), 'progress': 10}).inserted_id

        def patch(oid, headers):
            return self.c.patch(f'/api/objectives/{oid}/progress/', data=json.dumps({'progress': 50}),
                                content_type='application/json', **headers)

        self.assertEqual(patch(o, self.emp).status_code, 403)
        self.assertEqual(patch(mine, self.emp).status_code, 200)
        self.assertEqual(patch(o, self.admin).status_code, 200)

    def test_skills_update_self_only(self):
        body = {'skills': ['Rust']}
        self.assertEqual(self.put(f'/api/skills/employee/{self.admin_emp}/update/', body, **self.emp).status_code, 403)
        self.assertEqual(self.put(f'/api/skills/employee/{self.emp_emp}/update/', body, **self.emp).status_code, 200)

    def test_recruitment_restricted(self):
        self.assertEqual(self.c.get('/api/recruitment/jobs/', **self.emp).status_code, 403)
        job = self.post('/api/recruitment/jobs/', {'title': 'Dev', 'skills': 'Python'}, **self.admin).json()['job']
        cand = self.post(f"/api/recruitment/jobs/{job['_id']}/candidates/", {'name': 'Zed'}, **self.admin).json()['candidate']
        moved = self.put(f"/api/recruitment/candidates/{cand['_id']}/stage/", {'stage': 'Interview'}, **self.admin)
        self.assertEqual(moved.json()['candidate']['stage'], 'Interview')


class AnalyticsTests(ApiTestCase):
    def test_endpoints_return_data(self):
        for path in ('/api/ai/dashboard/', '/api/ai/engagement/', '/api/ai/attrition-risk/',
                     '/api/ai/talent-insights/team/', '/api/ai/talent-insights/skills/',
                     '/api/ai/talent-insights/growth/', '/api/ai/talent-insights/employees/',
                     '/api/ai/attendance-anomalies/', '/api/ai/payroll-anomalies/', '/api/ai/advanced-analytics/'):
            r = self.c.get(path, **self.admin)
            self.assertEqual(r.status_code, 200, path)

    def test_people_analytics_are_staff_only(self):
        for path in ('/api/ai/engagement/', '/api/ai/attrition-risk/', '/api/ai/talent-insights/employees/',
                     '/api/ai/talent-insights/growth/', '/api/ai/payroll-anomalies/', '/api/ai/attendance-anomalies/',
                     '/api/ai/advanced-analytics/', f'/api/ai/talent-insights/employee/{self.admin_emp}/'):
            self.assertEqual(self.c.get(path, **self.emp).status_code, 403, path)
        mine = self.c.get(f'/api/ai/talent-insights/employee/{self.emp_emp}/', **self.emp)
        self.assertEqual(mine.status_code, 200)
        self.assertNotIn('attritionRisk', mine.json())

    def test_dashboard_counts_real_data(self):
        self.assertEqual(self.c.get('/api/ai/dashboard/', **self.admin).json()['employees']['total'], 3)

    def test_skill_search_ranks_by_match(self):
        r = self.post('/api/ai/find-employees-by-skills/', {'skills': ['python', 'sql', 'go']}, **self.admin).json()
        self.assertEqual(r[0]['name'], 'Ada Admin')
        self.assertEqual(r[0]['suitability'], 67)

    def test_job_matching_uses_recruitment_jobs(self):
        job = self.post('/api/recruitment/jobs/', {'title': 'Backend', 'skills': 'Python, SQL, Rust'}, **self.admin).json()['job']
        r = self.post('/api/ai/job-matching/', {'job_id': job['_id']}, **self.admin).json()
        self.assertEqual(r[0]['employee_name'], 'Ada Admin')
        self.assertEqual(r[0]['match_score'], 67)
        self.assertEqual(r[0]['matching_skills'], ['Python', 'SQL'])
        self.assertEqual(self.post('/api/ai/job-matching/', {'job_id': '0' * 24}, **self.admin).status_code, 404)
        self.assertEqual(self.c.get('/api/ai/job-matching/', **self.admin).json(), [])

    def test_generate_review_from_data(self):
        db['objectives'].insert_one({'title': 'o', 'employee_id': str(self.emp_emp), 'progress': 90, 'status': 'Completed'})
        r = self.post('/api/ai/generate-review/', {'employee_id': str(self.emp_emp)}, **self.admin).json()
        self.assertIn('Completed 1 of 1 objectives', r['key_achievements'])
        self.assertEqual(r['data_quality'], 'ok')
        self.assertEqual(r['ratings']['technical_skills'], 90)
        # employees may only generate their own review
        self.assertEqual(self.post('/api/ai/generate-review/', {'employee_id': str(self.admin_emp)}, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/ai/generate-review/', {'employee_id': str(self.emp_emp)}, **self.emp).status_code, 200)
        self.assertEqual(self.post('/api/ai/generate-review/', {'employee_id': '0' * 24}, **self.admin).status_code, 404)

    def test_hr_analytics_report(self):
        r = self.c.get('/api/ai/hr-analytics/', **self.admin)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        for section in ('workforce', 'hiring', 'attendance', 'performance', 'pay', 'engagement'):
            self.assertIn(section, data)
        self.assertEqual(len(data['workforce']['trend']), 12)
        self.assertEqual({d['name']: d['value'] for d in data['workforce']['by_department']}['Engineering'], 2)
        self.assertGreater(data['pay']['annual_ctc'], 0)
        self.assertEqual(self.c.get('/api/ai/hr-analytics/', **self.emp).status_code, 403)

    def test_payroll_anomaly_flags_missing_salary(self):
        types = [a['type'] for a in self.c.get('/api/ai/payroll-anomalies/', **self.admin).json()['anomalies']]
        self.assertIn('Missing Salary', types)

    def test_resume_history_and_unconfigured_ai(self):
        self.assertEqual(self.c.get('/api/ai/resume-screening/history/', **self.emp).status_code, 403)
        saved = self.post('/api/ai/resume-screening/history/', {'candidateName': 'Zed', 'score': 8, 'matchingSkills': ['Go']}, **self.admin)
        self.assertEqual(saved.status_code, 201)
        history = self.c.get('/api/ai/resume-screening/history/', **self.admin).json()
        self.assertEqual(history[0]['candidateName'], 'Zed')
        self.assertEqual(self.post('/api/ai/resume-screening/history/', {}, **self.admin).status_code, 400)
        self.assertEqual(self.c.delete(f"/api/ai/resume-screening/history/?id={history[0]['id']}", **self.admin).json()['deleted'], 1)
        # no API key in tests -> a clear 503 rather than a crash
        from django.core.files.uploadedfile import SimpleUploadedFile
        r = self.c.post('/api/ai/resume-screening/', {'jobTitle': 'Dev', 'skills': 'Go',
                        'resume': SimpleUploadedFile('cv.txt', b'I know Go and SQL')}, **self.admin)
        self.assertEqual(r.status_code, 503)

    def test_chatbot_fallback_logs(self):
        r = self.post('/api/ai/chatbot/', {'message': 'how many leave days left?'}, **self.emp).json()
        self.assertEqual(r['source'], 'fallback')
        self.assertIn('18', r['reply'])
        self.assertGreaterEqual(db['ChatLogs'].count_documents({}), 1)
        self.assertEqual(self.post('/api/ai/chatbot/', {}, **self.emp).status_code, 400)


class InsightHelperTests(unittest.TestCase):
    def test_pure_helpers(self):
        from ai_analytics import insights as i
        self.assertEqual(i.skill_name({'name': ' Go '}), 'Go')
        self.assertEqual(i.skill_name('SQL'), 'SQL')
        self.assertIsNone(i.sentiment_score('the quick fox'))
        self.assertGreater(i.sentiment_score('excellent and reliable'), 0)
        self.assertLess(i.sentiment_score('poor and late'), 0)
        self.assertEqual(i.attendance_hours({'hours_worked': '8'}), 8.0)
        self.assertAlmostEqual(i.attendance_hours({'clock_in': '2026-01-01T09:00:00+00:00',
                                                   'clock_out': '2026-01-01T17:30:00+00:00'}), 8.5)


class SettingsTests(ApiTestCase):
    def test_settings_roundtrip_and_notification_toggle(self):
        from utils.notify import notify
        self.assertEqual(self.c.get('/api/settings/', **self.emp).json()['general']['timezone'], 'Asia/Kolkata')
        self.assertEqual(self.put('/api/settings/', {'general': {'companyName': 'Evil'}}, **self.emp).status_code, 403)
        r = self.put('/api/settings/', {'general': {'companyName': 'Acme', 'bogus': 'x'},
                                        'notifications': {'ticketUpdates': False}}, **self.admin).json()
        self.assertEqual(r['general']['companyName'], 'Acme')
        self.assertNotIn('bogus', r['general'])
        self.assertFalse(r['notifications']['ticketUpdates'])
        self.assertIsNone(notify(self.emp_user, 'T', 'm', type='ticket_update'))
        self.assertIsNotNone(notify(self.emp_user, 'T', 'm', type='expense_update'))
        self.put('/api/settings/', {'notifications': {'ticketUpdates': True}}, **self.admin)


class PayrollSettingsTests(ApiTestCase):
    def tearDown(self):
        db['Settings'].delete_many({})

    def test_configurable_rates(self):
        self.assertEqual(self.put('/api/settings/', {'payroll': {'pfPct': 150}}, **self.admin).status_code, 400)
        self.assertEqual(self.put('/api/settings/', {'payroll': {'ptAmount': -5}}, **self.admin).status_code, 400)
        self.assertEqual(self.put('/api/settings/', {'payroll': {'ptAmount': 'lots'}}, **self.admin).status_code, 400)
        ok = self.put('/api/settings/', {'payroll': {'pfPct': 0, 'tdsEnabled': False}}, **self.admin)
        self.assertEqual(ok.status_code, 200)
        db['Payroll'].delete_many({})
        self.post('/api/payroll/generate/', {'period': 'August 2026'}, **self.admin)
        slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'August 2026'})
        self.assertEqual((slip['tax'], slip['provident_fund']), (0, 0))


def workday(offset=14):
    """An ISO date `offset` days from today, moved forward to a Monday-Friday that is not a company holiday."""
    import datetime
    from utils.workdays import DEFAULT_HOLIDAYS
    holidays = {h['date'] for h in DEFAULT_HOLIDAYS}
    day = datetime.date.today() + datetime.timedelta(days=offset)
    while day.weekday() >= 5 or day.isoformat() in holidays:
        day += datetime.timedelta(days=1)
    return day.isoformat()
