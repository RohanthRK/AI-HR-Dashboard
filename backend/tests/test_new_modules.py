"""Training, surveys, compliance and offboarding."""
import datetime

from hr_backend.db import db, employees, documents, notifications, users
from tests.test_api import ApiTestCase, make_token, workday


class TrainingTests(ApiTestCase):
    def test_course_assignment_completion_and_recommendations(self):
        self.assertEqual(self.post('/api/training/courses/', {'title': 'Go 101'}, **self.emp).status_code, 403)
        course = self.post('/api/training/courses/', {'title': 'Rust basics', 'skills': 'Rust, Python',
                                                      'mandatory': False}, **self.admin).json()['course']
        # demand: an open job asks for Rust -> Bob (who lacks it) gets the course recommended
        self.post('/api/recruitment/jobs/', {'title': 'Systems', 'skills': 'Rust', 'status': 'Open'}, **self.admin)
        recs = self.c.get('/api/training/recommendations/', **self.emp).json()
        self.assertIn('rust', recs['skill_gaps'])
        self.assertEqual(recs['recommendations'][0]['course']['title'], 'Rust basics')
        self.assertEqual(self.c.get(f'/api/training/recommendations/?employee_id={self.admin_emp}', **self.emp).status_code, 403)

        before = notifications.count_documents({'type': 'training_assigned'})
        r = self.post('/api/training/assign/', {'course_id': course['_id'], 'employee_ids': [str(self.emp_emp)],
                                                'due_date': '2026-12-31'}, **self.admin).json()
        self.assertEqual(r['created'], 1)
        self.assertEqual(self.post('/api/training/assign/', {'course_id': course['_id'], 'employee_ids': [str(self.emp_emp)]},
                                   **self.admin).json()['created'], 0)
        self.assertEqual(notifications.count_documents({'type': 'training_assigned'}), before + 1)
        mine = self.c.get('/api/training/mine/', **self.emp).json()['assignments']
        self.assertEqual(mine[0]['status'], 'Assigned')
        done = self.put(f"/api/training/assignments/{mine[0]['_id']}/", {'status': 'Completed'}, **self.emp)
        self.assertEqual(done.status_code, 200, done.content)
        self.assertEqual(done.json()['assignment']['skills_gained'], ['Rust', 'Python'])
        self.assertIn('Rust', [s if isinstance(s, str) else s['name'] for s in employees.find_one({'_id': self.emp_emp})['skills']])
        self.assertEqual(self.put(f"/api/training/assignments/{mine[0]['_id']}/", {'status': 'Bogus'}, **self.emp).status_code, 400)
        self.assertEqual(self.c.get('/api/training/assignments/', **self.emp).status_code, 403)


class SurveyTests(ApiTestCase):
    def make_survey(self, **extra):
        payload = {'title': 'Q1 pulse', 'type': 'engagement', 'anonymous': True, 'questions': [
            {'id': 'a', 'type': 'rating', 'text': 'How happy are you?'},
            {'id': 'b', 'type': 'text', 'text': 'Comments'}], **extra}
        return self.post('/api/feedback/surveys/', payload, **self.admin).json()['survey']

    def test_anonymous_flow_and_threshold(self):
        self.assertEqual(self.post('/api/feedback/surveys/', {'title': 'x'}, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/feedback/surveys/', {'title': 'x', 'questions': []}, **self.admin).status_code, 400)
        s = self.make_survey()
        url = f"/api/feedback/surveys/{s['_id']}/respond/"
        self.assertEqual(self.post(url, {'answers': {'a': 9}}, **self.emp).status_code, 400)
        self.assertEqual(self.post(url, {'answers': {'a': 4, 'b': 'Great team but workload is stressful'}}, **self.emp).status_code, 201)
        self.assertEqual(self.post(url, {'answers': {'a': 5}}, **self.emp).status_code, 409)   # once only
        stored = db['SurveyResponses'].find_one({'survey_id': s['_id']})
        self.assertNotIn('employee_id', stored)                                                # anonymous
        res = self.c.get(f"/api/feedback/surveys/{s['_id']}/results/", **self.admin).json()['results']
        self.assertTrue(res['hidden'])                                                          # < 3 responses
        for i in range(2):
            other = {'HTTP_AUTHORIZATION': 'Bearer ' + make_token(self.admin_user, employees.insert_one(
                {'employee_id': f'EMP-S{i}', 'first_name': 'S', 'email': f's{i}@x.com', 'employment_status': 'Active'}).inserted_id, 'Employee')}
            self.post(url, {'answers': {'a': 2, 'b': 'Long hours, burnout'}}, **other)
        res = self.c.get(f"/api/feedback/surveys/{s['_id']}/results/", **self.admin).json()['results']
        self.assertFalse(res['hidden'])
        self.assertEqual(res['questions'][0]['average'], round((4 + 2 + 2) / 3, 2))
        self.assertTrue(any(t['theme'] == 'Work-Life Balance' for t in res['text_themes']))
        self.assertEqual(self.c.get(f"/api/feedback/surveys/{s['_id']}/results/", **self.emp).status_code, 403)
        # engagement endpoint now uses the survey
        eng = self.c.get('/api/ai/engagement/', **self.admin).json()
        self.assertEqual(eng['survey']['score10'], round((4 + 2 + 2) / 3 * 2, 1))
        self.put(f"/api/feedback/surveys/{s['_id']}/close/", **self.admin)
        self.assertEqual(self.post(url, {'answers': {'a': 3}}, **self.emp).status_code, 400)


class OffboardingTests(ApiTestCase):
    def test_resignation_flow(self):
        bad = self.post('/api/offboarding/', {'last_working_day': '2026-12-31', 'reason_category': 'Nope'}, **self.emp)
        self.assertEqual(bad.status_code, 400)
        r = self.post('/api/offboarding/', {'last_working_day': '2026-12-31', 'reason_category': 'Career growth',
                                            'reason': 'new role'}, **self.emp)
        self.assertEqual(r.status_code, 201, r.content)
        rid = r.json()['request']['_id']
        self.assertEqual(self.post('/api/offboarding/', {'last_working_day': '2027-01-31', 'reason_category': 'Other'},
                                   **self.emp).status_code, 409)
        # exit survey is hidden until approval
        self.assertEqual(len(self.c.get('/api/feedback/surveys/', **self.emp).json()['surveys']), 0)
        self.assertEqual(self.put(f'/api/offboarding/{rid}/', {'status': 'Approved'}, **self.emp).status_code, 403)
        self.assertEqual(self.put(f'/api/offboarding/{rid}/', {'status': 'Approved'}, **self.admin).status_code, 200)
        surveys = self.c.get('/api/feedback/surveys/', **self.emp).json()['surveys']
        self.assertEqual([s['type'] for s in surveys], ['exit'])
        self.assertEqual(self.post(f"/api/feedback/surveys/{surveys[0]['_id']}/respond/",
                                   {'answers': {'q1': 3, 'q3': 'Career growth'}}, **self.emp).status_code, 201)
        # cannot complete with an open checklist
        self.assertEqual(self.put(f'/api/offboarding/{rid}/', {'status': 'Completed'}, **self.admin).status_code, 400)
        items = self.c.get('/api/offboarding/', **self.admin).json()['requests'][0]['checklist']
        for item in items:
            self.put(f"/api/offboarding/{rid}/checklist/{item['id']}/", {'done': True}, **self.admin)
        self.assertEqual(self.put(f'/api/offboarding/{rid}/', {'status': 'Completed'}, **self.admin).status_code, 200)
        self.assertEqual(employees.find_one({'_id': self.emp_emp})['employment_status'], 'Terminated')
        stats = self.c.get('/api/offboarding/analytics/', **self.admin).json()
        self.assertEqual(stats['reasons'], {'Career growth': 1})
        self.assertEqual(stats['total_exits'], 1)
        # completing the exit deactivated the employee's account, so their old token no longer works at all
        self.assertEqual(self.c.get('/api/offboarding/analytics/', **self.emp).status_code, 401)
        users.update_one({'_id': self.emp_user}, {'$set': {'active': True}})
        self.assertEqual(self.c.get('/api/offboarding/analytics/', **self.emp).status_code, 403)


class ComplianceTests(ApiTestCase):
    def test_expiring_documents_and_mandatory_training(self):
        today = datetime.date.today()
        documents.insert_one({'employee_id': self.admin_emp, 'name': 'Visa', 'expires_on': (today - datetime.timedelta(days=3)).isoformat()})
        documents.insert_one({'employee_id': self.admin_emp, 'name': 'Passport', 'expires_on': (today + datetime.timedelta(days=400)).isoformat()})
        course = self.post('/api/training/courses/', {'title': 'Safety', 'mandatory': True}, **self.admin).json()['course']
        self.post('/api/training/assign/', {'course_id': course['_id'], 'employee_ids': [str(self.admin_emp)],
                                            'due_date': (today - datetime.timedelta(days=1)).isoformat()}, **self.admin)
        data = self.c.get('/api/reports/compliance/', **self.admin).json()
        messages = [a['message'] for a in data['alerts']]
        self.assertTrue(any('Visa' in m and 'expired' in m for m in messages))
        self.assertFalse(any('Passport' in m for m in messages))
        self.assertTrue(any("Safety" in m and 'was due' in m for m in messages))
        self.assertTrue(any("Safety" in m and 'not been assigned' in m for m in messages))   # nobody else assigned
        self.assertGreater(data['critical'], 0)
        self.assertEqual(self.c.get('/api/reports/compliance/', **self.emp).status_code, 403)
        sent = self.post('/api/reports/compliance/notify/', **self.admin).json()['sent']
        self.assertGreaterEqual(sent, 1)


class ExtrasTests(ApiTestCase):
    def tearDown(self):
        db['Settings'].delete_many({})

    def test_faq_drives_chatbot_and_validation(self):
        self.assertEqual(self.put('/api/settings/', {'knowledge': {'faq': [{'q': '', 'a': 'x'}]}}, **self.admin).status_code, 400)
        self.put('/api/settings/', {'knowledge': {'faq': [{'q': 'What is the dress code policy?', 'a': 'Smart casual.'}]}}, **self.admin)
        r = self.post('/api/ai/chatbot/', {'message': 'tell me the dress code'}, **self.emp).json()
        self.assertEqual(r['reply'], 'Smart casual.')

    def test_required_documents_alert(self):
        self.put('/api/settings/', {'knowledge': {'requiredDocuments': ['ID proof']}}, **self.admin)
        documents.insert_one({'employee_id': self.admin_emp, 'name': 'ID proof - passport', 'category': 'identity'})
        alerts = self.c.get('/api/reports/compliance/', **self.admin).json()['alerts']
        missing = {a['employee'] for a in alerts if 'ID proof' in a['message']}
        self.assertNotIn('Ada Admin', missing)
        self.assertIn('Bob Worker', missing)

    def test_overtime_in_payroll(self):
        self.put('/api/settings/', {'payroll': {'payOvertime': True}}, **self.admin)
        db['Attendance'].insert_many([
            {'employee_id': str(self.emp_emp), 'date': '2026-06-01', 'hours_worked': 10},
            {'employee_id': str(self.emp_emp), 'date': '2026-06-02', 'hours_worked': 7},
        ])
        self.post('/api/payroll/generate/', {'period': 'June 2026'}, **self.admin)
        slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'June 2026'})
        self.assertEqual(slip['overtime_hours'], 2.0)
        from payroll import engine
        hourly = 60000 / 12 / 173.33
        self.assertAlmostEqual(slip['overtime_pay'], 2 * hourly * 1.5, delta=1)
        self.assertEqual(slip['net_salary'], engine.compute(60000, overtime_pay=slip['overtime_pay'])['net_salary'])

    def test_job_description_and_growth_lists(self):
        r = self.post('/api/ai/generate-job-description/', {'title': 'Data Engineer', 'skills': 'SQL, Python'}, **self.admin).json()
        self.assertEqual(r['source'], 'template')
        self.assertIn('Experience with SQL', r['description'])
        self.assertEqual(self.post('/api/ai/generate-job-description/', {}, **self.admin).status_code, 400)
        self.assertEqual(self.post('/api/ai/generate-job-description/', {'title': 'x'}, **self.emp).status_code, 403)
        growth = self.c.get('/api/ai/talent-insights/growth/', **self.admin).json()
        self.assertIn('risingStars', growth)
        self.assertIn('needsSupport', growth)


class DeliveryTests(ApiTestCase):
    def tearDown(self):
        db['Settings'].delete_many({})

    def test_email_and_webhook_delivery(self):
        import os
        from unittest import mock
        from hr_backend.db import users
        from utils.notify import notify
        users.update_one({'_id': self.emp_user}, {'$set': {'email': 'bob@example.com', 'username': 'bob'}})
        env = {'NOTIFY_SYNC': '1', 'EMAIL_HOST': 'smtp.test', 'EMAIL_FROM': 'hr@test', 'EMAIL_USER': 'u',
               'EMAIL_PASSWORD': 'p', 'NOTIFY_WEBHOOK_URL': 'https://hooks.test/x'}
        with mock.patch.dict(os.environ, env):
            settings = self.c.get('/api/settings/', **self.admin).json()
            self.assertEqual(settings['integrations'], {'emailConfigured': True, 'webhookConfigured': True})
            self.assertEqual(set(self.c.get('/api/settings/', **self.emp).json()), {'general', 'knowledge'})   # no payroll rates for staff
            with mock.patch('utils.delivery.smtplib.SMTP') as smtp, mock.patch('utils.delivery.requests.post') as post:
                notify(self.emp_user, 'Hello', 'plain')                  # channels are off by default
                self.assertFalse(smtp.called or post.called)
                self.put('/api/settings/', {'notifications': {'emailDelivery': True, 'webhookDelivery': True}}, **self.admin)
                notify(self.emp_user, 'Leave approved', 'enjoy')
                sent = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
                self.assertEqual((sent['To'], sent['Subject']), ('bob@example.com', 'Leave approved'))
                self.assertIn('Leave approved', post.call_args.kwargs['json']['text'])
            # a failing channel never breaks the notification
            with mock.patch('utils.delivery.smtplib.SMTP', side_effect=OSError('down')), \
                    mock.patch('utils.delivery.requests.post', side_effect=OSError('down')):
                self.assertIsNotNone(notify(self.emp_user, 'Still saved', 'x'))
        self.assertEqual(self.c.get('/api/settings/', **self.admin).json()['integrations']['emailConfigured'], False)


class OnboardingTests(ApiTestCase):
    def tearDown(self):
        db['Settings'].delete_many({})
        db['Onboarding'].delete_many({})

    def test_checklist_auto_ticks_and_permissions(self):
        self.put('/api/settings/', {'knowledge': {'requiredDocuments': ['ID proof']}}, **self.admin)
        course = self.post('/api/training/courses/', {'title': 'Safety', 'mandatory': True}, **self.admin).json()['course']
        self.assertEqual(self.post('/api/onboarding/start/', {'employee_id': str(self.emp_emp)}, **self.emp).status_code, 403)
        r = self.post('/api/onboarding/start/', {'employee_id': str(self.emp_emp)}, **self.admin)
        self.assertEqual(r.status_code, 201, r.content)
        titles = [t['title'] for t in r.json()['onboarding']['tasks']]
        self.assertIn('Upload document: ID proof', titles)
        self.assertIn('Complete training: Safety', titles)
        self.assertIn('Assign laptop and assets', titles)
        # idempotent
        again = self.post('/api/onboarding/start/', {'employee_id': str(self.emp_emp)}, **self.admin).json()['onboarding']
        self.assertEqual(again['_id'], r.json()['onboarding']['_id'])
        mine = self.c.get('/api/onboarding/', **self.emp).json()['onboardings']
        self.assertEqual(len(mine), 1)
        row = mine[0]
        emp_task = next(t for t in row['tasks'] if t['title'] == 'Complete your profile')
        hr_task = next(t for t in row['tasks'] if t['owner'] == 'hr')
        url = lambda t: f"/api/onboarding/{row['_id']}/tasks/{t['id']}/"
        self.assertEqual(self.put(url(emp_task), {'done': True}, **self.emp).status_code, 200)
        self.assertEqual(self.put(url(hr_task), {'done': True}, **self.emp).status_code, 403)     # HR task
        self.assertEqual(self.put(url(hr_task), {'done': True}, **self.admin).status_code, 200)
        # auto tasks: upload the document and finish the training
        documents.insert_one({'employee_id': self.emp_emp, 'name': 'ID proof - passport', 'category': 'identity'})
        a = self.post('/api/training/assign/', {'course_id': course['_id'], 'employee_ids': [str(self.emp_emp)]}, **self.admin)
        assignment = self.c.get('/api/training/mine/', **self.emp).json()['assignments'][0]
        self.put(f"/api/training/assignments/{assignment['_id']}/", {'status': 'Completed'}, **self.emp)
        data = self.c.get('/api/onboarding/', **self.emp).json()['onboardings'][0]
        done = {t['title']: t['done'] for t in data['tasks']}
        self.assertTrue(done['Upload document: ID proof'])
        self.assertTrue(done['Complete training: Safety'])
        self.assertLess(data['progress'], 100)
        # others cannot see it
        self.assertEqual(len(self.c.get('/api/onboarding/', **self.admin).json()['onboardings']), 1)

    def test_new_employee_gets_a_checklist(self):
        r = self.post('/api/employees/new/', {'first_name': 'New', 'last_name': 'Hire', 'email': 'new@x.com',
                                                'employee_id': 'EMP-N1', 'position': 'Dev'}, **self.admin)
        self.assertIn(r.status_code, (200, 201), r.content)
        self.assertEqual(db['Onboarding'].count_documents({'employee_name': 'New Hire'}), 1)


class CandidatePredictionTests(ApiTestCase):
    def test_fit_ranking(self):
        db['objectives'].insert_one({'title': 'o', 'employee_id': str(self.admin_emp), 'progress': 100})  # Ada = top performer
        job = self.post('/api/recruitment/jobs/', {'title': 'Backend', 'skills': 'Python, SQL', 'experience': '4'}, **self.admin).json()['job']
        url = f"/api/recruitment/jobs/{job['_id']}/candidates/"
        self.post(url, {'name': 'Strong', 'skills': 'Python, SQL', 'experience': '5'}, **self.admin)
        self.post(url, {'name': 'Partial', 'skills': 'Python', 'experience': '1'}, **self.admin)
        self.post(url, {'name': 'Weak', 'skills': 'Photoshop'}, **self.admin)
        preds = self.c.get(f"/api/recruitment/jobs/{job['_id']}/predictions/", **self.admin).json()['predictions']
        self.assertEqual([p['name'] for p in preds], ['Strong', 'Partial', 'Weak'])
        self.assertEqual(preds[0]['likelihood'], 'High')
        self.assertEqual(preds[2]['likelihood'], 'Low')
        self.assertIn('2 of 2 required skills', preds[0]['reasons'])
        self.assertEqual(self.c.get(f"/api/recruitment/jobs/{job['_id']}/predictions/", **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/recruitment/jobs/' + '0' * 24 + '/predictions/', **self.admin).status_code, 404)


class PublicCareersTests(ApiTestCase):
    def tearDown(self):
        db['RateLimits'].delete_many({})

    def anon(self, path, body=None):
        if body is None:
            return self.c.get(path)
        return self.c.post(path, data=__import__('json').dumps(body), content_type='application/json')

    def test_open_jobs_apply_and_limits(self):
        open_job = self.post('/api/recruitment/jobs/', {'title': 'Public Dev', 'department': 'Eng', 'skills': 'Python, SQL',
                                                        'description': 'Build things', 'salary': 'SECRET'}, **self.admin).json()['job']
        closed = self.post('/api/recruitment/jobs/', {'title': 'Closed role', 'status': 'Closed'}, **self.admin).json()['job']
        jobs = self.anon('/api/public/jobs/').json()['jobs']
        self.assertEqual([j['title'] for j in jobs], ['Public Dev'])
        self.assertNotIn('salary', jobs[0])                       # only whitelisted fields are public
        self.assertEqual(self.c.get('/api/recruitment/jobs/').status_code, 401)   # the staff API stays private

        good = {'job_id': open_job['_id'], 'name': 'Casey', 'email': 'Casey@Example.com', 'skills': 'Python', 'experience': '3'}
        self.assertEqual(self.anon('/api/public/apply/', good).status_code, 201)
        self.assertEqual(self.anon('/api/public/apply/', good).status_code, 409)               # duplicate
        self.assertEqual(self.anon('/api/public/apply/', {**good, 'email': 'nope'}).status_code, 400)
        self.assertEqual(self.anon('/api/public/apply/', {**good, 'job_id': closed['_id'], 'email': 'x@y.com'}).status_code, 404)
        self.assertEqual(self.anon('/api/public/apply/', {**good, 'email': 'bot@y.com', 'website': 'spam.com'}).status_code, 201)
        self.assertEqual(db['candidates'].count_documents({'email': 'bot@y.com'}), 0)         # honeypot: silently dropped
        cand = db['candidates'].find_one({'email': 'casey@example.com'})
        self.assertEqual((cand['stage'], cand['source']), ('Applied', 'Careers page'))
        # the hourly limit per IP
        from recruitment.public import LIMITS
        for i in range(LIMITS['apply'][0]):
            last = self.anon('/api/public/apply/', {**good, 'email': f'u{i}@y.com'}).status_code
        self.assertEqual(last, 429)

    def test_public_chat_fallback_and_limit(self):
        self.post('/api/recruitment/jobs/', {'title': 'Data Engineer', 'skills': 'SQL, Spark'}, **self.admin)
        r = self.anon('/api/public/chat/', {'message': 'any SQL jobs?'}).json()
        self.assertEqual(r['source'], 'fallback')
        self.assertIn('Data Engineer', r['reply'])
        self.assertIn('Data Engineer', self.anon('/api/public/chat/', {'message': 'hello'}).json()['reply'])
        self.assertEqual(self.anon('/api/public/chat/', {}).status_code, 400)
        for _ in range(20):
            code = self.anon('/api/public/chat/', {'message': 'sql'}).status_code
        self.assertEqual(code, 429)


class TrainedAttritionModelTests(ApiTestCase):
    def test_rules_until_enough_exits_then_trained(self):
        attrition = lambda: self.c.get('/api/ai/attrition-risk/', **self.admin).json()
        self.assertEqual(attrition()['model']['type'], 'rules')

        today = datetime.date.today()
        ids = {}
        for i in range(10):                                   # leavers: short tenure, weak OKR progress, low pay
            e = employees.insert_one({'employee_id': f'L{i}', 'first_name': 'Leaver', 'last_name': str(i), 'email': f'l{i}@x.com',
                                      'employment_status': 'Terminated', 'salary': 40000 + i * 100,
                                      'department_id': str(self.dept),
                                      'hire_date': (today - datetime.timedelta(days=200 + i * 5)).isoformat(),
                                      'termination_date': today.isoformat()}).inserted_id
            db['objectives'].insert_one({'title': 'o', 'employee_id': str(e), 'progress': 20})
            db['Offboarding'].insert_one({'employee_id': str(e), 'status': 'Completed', 'reason_category': 'Other',
                                          'requested_at': today.isoformat(), 'last_working_day': today.isoformat()})
        for i in range(10):                                   # stayers: long tenure, strong OKR progress, better pay
            e = employees.insert_one({'employee_id': f'S{i}', 'first_name': 'Stayer', 'last_name': str(i), 'email': f's{i}@x.com',
                                      'employment_status': 'Active', 'salary': 90000 + i * 100,
                                      'department_id': str(self.dept),
                                      'hire_date': (today - datetime.timedelta(days=1500 + i * 20)).isoformat()}).inserted_id
            ids[i] = str(e)
            db['objectives'].insert_one({'title': 'o', 'employee_id': str(e), 'progress': 95})

        data = attrition()
        self.assertEqual(data['model']['type'], 'trained')
        self.assertEqual(data['model']['exits'], 10)
        self.assertGreaterEqual(data['model']['training_accuracy'], 0.9)

        # a new, weakly performing, low-paid employee scores higher than an established high performer
        risky = employees.insert_one({'employee_id': 'R1', 'first_name': 'Risky', 'last_name': 'New', 'email': 'r1@x.com',
                                      'employment_status': 'Active', 'salary': 39000, 'department_id': str(self.dept),
                                      'hire_date': (today - datetime.timedelta(days=180)).isoformat()}).inserted_id
        db['objectives'].insert_one({'title': 'o', 'employee_id': str(risky), 'progress': 15})
        score = lambda eid: self.c.get(f'/api/ai/talent-insights/employee/{eid}/', **self.admin).json()['attritionRisk']
        high, low = score(risky), score(ids[0])
        self.assertGreater(high['score'], low['score'])
        self.assertTrue(high['reasons'][0].startswith('Model-estimated probability'))
        self.assertEqual(low['level'], 'Low')


class SsoTests(ApiTestCase):
    ENV = {'GOOGLE_CLIENT_ID': 'gid', 'GOOGLE_CLIENT_SECRET': 'gsecret', 'FRONTEND_URL': 'https://app.test',
           'SSO_BACKEND_URL': 'https://api.test'}

    def test_providers_and_login_redirect(self):
        import os
        from unittest import mock
        from urllib.parse import parse_qs, urlparse
        with mock.patch.dict(os.environ, {'GOOGLE_CLIENT_ID': '', 'GOOGLE_CLIENT_SECRET': '', 'MICROSOFT_CLIENT_ID': ''}):
            self.assertEqual(self.c.get('/api/auth/sso/providers/').json()['providers'], [])
            r = self.c.get('/api/auth/sso/google/login/')
            self.assertIn('sso_error=provider_not_configured', r['Location'])
        with mock.patch.dict(os.environ, self.ENV):
            self.assertEqual(self.c.get('/api/auth/sso/providers/').json()['providers'], [{'id': 'google', 'name': 'Google'}])
            r = self.c.get('/api/auth/sso/google/login/')
            self.assertEqual(r.status_code, 302)
            url = urlparse(r['Location'])
            q = parse_qs(url.query)
            self.assertEqual(url.netloc, 'accounts.google.com')
            self.assertEqual(q['redirect_uri'], ['https://api.test/api/auth/sso/google/callback/'])
            self.assertEqual(q['client_id'], ['gid'])
            self.assertTrue(q['state'][0])

    def test_callback_signs_in_existing_user_only(self):
        import os
        from unittest import mock
        from urllib.parse import parse_qs, urlparse
        import json as _json
        with mock.patch.dict(os.environ, self.ENV):
            state = parse_qs(urlparse(self.c.get('/api/auth/sso/google/login/')['Location']).query)['state'][0]

            def fake_requests(email, verified=True):
                class Resp:
                    def __init__(self, data): self.data = data
                    def raise_for_status(self): pass
                    def json(self): return self.data
                post = mock.patch('auth_app.sso.requests.post', return_value=Resp({'access_token': 'at'}))
                get = mock.patch('auth_app.sso.requests.get', return_value=Resp({'email': email, 'email_verified': verified}))
                return post, get

            callback = f'/api/auth/sso/google/callback/?code=abc&state={state}'
            post, get = fake_requests('ADA@x.com')               # existing user, different case
            with post as p, get:
                r = self.c.get(callback)
                self.assertEqual(p.call_args.kwargs['data']['code'], 'abc')
            location = r['Location']
            self.assertTrue(location.startswith('https://app.test/login#'))
            frag = parse_qs(urlparse(location).fragment)
            session = self.c.get('/api/auth/profile/', HTTP_AUTHORIZATION='Bearer ' + frag['sso_token'][0]).json()
            self.assertEqual(session['username'], 'ada')
            self.assertEqual(_json.loads(frag['sso_user'][0])['role'], 'Admin')

            post, get = fake_requests('stranger@x.com')           # no account -> never auto-created
            with post, get:
                self.assertIn('sso_error=no_account', self.c.get(callback)['Location'])
            self.assertEqual(users.count_documents({'email': 'stranger@x.com'}), 0)
            post, get = fake_requests('ada@x.com', verified=False)
            with post, get:
                self.assertIn('sso_error=email_not_verified', self.c.get(callback)['Location'])
            self.assertIn('sso_error=invalid_state', self.c.get('/api/auth/sso/google/callback/?code=abc&state=forged')['Location'])
            self.assertIn('sso_error=cancelled', self.c.get('/api/auth/sso/google/callback/?error=access_denied')['Location'])


class SurveyTemplateTests(ApiTestCase):
    def test_templates_are_valid_and_staff_only(self):
        self.assertEqual(self.c.get('/api/feedback/templates/', **self.emp).status_code, 403)
        templates = self.c.get('/api/feedback/templates/', **self.admin).json()['templates']
        self.assertGreaterEqual(len(templates), 4)
        for t in templates:        # every template must be accepted by the survey API as-is
            r = self.post('/api/feedback/surveys/', {k: t[k] for k in ('title', 'type', 'anonymous', 'questions')}, **self.admin)
            self.assertEqual(r.status_code, 201, (t['id'], r.content))


class RecognitionTests(ApiTestCase):
    def tearDown(self):
        db['Recognitions'].delete_many({})

    def test_kudos_rules_leaderboard_and_achievements(self):
        give = lambda headers, **kw: self.post('/api/recognition/', {'message': 'thanks for the help', 'badge': 'teamwork', **kw}, **headers)
        self.assertEqual(give(self.emp, to=str(self.emp_emp)).status_code, 400)           # not yourself
        self.assertEqual(give(self.emp, to=str(self.admin_emp), badge='nope').status_code, 400)
        self.assertEqual(give(self.emp, to=str(self.admin_emp), message='x').status_code, 400)
        before = notifications.count_documents({'type': 'recognition'})
        ok = give(self.emp, to=str(self.admin_emp))
        self.assertEqual(ok.status_code, 201, ok.content)
        self.assertEqual(ok.json()['recognition']['points'], 15)
        self.assertEqual(notifications.count_documents({'type': 'recognition'}), before + 1)
        # daily limit of 5 given
        for _ in range(4):
            give(self.emp, to=str(self.admin_emp), badge='kudos')
        self.assertEqual(give(self.emp, to=str(self.admin_emp)).status_code, 429)
        # leaderboard + feed + my progress
        board = self.c.get('/api/recognition/leaderboard/?period=all', **self.emp).json()['leaderboard']
        self.assertEqual((board[0]['name'], board[0]['points'], board[0]['colleagues']), ('Ada Admin', 15 + 4 * 10, 1))
        feed = self.c.get('/api/recognition/', **self.emp).json()
        self.assertEqual(len(feed['recognitions']), 5)
        self.assertEqual(feed['recognitions'][0]['from_name'], 'Bob Worker')
        mine = self.c.get('/api/recognition/me/', **self.admin).json()
        self.assertEqual(mine['points'], 55)
        self.assertIn('team_favourite', [a['id'] for a in mine['achievements']])           # 5 received
        # automatic achievements from real activity
        db['objectives'].insert_one({'title': 'done', 'employee_id': str(self.admin_emp), 'progress': 100})
        self.assertIn('goal_crusher', [a['id'] for a in self.c.get('/api/recognition/me/', **self.admin).json()['achievements']])


class IntegrationTests(ApiTestCase):
    def tearDown(self):
        db['Webhooks'].delete_many({})

    def test_webhook_registration_signing_and_events(self):
        import hashlib, hmac, json as _json, os
        from unittest import mock
        with mock.patch.dict(os.environ, {'NOTIFY_SYNC': '1'}), mock.patch('integrations.views.host_is_public', return_value=True), \
                mock.patch('utils.events.host_is_public', return_value=True):
            self.assertEqual(self.post('/api/integrations/webhooks/', {'name': 'x', 'url': 'https://h.test', 'events': ['leave.approved']}, **self.emp).status_code, 403)
            self.assertEqual(self.post('/api/integrations/webhooks/', {'name': 'x', 'url': 'https://h.test', 'events': ['bogus']}, **self.admin).status_code, 400)
            created = self.post('/api/integrations/webhooks/', {'name': 'HRIS', 'url': 'https://h.test/hook',
                                                                'events': ['leave.approved', 'employee.created']}, **self.admin)
            self.assertEqual(created.status_code, 201)
            hook, secret = created.json()['webhook'], created.json()['webhook']['secret']
            self.assertEqual(len(secret), 48)
            listed = self.c.get('/api/integrations/webhooks/', **self.admin).json()['webhooks'][0]
            self.assertTrue(listed['secret'].endswith('...'))                  # secret is never shown again

            class Resp:
                status_code = 200
            with mock.patch('utils.events.requests.post', return_value=Resp()) as post:
                # subscribed event -> signed delivery
                leave = self.post('/api/leaves/apply/', {'leave_type': 'Earned Leaves', 'start_date': workday(40), 'end_date': workday(40)}, **self.emp).json()['leave_id']
                self.assertFalse(post.called)                                  # leave.requested is not subscribed
                self.put(f'/api/leaves/{leave}/approve/', **self.admin)
                self.assertEqual(post.call_count, 1)
                raw = post.call_args.kwargs['data']
                sent = _json.loads(raw)
                self.assertEqual((sent['event'], sent['data']['leave_id']), ('leave.approved', leave))
                expected = 'sha256=' + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
                self.assertEqual(post.call_args.kwargs['headers']['X-HR-Signature'], expected)
                # new employee -> employee.created
                self.post('/api/employees/new/', {'first_name': 'Hook', 'last_name': 'Test', 'email': 'hook@x.com', 'employee_id': 'EMP-H1'}, **self.admin)
                self.assertEqual(_json.loads(post.call_args.kwargs['data'])['event'], 'employee.created')
                # test endpoint + status
                self.assertTrue(self.post(f"/api/integrations/webhooks/{hook['_id']}/test/", **self.admin).json()['success'])
            self.assertEqual(db['Webhooks'].find_one({})['last_delivery']['status'], 'HTTP 200')
            # failing endpoint is recorded, never raised
            with mock.patch('utils.events.requests.post', side_effect=OSError('refused')):
                self.assertFalse(self.post(f"/api/integrations/webhooks/{hook['_id']}/test/", **self.admin).json()['success'])
            self.assertIn('error', db['Webhooks'].find_one({})['last_delivery']['status'])
            # deactivate / delete
            self.put(f"/api/integrations/webhooks/{hook['_id']}/", {'active': False}, **self.admin)
            with mock.patch('utils.events.requests.post') as post:
                from utils.events import emit
                emit('leave.approved', {})
                self.assertFalse(post.called)
            self.assertEqual(self.c.delete(f"/api/integrations/webhooks/{hook['_id']}/", **self.admin).status_code, 200)

    def test_ssrf_guard(self):
        from utils.events import host_is_public
        for bad in ('http://127.0.0.1/x', 'http://localhost:8000', 'http://169.254.169.254/latest', 'ftp://example.com', 'http://10.0.0.5', 'notaurl'):
            self.assertFalse(host_is_public(bad), bad)
        self.assertEqual(self.post('/api/integrations/webhooks/', {'name': 'x', 'url': 'http://127.0.0.1/', 'events': ['*']}, **self.admin).status_code, 400)

    def test_employee_csv_export_and_import(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.assertEqual(self.c.get('/api/integrations/employees/export/', **self.emp).status_code, 403)
        exported = self.c.get('/api/integrations/employees/export/', **self.admin).content.decode()
        self.assertTrue(exported.splitlines()[0].startswith('employee_id,first_name'))
        self.assertIn('Engineering', exported)

        csv_text = ('first_name,last_name,email,employee_id,department,salary,hire_date\n'
                    'Imp,One,imp1@x.com,EMP-I1,Engineering,"72,000",2026-01-05\n'
                    'Imp,Two,imp2@x.com,EMP-I2,Nowhere,50000,\n'
                    'Dup,Licate,bob@x.com,EMP-I3,,,\n'
                    'Bad,Mail,not-an-email,EMP-I4,,,\n')
        upload = lambda: {'file': SimpleUploadedFile('e.csv', csv_text.encode())}
        self.assertEqual(self.c.post('/api/integrations/employees/import/', upload(), **self.emp).status_code, 403)
        dry = self.c.post('/api/integrations/employees/import/?dry_run=true', upload(), **self.admin).json()
        self.assertEqual((dry['created'], len(dry['skipped']), len(dry['errors'])), (1, 1, 2))
        self.assertEqual(employees.count_documents({'employee_id': 'EMP-I1'}), 0)           # dry run writes nothing
        real = self.c.post('/api/integrations/employees/import/', upload(), **self.admin).json()
        self.assertEqual(real['created'], 1)
        imported = employees.find_one({'employee_id': 'EMP-I1'})
        self.assertEqual((imported['salary'], imported['department']), (72000.0, 'Engineering'))
        self.assertEqual(db['Onboarding'].count_documents({'employee_name': 'Imp One'}), 1)    # imported people get onboarding
        bad = self.c.post('/api/integrations/employees/import/', {'file': SimpleUploadedFile('e.csv', b'name\nx\n')}, **self.admin)
        self.assertEqual(bad.status_code, 400)
