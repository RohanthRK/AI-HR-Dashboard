# Progression — where we are

_Snapshot: 27 October 2026 (twelfth pass). Companion docs: [ImplementedFeatures.md](ImplementedFeatures.md), [README.md](README.md) (setup, deploying, security notes, API, SSO, integrations, AI providers), [e2e/README.md](e2e/README.md)._

## Summary

The project is feature-complete against its plan and every earlier "next steps" list, deployable (Docker files, first-admin bootstrap, backups) and clean on dependency audits. This pass migrated the front end off the unmaintained Create React App to Vite, fixed an app-wide layout bug that came with MUI v7, and brought both dependency audits to zero findings.

**Verification (all passing):** 191 backend tests · 55 frontend unit tests (Vitest) · 34 browser checks and a route sweep (46 pages × admin/employee × desktop/phone: 0 JavaScript errors, 0 server errors, 0 horizontal-scroll problems) on the Vite production build · `npm audit` and `pip-audit`: **0 known vulnerabilities** · all of it wired into GitHub Actions.

**Rough completion:** core HR ≈ 98 %, people programmes ≈ 95 %, AI/analytics ≈ 90 %, integrations ≈ 85 %, operations/deployment ≈ 88 %, automated tests ≈ 85 %.

## History

| Pass | What happened |
|---|---|
| Start | Docs claimed far more than existed: hard-coded "AI" analytics, mocked notifications, a never-rendered chatbot, a public employee-debug endpoint |
| 1st–2nd | Real notifications, payroll rewrite, Kanban, data-driven analytics, real job matching / review generator / analytics page / settings, first tests |
| 3rd | Permission audit, session security, skills catalogue, training / surveys / compliance / exit, CI, browser verification |
| 4th | Groq + Gemini layer, e-mail / Slack / Teams delivery, bank details and pay items, onboarding, candidate fit, careers page and chatbot, trained attrition model, e2e suite |
| 5th | SSO, recognition, webhooks + CSV, survey templates, catalogue editor, PWA, route sweep |
| 6th | First-admin bootstrap, backup/restore, Docker, password / upload / seed hardening, code splitting |
| 7th | Vite migration, MUI v7 Grid fix, zero-vulnerability dependency audits, `pypdf` |
| 8th | Real Gemini key verified live; AI layer rebuilt on grounded prompts (`ai_analytics/assistant.py`); one coherent local demo company in the database; `check_data.py` |
| 9th | UI polish and functional audit of every page with real data: layout, readability, real analytics pages, team attendance, sick leave, bug fixes |
| 10th | Security and permission audit (Admin/HR vs Manager vs Employee), input validation, company holidays and timezone, Change password, offline handling, legacy SQL code removed |
| 11th | Indian company: rupee payroll with PF/ESI/PT/TDS and a pay-run workflow, Indian seed and holidays, rebuilt Analytics, Recruitment with bulk import, saved performance reviews, rebuilt Compliance / Recognition / Onboarding / Exit pages, one place to add employees |

## Done in the twelfth pass (dashboard, notifications, resume-driven recruitment, attendance hours)

- **Attendance you can see at a glance.** The calendar is one compact screen (no scrolling at laptop size): every day coloured as full day, short on hours, late, absent, leave, holiday or working now, with the month's hours against what is expected and the chosen day's detail beside it. Voice clock-in was removed.
- **HR sees everyone's attendance.** An *Everyone* tab (managers: *My team*) lists each person's hours worked against hours expected, with absent / short / late / no-clock-out counts, plain-language flags, search, department and status filters, sorting, any period (today to 93 days) and a CSV download. Click a person to open their calendar. Expected hours default to 8 a day and the late time to 09:30 (Settings > General); HR can set different hours for a person (part-time, shorter shifts). Half-day leave halves the expectation; weekends, holidays and approved leave are not counted as missing time; a day is short only when more than 15 minutes under.
- **Skills tab:** your own skills come first, the company skills pool below.
- **Stale sign-ins** (for example after the database is reseeded) are now rejected and sent to the login page instead of showing "Failed to load employee profile".

- **Recruitment without typing.** HR drops one or many resumes (PDF, DOCX, TXT) and the AI reads each: name, e-mail, mobile, city, current company and role, experience, skills, education and a short summary, plus the match against the opening. A table lets HR correct anything and add everyone in one click; the resume stays attached and can be opened from the candidate row. Duplicates are flagged, unreadable files are reported one by one, forged file tokens cannot reach other files. Without an AI key the text patterns still read the basics (`recruitment/resume.py`).
- **A form candidates fill themselves.** Each opening has a public application page (`/apply/<id>`) with a link, QR code and WhatsApp / e-mail buttons; the channel in the link (`?src=Naukri`) is stored as the candidate's source. The candidate uploads a resume, the form fills itself, they check it and agree to the data-protection notice, and submit. HR gets a notification. (A Google Form could not read the resume or land in the pipeline, so the built-in form replaces it.)
- **Delete a job posting.** *Delete opening* asks for confirmation, says how many candidates go with it, and removes their resumes too (closing the opening is the gentler alternative).
- **Dashboard rebuilt on real data.** One role-aware call replaces a page that pulled the whole employee list into the browser, defaulted leave to 18 days and invented a "System Initialized" activity. Needs-your-attention items link to the right page; birthdays, anniversaries, joiners, who is out today and the activity feed come from the records.
- **Notifications done properly.** Each has a destination link and category; the bell polls a cheap count every 30 seconds and a toast appears when something new arrives while you work; there is a Notifications page (it was a broken link) with unread and category filters, remove, mark all read and clear read. New events: applications, expense claims (to HR and the manager) and helpdesk tickets (to HR). Helpdesk tickets are no longer saved from arbitrary request fields.
- **No placeholder data.** Resume Screening now uses the company's real openings and departments instead of a hard-coded catalogue; Performance Review no longer invents a rating of 4 and "Medium" growth for everyone; User Management has no built-in department list; passwords are generated with the browser's secure random source.
- **Smaller things.** The AI Assistant entry is gone from the side bar. The floating chat bubble no longer covers dialog buttons. The public `/media/` route (which could expose employee documents in debug mode) was removed. The public form allows 30 applications and 40 resume reads per hour per address (a campus drive shares one network).
- **Tests:** 191 backend and 55 frontend unit tests, browser flows and the route sweep all pass. A runtime bug (a header handler removed by mistake) that no build step could catch is now covered by a header test.

## Done in the eleventh pass (an Indian company, and the pages HR uses every day)

- **Payroll.** `payroll/engine.py` builds a payslip the Indian way: CTC → Basic (40%), HRA (50% of basic), special allowance; employee and employer PF (12% of the ₹15,000 wage ceiling), ESI for low salaries, professional tax, TDS under the new tax regime (standard deduction, 87A rebate with marginal relief, cess). Loss-of-pay leave and mid-month joining or leaving change the days paid. The pay run has three states (Draft → Released → Paid and locked), pre-release checks (no bank details, no PAN, no salary, joiners, leavers, LOP), one-off adjustments that survive recalculation, a bank transfer file, a payroll register and a PF/ESI/TDS summary. Salary revisions keep a history. Payslips show amount in words and year-to-date, on screen and as PDF ("Rs." in the PDF so it prints on any system).
- **Indian defaults.** Rupee formatting with lakh/crore grouping, day-first dates, IST, Indian holidays, PAN/UAN/IFSC fields (validated), POSH and DPDP trainings, Aadhaar/PAN/offer-letter/certificates as required documents, Indian notice period (60 days) and exit checklist. The demo company is "Kaveri Technologies Pvt. Ltd." with Indian names, cities and CTCs.
- **Analytics** is one page with seven tabs (overview, workforce, hiring, attendance & leave, performance & learning, pay & cost, engagement & risk) and a "what the numbers say" box on each; HR/Admin only (the old overview endpoint also showed average salaries to managers and is gone). Attrition uses one formula everywhere.
- **Recruitment** moved under HR Tools: openings (with positions and budget), a full-width candidate table (contact, current role, experience, notice, CTC, fit), and bulk import from any pasted list or CSV (tables are read directly, free text by the AI; review before adding; duplicates flagged). Job Matching can create an opening and links to Recruitment. The recruitment API no longer stores arbitrary fields.
- **Saved performance reviews.** "Save review" and "Deliver to employee" only showed a browser alert before. Reviews are now saved as drafts or sent (with a note and a notification), listed under *Saved reviews* with search and filters, and employees read theirs under Performance > Reviews. Saving the same review or the same resume screening twice no longer creates a second copy.
- **Pages rebuilt for daily use:** Compliance (tiles, search, filters, by employee, reminders), Recognition (newest first, search, filters, "received by me"), Onboarding (pick a person), Exit Management (tiles, search, filters, HR-recorded exits), Training (search, status/course/department filters, assign to a department).
- **One place to add people.** Employee Directory links to User Management, which now collects everything the old dialog did (date of birth, address, team, manager, CTC, PAN) plus the login and role.
- **Bugs fixed on the way:** seeded recognitions timestamped in the future sorted above real ones; the default holiday list could not be saved (a day with two festivals); the employee list accepted any field as a filter (pay could be probed) and an unescaped regex; new employees were added to a team's cards but not its member list.
- **Tests:** 163 backend, 41 frontend, browser flows and the route sweep all pass.

## Done in the tenth pass (security, rules and cleanup)

- **Permission model.** Admin (HR) sees and edits everything. A Manager sees only their own reports (attendance, leaves, expenses, reviews, performance, projects, onboarding/offboarding, documents) and never sees salary, bank or personal fields. An Employee sees only themselves. Payroll and settings are Admin only; user roles are changed by Admin only. Enforced server-side through `utils/auth_utils.py` (`visible_refs`, `can_see_employee`, `scope_query`) and covered by `tests/test_security.py`.
- **Input rules.** Malformed JSON returns 400, never 500 (`ErrorSanitizerMiddleware`, which also hides internal error text). Employee, expense, leave and password inputs are validated; employees may edit only their own contact details; blank employee codes get the next `EMP-nnnn`.
- **Leave rules.** Days count Mon-Fri minus company holidays (`utils/workdays.py`); balances are checked per type and year; the request form previews working days.
- **Settings.** Company name, timezone and a holiday list (US defaults) are editable in Settings (Admin only) and used app-wide.
- **Account.** A *Change password* dialog in the header menu; password strength rules shared by backend and frontend.
- **Resilience.** `createApiClient` in `services/api.js` gives every service the token, a 401 redirect and offline events; the app shows an "offline" banner and the login page explains when the server is unreachable.
- **Removed.** All legacy SQL team/project models and routes, `reset_pw.py`, `reset_data.py`, `seed_teams`, the `/attendance/report` endpoints, and unused frontend service methods. The team API is MongoDB only; adding someone to a team removes them from their previous one.
- **Config.** `DEBUG` defaults to False and `ALLOWED_HOSTS` is required in production; `GEMINI_MODEL` defaults to `gemini-2.5-flash` (thinking off for speed).
- **Accessibility.** Axe checks are clean in light and dark themes for all three roles; phone-width layouts were reviewed.
- **Tests.** 136 backend (new `test_rules.py`, `test_security.py`, `test_polish.py`) and 33 frontend.

## Done in the ninth pass (polish and functional audit)

Every page was opened in a real browser on the seeded company, as an admin and as an employee, and checked for how it looks and whether it works.

- **Layout.** The page content was pushed 480 px to the right (the sidebar drawer and the content margin both reserved its width), the clock wrapped onto two lines, the login labels were clipped, and several pages used different title styles and padding. All pages now share one title style and alignment; yellow-on-white text (outlined buttons, selected tabs, links, stat numbers) is dark in light mode.
- **Pages that were really mock-ups, now built on real data:** *Advanced Analytics* (four tabs, backed by the engagement, attrition and exit data; it used static numbers before), *Talent Insights* (it generated advice in the browser from hard-coded role maps), *team detail* (invented projects, random dates and fake e-mails; there are now 16 real projects) and *Team OKRs / Dept OKRs* (empty before). The orphan *Attendance Report* mock page (always "John Doe, 2023") was removed and replaced by a real **Team** tab on Attendance (who is in, on leave or missing on any day; managers and admins).
- **Bugs found by looking at real data:** employees saw none of their own assets; expense titles, helpdesk subjects and requester names were blank; the dashboard's leave ring ignored leave already taken and its attendance card showed company-wide numbers to employees; "My OKRs" listed everyone's; key results showed a bare "%"; the payroll summary ignored recurring pay items so it disagreed with the payslip; the headcount trend never dropped for leavers; LOP leave showed "100 days remaining".
- **More realistic data.** Sick leave (10 days a year; LOP is unlimited), team and department OKRs, projects, office-hours clock times in the company's timezone (Settings > General), varied recognition messages. `check_data.py` also verifies projects and leave entitlements.
- **Consistent display.** One set of formatters (`utils/format.js`) for dates, ranges, times (company timezone) and money replaces a mix of ISO strings and browser-locale dates.

## Done in the eighth pass

- **Gemini works end to end.** `gemini-2.0-flash` is retired, so `utils/llm.py` now uses `gemini-2.5-flash` with a fallback chain, retries transient 503s and ignores placeholder keys. Tests blank every external key before Django loads, so they never call a live service.
- **AI features rebuilt on facts.** Chatbot (own data only, with history), performance review, team review, analytics briefing, development plan, survey summary, job-match notes and resume screening all build prompts from database facts, request JSON, validate it and fall back to rules. Live output reviewed and prompts tightened (no zero-count achievements, no irrelevant skill gaps).
- **Realistic local data.** `seed_data.py --yes` drops everything and loads Northwind Tech: 49 active employees all in teams with managers, logins, locations and business units; 8 former employees; 12 teams; 6 months of attendance/leave/payroll consistent with each other; reviews, OKRs, training, a survey, hiring, expenses, assets, tickets and PDF documents. Old `schemas.py` / `apply_schemas.py` (stale Mongo validators) were removed.
- **`check_data.py`** verifies all of it (team membership, manager chains, leave overlaps, attendance vs weekends/leave, payslip maths, documents on disk…); a test seeds a scratch database and asserts no problems.
- **Bugs found on the way:** managers could not approve their reports' leaves; employee/team counts included former staff; the Directory's *Active* filter read the wrong field and showed nobody; the dashboard counted weekends as absences.
- **Checked in a real browser with the real key:** dashboard, analytics briefing, teams, directory, employee profile + development plan, survey summary, job matching, review pages, compliance, leaves, and the employee chatbot, payroll, attendance and training pages.

## Done in the seventh pass

- **Create React App → Vite.** `react-scripts` removed; `vite.config.js` keeps the `REACT_APP_*` variables and `BUILD_PATH`, output stays in `frontend/build`, tests run on Vitest (26 tests in ≈ 7 s instead of ≈ 28 s), builds take ≈ 12 s. The service worker, nginx config, Dockerfile, Vercel config and CI were adjusted (`/assets/` instead of `/static/`).
- **App-wide layout bug fixed.** MUI v7 renamed the old `Grid` to `GridLegacy`; `Grid` now silently ignores `item`, `xs`, `md`… so every page using the old API laid out wrongly (visible as uneven card widths). All 40 affected files now import `GridLegacy` as `Grid`; the analytics page, for example, is a proper 2 × 2 grid. The test run also stopped printing dozens of Grid warnings.
- **Dependencies clean.** Front end: 67 findings → **0** (CRA removed, `axios`, `react-router-dom`, `vitest`, `lodash` updated). Back end: Django 6.0.4 → 6.1.1, DRF, PyJWT, pymongo, requests, sqlparse, python-dotenv upgraded and `PyPDF2` replaced by `pypdf` → `pip-audit` reports none. Both audits now run in CI. A new test builds a real PDF and DOCX to prove resume parsing still reaches the model.
- **Verified end to end:** unit tests, backend tests, the 34 browser flows and the 46-page sweep all pass on the Vite build.

## How this was checked

- `python run_tests.py` — 163 tests on a random scratch MongoDB database (dropped afterwards); external services mocked.
- `npm test` — 31 Vitest tests.
- `e2e/flows.py` (34 checks) and `e2e/sweep.py` in Edge against a production build and a scratch database.
- `npm audit` and `pip-audit` — no known vulnerabilities.
- **Not verified:** the Docker build, Groq, real Google / Microsoft / SMTP / Slack credentials, the Render and Vercel deployments, Firefox and Safari, a physical phone, real microphone input.

## Known limits

1. External integrations (LLM keys, SSO, SMTP, webhooks) are tested with mocks only; without credentials the app degrades gracefully.
2. The attrition model is a small logistic regression and candidate fit a transparent score — ranking aids, not validated predictors.
3. Public endpoints trust `X-Forwarded-For` for rate limiting; deploy behind a proxy that sets it.
4. No native app-store app (the PWA installs) and no vendor-specific Workday / SAP / BambooHR connectors beyond webhooks and CSV.
5. Dependency audits are a point-in-time result; new advisories will appear (CI re-checks on every push).
6. `backend/.env` is gitignored and now points at the local MongoDB with a random `SECRET_KEY`; the Atlas URI is kept commented out in it — rotate that database password. The Docker images have never been built here (no Docker on the dev machine).

## Next steps

1. Build the Docker images and run the e2e suite against a staging deployment with real SSO, LLM and SMTP credentials.
2. Vendor-specific connectors on top of the webhooks / CSV tools; a native wrapper if app-store distribution is needed.
3. Revisit the attrition and fit models as history accumulates.

## Architecture at a glance

| Layer | Details |
|---|---|
| Auth | `auth_app.middleware.JWTAuthMiddleware` decodes the bearer token and sets `request.user_id`, `request.employee_id`, `request.role`. Public: `/api/auth/login`, `/api/health/` |
| Data | MongoDB (Atlas, falls back to localhost) via `hr_backend/db.py`. SQLite is only used for Django's own tables |
| Analytics | `ai_analytics/insights.py` — one `Context` snapshot per request; attrition, engagement, anomalies, growth, skills |
| Async | None - no background workers or Redis are needed |
| Notifications | `utils/notify.py` writes to `Notifications`; `/api/notifications/` serves them per user |
| Deploy | Backend: Render (`render.yaml`, gunicorn + whitenoise). Frontend: Vercel (`vercel.json`) |

Known data-model caveat: employees are referenced both by Mongo `_id` string and by business code (`EMP-1234`) in different collections, so lookups use helpers that accept either.
