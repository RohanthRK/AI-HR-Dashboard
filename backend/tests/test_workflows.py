"""Recruitment and bulk import, saved AI reviews, training filters, recognition order, HR-initiated exits, employee filters."""
import datetime
from unittest import mock

from hr_backend.db import db, employees
from tests.test_api import ApiTestCase
from utils.llm import LLMNotConfigured


class RecruitmentTests(ApiTestCase):
    def setUp(self):
        db['jobs'].delete_many({})
        db['candidates'].delete_many({})
        self.job = self.post('/api/recruitment/jobs/', {'title': 'Backend Engineer', 'department': 'Engineering', 'skills': 'Python, SQL', 'openings': 2,
                                                        'salary_min_lpa': 20, 'salary_max_lpa': 30}, **self.admin).json()['job']

    def test_job_validation_and_permissions(self):
        self.assertEqual(self.post('/api/recruitment/jobs/', {'title': 'X'}, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/recruitment/jobs/', {'title': ''}, **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/recruitment/jobs/', {'title': 'X', 'status': 'Weird'}, **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/recruitment/jobs/', {'title': 'X', 'salary_min_lpa': 40, 'salary_max_lpa': 10}, **self.admin).status_code, 400)
        stored = db['jobs'].find_one({'title': 'Backend Engineer'})
        self.assertEqual((stored['openings'], stored['skills']), (2, 'Python, SQL'))
        evil = self.post('/api/recruitment/jobs/', {'title': 'Y', 'is_admin': True, '$set': {'x': 1}}, **self.admin).json()['job']
        self.assertNotIn('is_admin', evil)                        # only known fields are stored

    def test_edit_close_and_delete_rules(self):
        url = f"/api/recruitment/jobs/{self.job['_id']}/"
        closed = self.put(url, {'status': 'Closed'}, **self.admin).json()['job']
        self.assertEqual((closed['status'], closed['title']), ('Closed', 'Backend Engineer'))
        self.post(f"{url}candidates/", {'name': 'Asha Rao', 'email': 'asha@example.com'}, **self.admin)
        self.assertEqual(self.c.delete(url, **self.admin).status_code, 409)           # has candidates: close instead
        empty = self.post('/api/recruitment/jobs/', {'title': 'Temp'}, **self.admin).json()['job']
        self.assertEqual(self.c.delete(f"/api/recruitment/jobs/{empty['_id']}/", **self.admin).status_code, 200)

    def test_candidates_are_validated_and_unique_per_job(self):
        url = f"/api/recruitment/jobs/{self.job['_id']}/candidates/"
        ok = self.post(url, {'name': 'Asha Rao', 'email': 'ASHA@Example.com', 'experience': '4 years', 'notice_period_days': '30 days',
                             'current_ctc_lpa': '12 LPA', 'skills': 'python; sql / docker'}, **self.admin)
        self.assertEqual(ok.status_code, 201, ok.content)
        cand = ok.json()['candidate']
        self.assertEqual((cand['email'], cand['experience'], cand['notice_period_days'], cand['current_ctc_lpa']), ('asha@example.com', '4', 30, 12.0))
        self.assertEqual(cand['skills'], 'python, sql, docker')
        self.assertEqual(self.post(url, {'name': 'Asha Again', 'email': 'asha@example.com'}, **self.admin).status_code, 409)
        self.assertEqual(self.post(url, {'name': 'Bad Mail', 'email': 'nope'}, **self.admin).status_code, 400)
        self.assertEqual(self.post(url, {'email': 'x@y.com'}, **self.admin).status_code, 400)
        self.assertEqual(self.put(f"/api/recruitment/candidates/{cand['_id']}/stage/", {'stage': 'Teleported'}, **self.admin).status_code, 400)
        edited = self.put(f"/api/recruitment/candidates/{cand['_id']}/", {'name': 'Asha Rao', 'location': 'Pune'}, **self.admin).json()['candidate']
        self.assertEqual((edited['location'], edited['email']), ('Pune', 'asha@example.com'))
        self.assertEqual(self.c.delete(f"/api/recruitment/candidates/{cand['_id']}/", **self.admin).status_code, 200)
        self.assertEqual(self.c.get(url, **self.admin).json()['candidates'], [])

    def test_bulk_import_from_a_pasted_table(self):
        base = f"/api/recruitment/jobs/{self.job['_id']}/candidates/"
        self.post(base, {'name': 'Existing One', 'email': 'exists@example.com'}, **self.admin)
        text = ('Name\tEmail\tMobile\tCity\tExp\tSkills\tNotice\tCTC\tExpected CTC\n'
                'Ananya Iyer\tananya@example.com\t+91 98450 12345\tBengaluru\t4\tPython, Django\t30\t14\t18\n'
                'Existing One\texists@example.com\t\t\t\t\t\t\t\n'
                'Broken Mail\tnot-an-email\t\t\t\t\t\t\t\n')
        r = self.post(f'{base}parse/', {'text': text}, **self.admin)
        self.assertEqual(r.status_code, 200, r.content)
        out = r.json()
        self.assertEqual(out['read_with'], 'table')
        by_name = {c['name']: c for c in out['candidates']}
        self.assertEqual(by_name['Ananya Iyer']['expected_ctc_lpa'], 18.0)
        self.assertEqual(by_name['Ananya Iyer']['notice_period_days'], 30)
        self.assertTrue(by_name['Existing One']['duplicate'])
        self.assertEqual(len(out['warnings']), 1)                                   # the broken e-mail row is reported, not imported
        self.assertEqual(db['candidates'].count_documents({}), 1)                   # parsing saves nothing
        done = self.post(f'{base}bulk/', {'candidates': out['candidates']}, **self.admin).json()
        self.assertEqual((done['created'], done['skipped']), (1, 1))
        self.assertEqual(db['candidates'].find_one({'email': 'ananya@example.com'})['stage'], 'Applied')
        self.assertEqual(self.post(f'{base}parse/', {'text': text}, **self.emp).status_code, 403)

    def test_free_text_import_uses_ai_only_when_available(self):
        base = f"/api/recruitment/jobs/{self.job['_id']}/candidates/"
        prose = 'Rohit Verma - rohit.v@example.com - Pune - 6 years Java, Spring - serving 60 days notice - 22 LPA'
        with mock.patch('utils.llm.configured_providers', return_value=[]):
            self.assertEqual(self.post(f'{base}parse/', {'text': prose}, **self.admin).status_code, 400)
        fake = ([{'name': 'Rohit Verma', 'email': 'rohit.v@example.com', 'location': 'Pune', 'experience': 6, 'skills': 'Java, Spring',
                  'notice_period_days': 60, 'current_ctc_lpa': 22, 'instructions': 'ignored'}], 'gemini')
        with mock.patch('recruitment.views._parse_with_ai', return_value=fake):
            out = self.post(f'{base}parse/', {'text': prose}, **self.admin).json()
        self.assertEqual(out['read_with'], 'AI (gemini)')
        self.assertEqual((out['candidates'][0]['name'], out['candidates'][0]['notice_period_days']), ('Rohit Verma', 60))
        self.assertNotIn('instructions', out['candidates'][0])


class SavedReviewTests(ApiTestCase):
    def setUp(self):
        db['SavedReviews'].delete_many({})
        self.review = {'summary': 'Bob delivers steadily.', 'strengths': ['Reliable'], 'areas_for_improvement': ['Delegation'],
                       'ratings': {'performance': 4, 'overall': 4.0}, 'key_achievements': ['Shipped X']}

    def test_save_twice_deliver_and_employee_view(self):
        body = {'kind': 'employee', 'subject_id': str(self.emp_emp), 'review': self.review}
        self.assertEqual(self.post('/api/ai/saved-reviews/', body, **self.emp).status_code, 403)
        first = self.post('/api/ai/saved-reviews/', body, **self.admin)
        self.assertEqual(first.status_code, 201, first.content)
        again = self.post('/api/ai/saved-reviews/', body, **self.admin)
        self.assertEqual((again.status_code, again.json()['already_saved']), (200, True))
        self.assertEqual(db['SavedReviews'].count_documents({}), 1)
        saved_id = first.json()['review']['_id']
        self.assertEqual(self.c.get('/api/ai/my-reviews/', **self.emp).json()['reviews'], [])            # a draft is private
        self.assertEqual(self.c.get(f'/api/ai/saved-reviews/{saved_id}/', **self.emp).status_code, 403)
        sent = self.put(f'/api/ai/saved-reviews/{saved_id}/', {'deliver': True, 'comment': 'Great quarter'}, **self.admin)
        self.assertEqual(sent.json()['review']['status'], 'Delivered')
        mine = self.c.get('/api/ai/my-reviews/', **self.emp).json()['reviews']
        self.assertEqual(len(mine), 1)
        opened = self.c.get(f'/api/ai/saved-reviews/{saved_id}/', **self.emp).json()['review']
        self.assertEqual((opened['comment'], opened['review']['summary']), ('Great quarter', 'Bob delivers steadily.'))
        self.assertEqual(self.c.get('/api/ai/saved-reviews/?status=Delivered', **self.admin).json()['reviews'][0]['subject_name'], 'Bob Worker')
        self.assertEqual(self.c.delete(f'/api/ai/saved-reviews/{saved_id}/', **self.emp).status_code, 403)
        self.assertEqual(self.c.delete(f'/api/ai/saved-reviews/{saved_id}/', **self.admin).status_code, 200)

    def test_bad_input(self):
        self.assertEqual(self.post('/api/ai/saved-reviews/', {'kind': 'nope', 'review': {'a': 1}}, **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/ai/saved-reviews/', {'kind': 'employee', 'subject_id': '0' * 24, 'review': self.review}, **self.admin).status_code, 404)
        self.assertEqual(self.post('/api/ai/saved-reviews/', {'kind': 'employee', 'subject_id': str(self.emp_emp), 'review': {}}, **self.admin).status_code, 400)

    def test_delivering_with_the_save_call(self):
        out = self.post('/api/ai/saved-reviews/', {'kind': 'employee', 'subject_id': str(self.emp_emp), 'review': self.review, 'deliver': True}, **self.admin).json()
        self.assertEqual(out['review']['status'], 'Delivered')


class ScreeningSaveTests(ApiTestCase):
    def test_saving_the_same_screening_twice_does_not_duplicate(self):
        db['ScreeningResults'].delete_many({})
        body = {'candidateName': 'Rohanth', 'candidateEmail': 'r@x.com', 'jobTitle': 'Engineer', 'department': 'Engineering', 'score': 9}
        self.assertEqual(self.post('/api/ai/resume-screening/history/', body, **self.admin).status_code, 201)
        again = self.post('/api/ai/resume-screening/history/', body, **self.admin)
        self.assertEqual((again.status_code, again.json()['already_saved']), (200, True))
        self.assertEqual(db['ScreeningResults'].count_documents({}), 1)
        self.assertEqual(self.post('/api/ai/resume-screening/history/', dict(body, score=7), **self.admin).status_code, 201)


class TrainingFilterTests(ApiTestCase):
    def test_assign_by_department_and_scoped_listing(self):
        db['Courses'].delete_many({})
        db['TrainingAssignments'].delete_many({})
        employees.update_one({'_id': self.emp_emp}, {'$set': {'department': 'Engineering'}})
        employees.update_one({'_id': self.admin_emp}, {'$set': {'department': 'Human Resources'}})
        course = self.post('/api/training/courses/', {'title': 'Secure Coding', 'skills': 'Security'}, **self.admin).json()['course']
        r = self.post('/api/training/assign/', {'course_id': course['_id'], 'department': 'Engineering'}, **self.admin).json()
        self.assertEqual(r['created'], 1)
        rows = self.c.get('/api/training/assignments/', **self.admin).json()['assignments']
        self.assertEqual((rows[0]['employee_name'], rows[0]['department']), ('Bob Worker', 'Engineering'))
        self.assertEqual(self.post('/api/training/assign/', {'course_id': course['_id'], 'department': 'Nowhere'}, **self.admin).status_code, 400)


class RecognitionOrderTests(ApiTestCase):
    def test_newest_recognition_is_first(self):
        db['Recognitions'].delete_many({})
        db['Recognitions'].insert_one({'from_employee_id': str(self.admin_emp), 'to_employee_id': str(self.emp_emp), 'badge': 'kudos', 'message': 'older', 'points': 10,
                                       'created_at': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(hours=3)).isoformat()})
        self.post('/api/recognition/', {'to': str(self.admin_emp), 'badge': 'teamwork', 'message': 'just now'}, **self.emp)
        feed = self.c.get('/api/recognition/?limit=10', **self.emp).json()['recognitions']
        self.assertEqual([r['message'] for r in feed], ['just now', 'older'])
        self.assertEqual(self.c.get('/api/recognition/?limit=abc', **self.emp).status_code, 200)


class ExitTests(ApiTestCase):
    def setUp(self):
        db['Offboarding'].delete_many({})

    def test_hr_can_record_an_exit_for_someone_else(self):
        body = {'employee_id': str(self.emp_emp), 'exit_type': 'Termination', 'reason_category': 'Performance', 'last_working_day': '2026-12-31'}
        self.assertEqual(self.post('/api/offboarding/', body, **self.emp).status_code, 400)         # an employee cannot use the HR-only types
        self.assertEqual(self.post('/api/offboarding/', dict(body, employee_id=str(self.admin_emp)), **self.emp).status_code, 403)
        made = self.post('/api/offboarding/', body, **self.admin)
        self.assertEqual(made.status_code, 201, made.content)
        self.assertEqual((made.json()['request']['employee_name'], made.json()['request']['exit_type']), ('Bob Worker', 'Termination'))
        self.assertEqual(self.post('/api/offboarding/', body, **self.admin).status_code, 409)       # already has an open exit
        self.assertEqual(self.post('/api/offboarding/', dict(body, exit_type='Vanished'), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/offboarding/', dict(body, last_working_day='soon'), **self.admin).status_code, 400)
        listing = self.c.get('/api/offboarding/', **self.admin).json()
        self.assertEqual(listing['notice_period_days'], 60)
        self.assertEqual(listing['requests'][0]['employee_code'], 'EMP-B')

    def test_approved_exit_gets_the_indian_checklist(self):
        rid = self.post('/api/offboarding/', {'reason_category': 'Career growth', 'last_working_day': '2026-12-31'}, **self.emp).json()['request']['_id']
        self.put(f'/api/offboarding/{rid}/', {'status': 'Approved'}, **self.admin)
        tasks = [c['task'] for c in db['Offboarding'].find_one({})['checklist']]
        self.assertTrue(any('Full and final settlement' in t for t in tasks))
        self.assertTrue(any('relieving' in t.lower() for t in tasks))


class EmployeeFilterTests(ApiTestCase):
    def test_only_safe_fields_can_be_filtered(self):
        everyone = self.c.get('/api/employees/', **self.admin).json()['count']
        probe = self.c.get('/api/employees/?salary=60000', **self.admin).json()['count']
        self.assertEqual(probe, everyone)                                  # pay cannot be probed through filters
        self.assertGreaterEqual(self.c.get('/api/employees/?status=Active', **self.admin).json()['count'], 1)
        self.assertEqual(self.c.get('/api/employees/?search=(((', **self.admin).status_code, 200)       # regex characters are escaped

    def test_creation_checks_pan_dob_and_manager(self):
        base = {'first_name': 'New', 'last_name': 'Joiner', 'email': 'new.joiner@x.com'}
        self.assertEqual(self.post('/api/employees/new/', dict(base, tax_id='123'), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/employees/new/', dict(base, date_of_birth='2024-01-01'), **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/employees/new/', dict(base, manager_id='0' * 24), **self.admin).status_code, 400)
        ok = self.post('/api/employees/new/', dict(base, tax_id='abcde1234f', date_of_birth='1996-04-12', manager_id=str(self.admin_emp), salary=1200000), **self.admin)
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(employees.find_one({'email': 'new.joiner@x.com'})['tax_id'], 'ABCDE1234F')


class ComplianceReminderTests(ApiTestCase):
    def test_reminder_for_one_employee(self):
        db['Courses'].delete_many({})
        db['TrainingAssignments'].delete_many({})
        db['Notifications'].delete_many({})
        db['Courses'].insert_one({'title': 'POSH', 'mandatory': True})
        everyone = self.post('/api/reports/compliance/notify/', {}, **self.admin).json()['sent']
        db['Notifications'].delete_many({})
        one = self.post('/api/reports/compliance/notify/', {'employee_id': str(self.emp_emp)}, **self.admin).json()['sent']
        self.assertEqual(one, 1)
        self.assertGreaterEqual(everyone, one)


class SettingsRoundTripTests(ApiTestCase):
    def tearDown(self):
        db['Settings'].delete_many({})

    def test_settings_can_be_saved_exactly_as_loaded(self):
        # the Settings page sends back everything it loaded, including the default Indian holiday list
        loaded = self.c.get('/api/settings/', **self.admin).json()
        body = {k: loaded[k] for k in ('general', 'notifications', 'payroll', 'knowledge')}
        saved = self.put('/api/settings/', body, **self.admin)
        self.assertEqual(saved.status_code, 200, saved.content)
        dates = [h['date'] for h in loaded['general']['holidays']]
        self.assertEqual(len(dates), len(set(dates)))
        self.assertTrue(any(h['name'] == 'Republic Day' for h in loaded['general']['holidays']))


class StaleSessionTests(ApiTestCase):
    def test_a_token_stops_working_when_the_account_goes_away_or_is_deactivated(self):
        from bson import ObjectId
        from hr_backend.db import users
        from tests.test_api import make_token
        ghost = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(ObjectId(), ObjectId(), 'Admin')}      # e.g. a session from before the database was reseeded
        self.assertEqual(self.c.get('/api/dashboard/', **ghost).status_code, 401)
        self.assertIn('no longer exists', self.c.get('/api/dashboard/', **ghost).json()['message'])
        self.assertEqual(self.c.get('/api/dashboard/', **self.emp).status_code, 200)
        users.update_one({'_id': self.emp_user}, {'$set': {'active': False}})
        try:
            self.assertEqual(self.c.get('/api/dashboard/', **self.emp).status_code, 401)
        finally:
            users.update_one({'_id': self.emp_user}, {'$set': {'active': True}})
        self.assertEqual(self.c.get('/api/dashboard/', **self.emp).status_code, 200)
