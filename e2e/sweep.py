"""
Route sweep: opens every page as admin and as employee, on desktop and on a phone-sized screen, and fails on
JavaScript errors, API 5xx responses, console errors, or (on the phone) horizontal page scrolling.
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get('E2E_BASE', 'http://127.0.0.1:3999')
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'screenshots')
os.makedirs(SHOTS, exist_ok=True)

ADMIN_ROUTES = ['/', '/employees', '/teams', '/attendance', '/leaves', '/leaves/request', '/leaves/pending', '/payroll',
                '/performance', '/analytics', '/notifications', '/settings', '/recruitment', '/training', '/surveys',
                '/compliance', '/onboarding', '/offboarding', '/recognition', '/expenses', '/assets', '/helpdesk',
                '/ai-tools/resume-screening', '/ai-tools/job-matching', '/ai-tools/skills-assessment',
                '/ai-tools/performance-review', '/ai-tools/talent-insights', '/signup', '/careers']
EMPLOYEE_ROUTES = ['/', '/employees', '/teams', '/attendance', '/leaves', '/leaves/request', '/payroll', '/performance',
                   '/training', '/surveys', '/onboarding', '/offboarding', '/recognition', '/expenses', '/assets',
                   '/helpdesk', '/careers']

problems = []
overflow = []


def login(page, user):
    page.goto(BASE + '/login')
    page.wait_for_selector('input')
    page.fill('input[name="username"], input[type="text"]', user)
    page.fill('input[type="password"]', os.environ.get('E2E_PASSWORD', 'Passw0rd!'))
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)


def sweep(browser, user, routes, mobile):
    label = f"{user}/{'phone' if mobile else 'desktop'}"
    ctx = browser.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1400, 'height': 900},
                              is_mobile=mobile, has_touch=mobile)
    ctx.set_default_timeout(8000)
    page = ctx.new_page()
    current = {'route': 'login'}
    page.on('pageerror', lambda e: problems.append((label, current['route'], 'pageerror', str(e)[:160])))
    page.on('response', lambda r: problems.append((label, current['route'], f'HTTP {r.status}', r.url.split('/api/')[-1][:80]))
            if r.status >= 500 else None)
    page.on('console', lambda m: problems.append((label, current['route'], 'console.error', m.text[:140]))
            if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    login(page, user)
    for route in routes:
        current['route'] = route
        page.goto(BASE + route)
        page.wait_for_timeout(1300)
        if mobile:
            width = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
            if width[0] > width[1] + 1:
                overflow.append((label, route, width[0]))
                page.screenshot(path=os.path.join(SHOTS, f"overflow_{user}{route.replace('/', '_') or '_home'}.png"))
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch(**({'channel': os.environ['PW_CHANNEL']} if os.environ.get('PW_CHANNEL') else {}), headless=True)
    for mobile in (False, True):
        sweep(browser, os.environ.get('E2E_ADMIN', 'ada'), ADMIN_ROUTES, mobile)
        sweep(browser, os.environ.get('E2E_EMPLOYEE', 'eve'), EMPLOYEE_ROUTES, mobile)
    browser.close()

print(f'JS/server problems: {len(set(problems))}')
for item in dict.fromkeys(problems):
    print('  ', item)
print(f'Phone horizontal overflow: {len(overflow)}')
for item in overflow:
    print('  ', item)
allowed = int(os.environ.get('E2E_ALLOWED_OVERFLOW', '0'))
sys.exit(1 if problems or len(overflow) > allowed else 0)
