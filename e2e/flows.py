import sys
from playwright.sync_api import sync_playwright

import os
S = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screenshots')
os.makedirs(S, exist_ok=True)
BASE = os.environ.get('E2E_BASE', 'http://127.0.0.1:3999')
problems = []
results = []

from contextlib import contextmanager


@contextmanager
def section(name):
    try:
        yield
    except Exception as e:
        results.append((name[:60] + ' [exception]', False, str(e).splitlines()[0][:140]))




def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))


def login(page, user):
    page.goto(BASE + '/login')
    page.wait_for_selector('input')
    page.fill('input[name="username"], input[type="text"]', user)
    page.fill('input[type="password"]', 'Passw0rd!')
    page.keyboard.press('Enter')
    page.wait_for_timeout(2200)


def visible(page, text):
    return page.get_by_text(text, exact=False).first.is_visible()


import traceback
with sync_playwright() as p:
    browser = p.chromium.launch(**({'channel': os.environ['PW_CHANNEL']} if os.environ.get('PW_CHANNEL') else {}), headless=True)

    def new_page():
        ctx = browser.new_context(viewport={'width': 1400, 'height': 1000})
        ctx.set_default_timeout(6000)
        page = ctx.new_page()
        page.on('pageerror', lambda e: problems.append(('pageerror', str(e)[:200])))
        page.on('response', lambda r: problems.append((f'HTTP {r.status}', r.url.replace('http://localhost:8765', '')[:100])) if r.status >= 400 and '/api/' in r.url else None)
        return page

    # ---------------- admin
    page = new_page()
    login(page, 'ada')

    with section("page.goto(BASE + '/training'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/training'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='New course').click()
        page.get_by_label('Title').fill('Rust basics')
        page.get_by_label('Skills taught (comma separated)').fill('Rust, Python')
        page.get_by_role('button', name='Create').click()
        page.wait_for_timeout(1200)
        page.get_by_role('tab', name='Course catalogue').click()
        check('training: course listed', visible(page, 'Rust basics'))
        page.get_by_role('button', name='Assign', exact=True).first.click()
        page.get_by_role('dialog').get_by_role('button', name='Assign').click()
        page.wait_for_timeout(1200)
        check('training: assigned message', visible(page, 'Assigned to'))

    with section("page.goto(BASE + '/surveys'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/surveys'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='New survey').click()
        page.get_by_label('Title').fill('Q4 pulse')
        page.get_by_label('Question 1').fill('How happy are you?')
        page.get_by_role('button', name='Create').click()
        page.wait_for_timeout(1200)
        check('surveys: created', visible(page, 'Q4 pulse'))

    with section("page.goto(BASE + '/settings'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/settings'); page.wait_for_timeout(1500)
        page.get_by_label('Company Name').fill('Acme Test')
        page.get_by_role('tab', name='Payroll').click()
        check('settings: payroll tab', page.get_by_label('Basic salary (% of monthly CTC)').is_visible())
        page.get_by_role('tab', name='Knowledge base').click()
        check('settings: knowledge tab', visible(page, 'Company FAQ'))
        page.get_by_role('button', name='Save Settings').click()
        page.wait_for_timeout(1000)
        check('settings: saved', visible(page, 'Settings saved'))
        page.reload(); page.wait_for_timeout(1500)
        check('settings: persisted', page.get_by_label('Company Name').input_value() == 'Acme Test')

    with section("page.goto(BASE + '/recruitment'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/recruitment'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='New opening').click()
        page.get_by_label('Job title').fill('Data Engineer')
        page.get_by_label('Required skills (comma separated)').fill('SQL, Python')
        page.get_by_role('button', name='Write the description with AI').click()
        try:       # instant from the built-in template, a few seconds when an AI key is configured
            page.wait_for_function("() => [...document.querySelectorAll('textarea')].some(t => t.value.length > 40)", timeout=40000)
        except Exception:
            pass
        check('recruitment: description generated', len(page.get_by_label('Description').input_value()) > 40)      # a template or, when an AI key is set, a written description
        page.get_by_role('button', name='Create opening').click()
        page.wait_for_timeout(1200)
        page.get_by_role('button', name='Add manually').click()
        page.get_by_label('Full name').fill('Zed')
        page.get_by_label('Skills (comma separated)').fill('SQL')
        page.get_by_role('button', name='Add', exact=True).click()
        page.wait_for_timeout(1200)
        check('recruitment: candidate row + match', visible(page, 'Zed') and visible(page, '50% of required skills'))
        check('recruitment: fit prediction chip', visible(page, 'Low') or visible(page, 'Medium') or visible(page, 'High'))
        page.get_by_role('button', name='Import from a list').click()
        page.get_by_label('Candidate list').fill('Name,Email,Skills\nYash Gupta,yash@example.com,SQL; Python')
        page.get_by_role('button', name='Read the list').click(); page.wait_for_timeout(1200)
        page.get_by_role('button', name='Add 1 candidate(s)').click(); page.wait_for_timeout(1200)
        check('recruitment: bulk import', visible(page, 'Yash Gupta'))
        # resumes: drop two text resumes in, the details are read, HR adds them
        import tempfile
        folder = tempfile.mkdtemp()
        paths = []
        for name, email in (('Ritu Kapoor', 'ritu.kapoor@example.com'), ('Sameer Khan', 'sameer.khan@example.com')):
            path = os.path.join(folder, name.replace(' ', '_') + '.txt')
            lines = [name, f'{email} | +91 98765 4321{len(paths)}', 'Pune', '', 'Data engineer with 3 years of experience.', 'Skills: SQL, Python, Airflow']
            open(path, 'w').write(chr(10).join(lines) + chr(10))
            paths.append(path)
        page.get_by_role('button', name='Upload resumes').click()
        page.get_by_label('Resume files', exact=True).set_input_files(paths)
        page.get_by_role('button', name='Read 2 resumes').click()
        page.wait_for_selector('text=Check the details', timeout=120000)
        check('recruitment: resume details were read', page.get_by_label('Email for Ritu_Kapoor.txt').input_value() == 'ritu.kapoor@example.com')
        page.get_by_role('button', name='Add 2 candidates').click(); page.wait_for_timeout(1800)
        check('recruitment: resume candidates added with a resume to open', visible(page, 'Sameer Khan') and page.get_by_role('button', name='Open resume of Sameer Khan').count() == 1)
        page.get_by_role('button', name='Share application form').click(); page.wait_for_timeout(500)
        check('recruitment: application link to share', '/apply/' in page.get_by_label('Application link').input_value())
        page.keyboard.press('Escape'); page.wait_for_timeout(300)

    with section("page.goto(BASE + '/ai-tools/job-matching'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/ai-tools/job-matching'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='Find Matches').click()
        page.wait_for_timeout(2000)
        check('job matching: results', visible(page, 'Ada Admin') or visible(page, 'Max Manager'))

    with section("page.goto(BASE + '/analytics'); page.wait_for_timeout(1800)"):
        page.goto(BASE + '/analytics'); page.wait_for_timeout(1800)
        check('analytics: insights', visible(page, 'What the numbers say') and visible(page, 'Attrition'))
        page.get_by_role('tab', name='Pay & cost').click(); page.wait_for_timeout(800)
        check('analytics: pay tab in rupees', visible(page, 'Annual CTC bill'))

    with section("page.goto(BASE + '/payroll'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/payroll'); page.wait_for_timeout(1500)
        page.get_by_role('button', name='Generate payslips').click()
        page.wait_for_timeout(1800)
        check('payroll: generated', visible(page, 'payslip(s) created'))
        check('payroll: export buttons', page.get_by_role('button', name='Bank transfer file').is_visible() and page.get_by_role('button', name='Payroll register').is_visible())
        page.get_by_role('button', name='Release payslips').click(); page.wait_for_timeout(1200)
        if visible(page, 'Some employees have no bank details'):
            page.get_by_role('button', name='Release anyway').click(); page.wait_for_timeout(1200)
        check('payroll: released', visible(page, 'released'))
    with section('dashboard and notifications'):
        page.goto(BASE + '/'); page.wait_for_timeout(2500)
        check('dashboard: needs your attention', visible(page, 'Needs your attention'))
        page.get_by_role('button', name='Notifications', exact=False).first.click(); page.wait_for_timeout(800)
        check('notifications: bell menu opens', visible(page, 'See all notifications'))
        page.get_by_role('button', name='See all notifications').click(); page.wait_for_timeout(1000)
        check('notifications: page', '/notifications' in page.url)


    with section("page.goto(BASE + '/compliance'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/compliance'); page.wait_for_timeout(1500)
        check('compliance: page', visible(page, 'Compliance'))

    with section('eid = page.evaluate("JSON.parse(localStorage.getItem(\'user\')).employee_id")'):
        eid = page.evaluate("JSON.parse(localStorage.getItem('user')).employee_id")
    with section("page.goto(BASE + '/employees/' + eid); page.wait_for_timeout(2500)"):
        page.goto(BASE + '/employees/' + eid); page.wait_for_timeout(2500)
        page.get_by_role('tab', name='LEAVES').click(); page.wait_for_timeout(1200)
        check('profile: leave balance', visible(page, 'days left'))
        page.get_by_role('tab', name='PERFORMANCE').click(); page.wait_for_timeout(1200)
        check('profile: performance', visible(page, 'OVERALL SCORE'))
        page.get_by_role('tab', name='DOCUMENTS').click(); page.wait_for_timeout(1000)
        check('profile: documents tab', visible(page, 'No documents uploaded'))
        page.get_by_role('tab', name='PAY').click(); page.wait_for_timeout(1200)
        check('profile: pay tab', visible(page, 'Bank and tax details') and visible(page, 'Recurring benefits'))
        page.screenshot(path=os.path.join(S, 'flow_profile.png'))

        # chatbot
    with section("page.goto(BASE + '/'); page.wait_for_timeout(1500)"):
        page.goto(BASE + '/'); page.wait_for_timeout(1500)
        page.locator('button.MuiFab-root').last.click()
        page.get_by_placeholder('Type your HR question', exact=False).fill('what is the leave balance')
        page.keyboard.press('Enter')
        page.wait_for_timeout(2000)
        check('chatbot: answered', visible(page, 'leave') )
        page.screenshot(path=os.path.join(S, 'flow_chat.png'))

        # ---------------- employee
    page2 = new_page()
    login(page2, 'eve')
    with section("page2.goto(BASE + '/payroll'); page2.wait_for_timeout(1800)"):
        page2.goto(BASE + '/payroll'); page2.wait_for_timeout(1800)
        check('employee: payroll visible', visible(page2, 'Payslip history'))
        check('employee: no admin buttons', page2.get_by_role('button', name='Generate payslips').count() == 0)
    with section("page2.goto(BASE + '/training'); page2.wait_for_timeout(1500)"):
        page2.goto(BASE + '/training'); page2.wait_for_timeout(1500)
        check('employee: assigned training', visible(page2, 'Rust basics'))
    with section("page2.goto(BASE + '/surveys'); page2.wait_for_timeout(1500)"):
        page2.goto(BASE + '/surveys'); page2.wait_for_timeout(1500)
        page2.get_by_role('button', name='Respond').first.click()
        page2.get_by_role('dialog').locator('label').nth(3).click()
        page2.get_by_role('button', name='Submit').click()
        page2.wait_for_timeout(1200)
        check('employee: survey submitted', visible(page2, 'Thank you'))
    with section("page2.goto(BASE + '/offboarding'); page2.wait_for_timeout(1200)"):
        page2.goto(BASE + '/offboarding'); page2.wait_for_timeout(1200)
        page2.get_by_role('button', name='Submit my resignation').click()
        page2.get_by_label('Last working day').fill('2026-12-31')
        page2.get_by_role('button', name='Submit', exact=True).click()
        page2.wait_for_timeout(1200)
        check('employee: resignation submitted', visible(page2, 'Pending'))
    with section("page2.goto(BASE + '/compliance'); page2.wait_for_timeout(1200)"):
        page2.goto(BASE + '/compliance'); page2.wait_for_timeout(1200)
        check('employee: compliance blocked', '/compliance' not in page2.url)
    with section("page2.goto(BASE + '/settings'); page2.wait_for_timeout(1200)"):
        page2.goto(BASE + '/settings'); page2.wait_for_timeout(1200)
        check('employee: settings blocked', '/settings' not in page2.url)
    with section('recognition + integrations'):
        page.goto(BASE + '/recognition'); page.wait_for_timeout(1500)
        page.get_by_label('Colleague').click()
        page.get_by_role('option', name='Eve Employee', exact=False).click()
        page.get_by_label('Why?').fill('Great teamwork this sprint')
        page.get_by_role('button', name='Send recognition').click(); page.wait_for_timeout(1200)
        check('recognition: kudos sent + on feed', visible(page, 'Recognition sent!') and visible(page, 'Great teamwork this sprint'))
        page.goto(BASE + '/settings'); page.wait_for_timeout(1500)
        page.get_by_role('tab', name='Integrations').click(); page.wait_for_timeout(1200)
        check('settings: integrations tab', visible(page, 'Employee data (CSV)') and visible(page, 'Webhooks'))

    # ---------------- public careers page (no login)
    page3 = new_page()
    with section('careers page'):
        page3.goto(BASE + '/careers'); page3.wait_for_timeout(1800)
        check('careers: public job list', visible(page3, 'Backend Dev'))
        page3.wait_for_timeout(1500)
        check('pwa: service worker registered', page3.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length > 0)"))
        check('pwa: manifest linked', page3.evaluate("!!document.querySelector('link[rel=manifest]')"))
        page3.get_by_placeholder('Type your question').fill('any python jobs?')
        page3.get_by_role('button', name='Send').click(); page3.wait_for_timeout(1500)
        check('careers: chatbot answers', visible(page3, 'Backend Dev') and '/login' not in page3.url)
        page3.get_by_role('link', name='Apply').first.click(); page3.wait_for_timeout(1500)
        check('careers: apply opens the application page', '/apply/' in page3.url)
        page3.get_by_label('Full name').fill('Casey Candidate')
        page3.get_by_label('Email').fill('casey@example.com')
        page3.get_by_role('checkbox').check()
        page3.get_by_role('button', name='Submit application').click(); page3.wait_for_timeout(1500)
        check('careers: application accepted', visible(page3, 'Thank you'))
    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name, detail)
print('\nPROBLEMS:')
for item in dict.fromkeys(problems):
    print(' ', item)

bad = [p for p in problems if p[0].startswith(('pageerror', 'HTTP 5'))]
sys.exit(1 if failed or bad else 0)
