"""Resume upload and reading, deleting job postings, the public application form, the dashboard and notifications."""
import io
import os
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client

from hr_backend.db import db, employees
from tests.test_api import ApiTestCase

RESUME = """Ananya Iyer
ananya.iyer@example.com | +91 98450 12345 | Bengaluru

Senior Backend Engineer with 6 years of experience building APIs.

Skills: Python, Django, PostgreSQL, Docker, AWS

Education: B.Tech in Computer Science, NIT Trichy
"""


def upload(name, content, kind='text/plain'):
    return SimpleUploadedFile(name, content if isinstance(content, bytes) else content.encode(), content_type=kind)


def make_pdf(text):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for line in text.splitlines():
        c.drawString(60, y, line)
        y -= 16
    c.save()
    return buf.getvalue()


def make_docx(text):
    import docx
    document = docx.Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


class ResumeTests(ApiTestCase):
    def setUp(self):
        db['jobs'].delete_many({})
        db['candidates'].delete_many({})
        self.job = self.post('/api/recruitment/jobs/', {'title': 'Backend Engineer', 'department': 'Engineering', 'skills': 'Python, PostgreSQL, Kubernetes'}, **self.admin).json()['job']
        self.url = f"/api/recruitment/jobs/{self.job['_id']}/resumes/"

    def tearDown(self):
        import shutil
        shutil.rmtree(os.path.join(settings.MEDIA_ROOT, 'resumes'), ignore_errors=True)

    def test_details_are_read_from_a_pdf_a_docx_and_a_text_file(self):
        files = [upload('ananya.pdf', make_pdf(RESUME), 'application/pdf'), upload('ananya2.docx', make_docx(RESUME.replace('ananya.iyer', 'ananya.two'))), upload('ananya3.txt', RESUME.replace('ananya.iyer', 'ananya.three'))]
        r = self.c.post(self.url, {'files': files}, **self.admin)
        self.assertEqual(r.status_code, 200, r.content)
        out = r.json()
        self.assertEqual((out['read'], out['failed']), (3, 0))
        row = out['rows'][0]
        self.assertEqual((row['name'], row['email'], row['phone'], row['location']), ('Ananya Iyer', 'ananya.iyer@example.com', '+91 98450 12345', 'Bengaluru'))
        self.assertEqual(row['experience'], '6')
        self.assertIn('Python', row['skills'])
        self.assertIn('B.Tech', row['education'])
        self.assertEqual(row['read_with'], 'text patterns')                       # no AI key in the tests: the patterns still work
        self.assertEqual(row['matched_skills'], ['Python', 'PostgreSQL'])
        self.assertEqual((row['match_pct'], row['missing_skills']), (67, ['Kubernetes']))
        self.assertEqual(db['candidates'].count_documents({}), 0)                  # reading saves no candidate

    def test_ai_answer_is_used_when_available_and_validated(self):
        ai = ({'name': 'Rohit Verma', 'email': 'rohit@example.com', 'phone': '98765 43210', 'current_company': 'Infosys', 'current_title': 'Lead Engineer',
               'experience': 7, 'skills': 'Python, Kubernetes', 'summary': 'A seasoned backend engineer.', 'notice_period_days': 60}, 'gemini')
        with mock.patch('recruitment.resume.ai_parse', return_value=ai):
            row = self.c.post(self.url, {'files': [upload('r.txt', RESUME)]}, **self.admin).json()['rows'][0]
        self.assertEqual((row['name'], row['current_company'], row['notice_period_days'], row['read_with']), ('Rohit Verma', 'Infosys', 60, 'AI (gemini)'))
        self.assertEqual(row['email'], 'ananya.iyer@example.com')                  # the address printed on the resume wins over a paraphrase
        self.assertEqual(row['summary'], 'A seasoned backend engineer.')
        self.assertEqual(row['matched_skills'], ['Python', 'Kubernetes'])

    def test_bad_files_are_reported_per_file(self):
        big = upload('big.pdf', b'%PDF-' + b'0' * (5 * 1024 * 1024 + 10), 'application/pdf')
        files = [upload('ok.txt', RESUME), upload('old.doc', b'binary'), upload('photo.png', b'\x89PNG'), upload('fake.pdf', b'not a pdf at all'), big, upload('empty.txt', 'hi')]
        out = self.c.post(self.url, {'files': files}, **self.admin).json()
        errors = {r['file_name']: r.get('error', '') for r in out['rows']}
        self.assertEqual((out['read'], out['failed']), (1, 5))
        self.assertIn('.docx', errors['old.doc'])
        self.assertIn('PDF, DOCX and TXT', errors['photo.png'])
        self.assertIn('not a real PDF', errors['fake.pdf'])
        self.assertIn('5 MB', errors['big.pdf'])
        self.assertIn('no readable text', errors['empty.txt'])
        self.assertEqual(self.c.post(self.url, {}, **self.admin).status_code, 400)
        self.assertEqual(self.c.post(self.url, {'files': [upload('a.txt', RESUME)]}, **self.emp).status_code, 403)
        too_many = [upload(f'{i}.txt', RESUME) for i in range(26)]
        self.assertEqual(self.c.post(self.url, {'files': too_many}, **self.admin).status_code, 400)

    def test_confirmed_rows_keep_their_resume_and_duplicates_are_flagged(self):
        self.post(f"/api/recruitment/jobs/{self.job['_id']}/candidates/", {'name': 'Already Here', 'email': 'ananya.iyer@example.com'}, **self.admin)
        rows = self.c.post(self.url, {'files': [upload('a.txt', RESUME), upload('b.txt', RESUME.replace('ananya.iyer', 'second.person'))]}, **self.admin).json()['rows']
        self.assertEqual([r['duplicate'] for r in rows], [True, False])
        done = self.post(f"/api/recruitment/jobs/{self.job['_id']}/candidates/bulk/", {'candidates': rows}, **self.admin).json()
        self.assertEqual((done['created'], done['skipped']), (1, 1))
        cand = db['candidates'].find_one({'email': 'second.person@example.com'})
        self.assertEqual((cand['source'], cand['stage']), ('Resume upload', 'Applied'))
        listed = self.c.get(f"/api/recruitment/jobs/{self.job['_id']}/candidates/", **self.admin).json()['candidates']
        mine = next(c for c in listed if c['email'] == 'second.person@example.com')
        self.assertTrue(mine['has_resume'])
        self.assertNotIn('resume_file', mine)                                          # the server path is never exposed
        download = self.c.get(f"/api/recruitment/candidates/{mine['_id']}/resume/", **self.admin)
        self.assertEqual(download.status_code, 200)
        self.assertIn(b'second.person@example.com', b''.join(download.streaming_content))
        self.assertEqual(self.c.get(f"/api/recruitment/candidates/{mine['_id']}/resume/", **self.emp).status_code, 403)
        self.assertEqual(self.c.get(f"/api/recruitment/candidates/{mine['_id']}/resume/").status_code, 401)

    def test_a_forged_token_cannot_reach_other_files(self):
        r = self.post(f"/api/recruitment/jobs/{self.job['_id']}/candidates/bulk/", {'candidates': [{'name': 'X Y', 'resume_token': '../../../etc/passwd'}]}, **self.admin).json()
        self.assertEqual(r['created'], 1)
        self.assertNotIn('resume_file', db['candidates'].find_one({'name': 'X Y'}))

    def test_deleting_an_opening_with_candidates_needs_confirmation(self):
        rows = self.c.post(self.url, {'files': [upload('a.txt', RESUME)]}, **self.admin).json()['rows']
        self.post(f"/api/recruitment/jobs/{self.job['_id']}/candidates/bulk/", {'candidates': rows}, **self.admin)
        path = os.path.join(settings.MEDIA_ROOT, db['candidates'].find_one({})['resume_file'])
        self.assertTrue(os.path.isfile(path))
        url = f"/api/recruitment/jobs/{self.job['_id']}/"
        refused = self.c.delete(url, **self.admin)
        self.assertEqual((refused.status_code, refused.json()['candidate_count']), (409, 1))
        self.assertEqual(self.c.delete(url, **self.emp).status_code, 403)
        done = self.c.delete(url + '?with_candidates=1', **self.admin)
        self.assertEqual((done.status_code, done.json()['deleted_candidates']), (200, 1))
        self.assertEqual((db['jobs'].count_documents({}), db['candidates'].count_documents({})), (0, 0))
        self.assertFalse(os.path.isfile(path))                                          # the resume file goes too


class PublicApplicationTests(ApiTestCase):
    def setUp(self):
        db['jobs'].delete_many({})
        db['candidates'].delete_many({})
        db['RateLimits'].delete_many({})
        db['Notifications'].delete_many({})
        self.job = self.post('/api/recruitment/jobs/', {'title': 'Designer', 'skills': 'Figma'}, **self.admin).json()['job']
        self.anon = Client()

    def tearDown(self):
        import shutil
        shutil.rmtree(os.path.join(settings.MEDIA_ROOT, 'resumes'), ignore_errors=True)

    def test_job_page_and_resume_reading_need_no_login(self):
        page = self.anon.get(f"/api/public/jobs/{self.job['_id']}/").json()
        self.assertEqual(page['job']['title'], 'Designer')
        self.assertIn('company', page)
        self.assertNotIn('salary_min_lpa', page['job'])
        closed = self.post('/api/recruitment/jobs/', {'title': 'Old', 'status': 'Closed'}, **self.admin).json()['job']
        self.assertEqual(self.anon.get(f"/api/public/jobs/{closed['_id']}/").status_code, 404)
        r = self.anon.post('/api/public/resume-parse/', {'resume': upload('cv.txt', RESUME)})
        self.assertEqual(r.status_code, 200, r.content)
        fields = r.json()['fields']
        self.assertEqual((fields['name'], fields['email']), ('Ananya Iyer', 'ananya.iyer@example.com'))
        self.assertNotIn('summary', fields)
        self.assertEqual(self.anon.post('/api/public/resume-parse/', {'resume': upload('x.exe', b'MZ')}).status_code, 400)
        self.assertEqual(self.anon.post('/api/public/resume-parse/', {}).status_code, 400)

    def test_resume_reading_is_rate_limited(self):
        from recruitment.public import LIMITS
        for _ in range(LIMITS['parse'][0]):
            self.anon.post('/api/public/resume-parse/', {'resume': upload('cv.txt', RESUME)})
        self.assertEqual(self.anon.post('/api/public/resume-parse/', {'resume': upload('cv.txt', RESUME)}).status_code, 429)

    def test_application_with_a_resume_notifies_hr_and_tracks_the_source(self):
        form = {'job_id': self.job['_id'], 'name': 'Ananya Iyer', 'email': 'ananya.iyer@example.com', 'phone': '+91 98450 12345', 'skills': 'Figma',
                'notice_period_days': '30', 'expected_ctc_lpa': '18', 'source': 'LinkedIn', 'resume': upload('cv.pdf', make_pdf(RESUME), 'application/pdf')}
        r = self.anon.post('/api/public/apply/', form)
        self.assertEqual(r.status_code, 201, r.content)
        cand = db['candidates'].find_one({'email': 'ananya.iyer@example.com'})
        self.assertEqual((cand['source'], cand['stage'], cand['notice_period_days'], cand['expected_ctc_lpa']), ('LinkedIn', 'Applied', 30, 18.0))
        self.assertTrue(os.path.isfile(os.path.join(settings.MEDIA_ROOT, cand['resume_file'])))
        note = db['Notifications'].find_one({'type': 'recruitment'})
        self.assertIn('Ananya Iyer applied for Designer', note['message'])
        self.assertEqual(note['user_id'], str(self.admin_user))
        self.assertEqual(self.anon.post('/api/public/apply/', form).status_code, 409)
        other = dict(form, email='b@example.com', source='Made-up channel', resume=upload('cv.txt', RESUME))
        self.anon.post('/api/public/apply/', other)
        self.assertEqual(db['candidates'].find_one({'email': 'b@example.com'})['source'], 'Application form')       # unknown channels are ignored
        bad = dict(form, email='c@example.com', resume=upload('malware.exe', b'MZ'))
        self.assertEqual(self.anon.post('/api/public/apply/', bad).status_code, 400)
        self.assertIsNone(db['candidates'].find_one({'email': 'c@example.com'}))


class DashboardTests(ApiTestCase):
    def test_each_role_gets_its_own_view(self):
        db['Leaves'].delete_many({})
        db['expenses'].delete_many({})
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'employee_name': 'Bob Worker', 'leave_type': 'Earned Leaves', 'status': 'Pending', 'start_date': '2026-12-01', 'end_date': '2026-12-02',
                                 'days': 2, 'created_at': '2026-10-20T10:00:00+00:00'})
        db['expenses'].insert_one({'employee_id': str(self.emp_emp), 'amount': 500, 'status': 'Pending', 'submittedAt': '2026-10-20T10:00:00'})
        admin = self.c.get('/api/dashboard/', **self.admin).json()
        self.assertEqual(admin['role'], 'admin')
        ids = {a['id']: a['count'] for a in admin['attention']}
        self.assertEqual((ids['leaves'], ids['expenses']), (1, 1))
        self.assertIn('hires_by_month', admin)
        self.assertEqual(len(admin['hires_by_month']), 12)
        emp = self.c.get('/api/dashboard/', **self.emp).json()
        self.assertEqual(emp['role'], 'employee')
        mine = {a['id']: a['count'] for a in emp['attention']}
        self.assertNotIn('leaves', mine)                                               # approvals are not for employees
        self.assertEqual(mine['my-leaves'], 1)
        self.assertEqual(mine['my-expenses'], 1)
        self.assertEqual(emp['hires_by_month'], [])
        self.assertEqual(emp['department_distribution'], [])
        self.assertIsNotNone(emp['leave_balance'])
        self.assertEqual(self.c.get('/api/dashboard/').status_code, 401)

    def test_nothing_is_invented_for_an_empty_company(self):
        db['Leaves'].delete_many({})
        db['Recognitions'].delete_many({})
        db['candidates'].delete_many({})
        db['Offboarding'].delete_many({})
        db['Payroll'].delete_many({})
        data = self.c.get('/api/dashboard/', **self.admin).json()
        self.assertEqual([a for a in data['activity'] if a['type'] in ('leave', 'recognition', 'application', 'exit', 'payslip')], [])
        self.assertTrue(all(h['date'] >= '2000' for h in data['holidays']))
        self.assertEqual(data['out_today'], [])

    def test_birthdays_and_anniversaries_come_from_employee_records(self):
        import datetime
        soon = datetime.date.today() + datetime.timedelta(days=3)
        employees.update_one({'_id': self.emp_emp}, {'$set': {'date_of_birth': f'1995-{soon.month:02d}-{soon.day:02d}', 'hire_date': f'{soon.year - 2}-{soon.month:02d}-{soon.day:02d}'}})
        people = self.c.get('/api/dashboard/', **self.emp).json()['people']
        self.assertEqual([(b['name'], b['days_away']) for b in people['birthdays'] if b['name'] == 'Bob Worker'], [('Bob Worker', 3)])
        self.assertEqual([(a['name'], a['years']) for a in people['anniversaries'] if a['name'] == 'Bob Worker'], [('Bob Worker', 2)])
        employees.update_one({'_id': self.emp_emp}, {'$set': {'hire_date': '2026-06-01'}, '$unset': {'date_of_birth': ''}})


class NotificationTests(ApiTestCase):
    def setUp(self):
        db['Notifications'].delete_many({})

    def test_links_categories_count_filters_and_clearing(self):
        from utils.notify import notify
        notify(self.emp_user, 'Leave approved', 'Your leave was approved', type='leave_update')
        notify(self.emp_user, 'Payslip ready', 'Open Payroll', type='payroll')
        notify(self.emp_user, 'Welcome', 'Hello')
        listing = self.c.get('/api/notifications/', **self.emp).json()
        by_title = {n['title']: n for n in listing}
        self.assertEqual((by_title['Leave approved']['link'], by_title['Leave approved']['category']), ('/leaves', 'Leave'))
        self.assertEqual((by_title['Payslip ready']['link'], by_title['Payslip ready']['category']), ('/payroll', 'Payroll'))
        self.assertIsNone(by_title['Welcome']['link'])
        counted = self.c.get('/api/notifications/count/', **self.emp).json()
        self.assertEqual(counted['unread'], 3)
        self.assertTrue(counted['latest'])
        self.assertEqual(len(self.c.get('/api/notifications/?category=Payroll', **self.emp).json()), 1)
        newest = listing[0]['created_at']
        older = self.c.get(f'/api/notifications/?before={newest}', **self.emp).json()
        self.assertEqual(len(older), 2)                                                # paging by time
        self.put(f"/api/notifications/{listing[0]['_id']}/read/", **self.emp)
        self.assertEqual(self.c.get('/api/notifications/count/', **self.emp).json()['unread'], 2)
        self.assertEqual(self.c.delete('/api/notifications/clear/', **self.emp).json()['deleted'], 1)       # only read ones
        self.assertEqual(self.put('/api/notifications/read-all/', **self.emp).json()['updated'], 2)
        self.assertEqual(self.c.get('/api/notifications/count/', **self.emp).json()['unread'], 0)
        self.assertEqual(self.c.get('/api/notifications/count/').status_code, 401)

    def test_you_only_see_your_own(self):
        from utils.notify import notify
        notify(self.admin_user, 'Admins only', 'x', type='compliance')
        self.assertEqual(self.c.get('/api/notifications/', **self.emp).json(), [])
        self.assertEqual(self.c.get('/api/notifications/count/', **self.emp).json()['unread'], 0)

    def test_events_notify_the_right_people(self):
        # an expense claim goes to HR; a new ticket goes to HR
        self.post('/api/expenses/', {'title': 'Taxi to client', 'amount': 850, 'category': 'Travel'}, **self.emp)
        self.post('/api/helpdesk/', {'subject': 'Laptop is slow', 'description': 'Very slow', 'category': 'IT Support', 'priority': 'High'}, **self.emp)
        mine = list(db['Notifications'].find({'user_id': str(self.admin_user)}))
        titles = {n['title']: n['message'] for n in mine}
        self.assertIn('₹850', titles['Expense claim to approve'])
        self.assertIn('Laptop is slow', titles['New helpdesk ticket'])
        self.assertEqual(db['Notifications'].count_documents({'user_id': str(self.emp_user)}), 0)         # not to the person who raised them
