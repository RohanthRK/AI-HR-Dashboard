# Implemented Features Tracker

Status of every feature, based on what the code does (sixth pass, October 2026). Items marked **[x]** are covered by the backend test-suite (`python run_tests.py`, 77 tests), the frontend unit tests (26, Vitest) and/or the browser flows and route sweep in `e2e/` against a scratch database.

Legend: **[x]** working · **[~]** works with a caveat · **[ ]** not built

---

## Core HR

### Authentication & access control
- [x] JWT login (2-hour tokens), automatic token refresh in the SPA (`POST /api/auth/refresh/`), redirect to login on 401
- [x] Login throttling: 5 failed attempts per user+IP → 15-minute lockout (HTTP 429)
- [x] Roles Admin / Manager / Employee (`HR` is honoured where checked); JWT middleware protects every route except `auth/login` and `health`
- [x] **Single sign-on** with Google and Microsoft (OIDC authorization-code flow, signed state, existing accounts only, matched by verified e-mail)
- [x] Own profile and password change (`/api/auth/profile/`, `/api/auth/change-password/`)
- [x] User provisioning (Signup, Admin), user/role admin
- [x] Server-side role/ownership checks on: attendance admin, employee documents, employee pay/personal data (redacted for colleagues), leave balance, leave self-approval blocked, expenses, assets, PIPs, objectives, skills, review detail, helpdesk, recruitment, payroll, teams/projects, people analytics, resume screening

### Employees, teams, documents
- [x] Employee CRUD, directory, profile with **Performance / Leaves / Documents tabs on live data**
- [x] Departments CRUD, teams with managers and members
- [x] Documents: upload (with optional expiry date), download, delete — owner or Admin/Manager/HR only
- [x] Creating an employee resolves real department/team ids

### Attendance, leave, payroll
- [x] **Attendance calendar and hours** (one-screen month view; expected hours per day, company default or per person; short / late / absent / no-clock-out flags; HR sees everyone with search, filters, periods and CSV; managers see their team)
- [x] Clock in/out, calendar, daily attendance (`/attendance/daily/`), summary, reports
- [x] Leave requests (incl. half-day), approve/reject/cancel, balances for earned (18 days), sick (10 days) and unlimited unpaid leave, notifications
- [x] Payroll (India): annual CTC → Basic/HRA/special allowance, PF, ESI, professional tax and TDS (new regime), loss of pay, mid-month joiners, one-off adjustments, salary revisions with history, Draft → Released → Paid pay run with pre-release checks, bank transfer file, payroll register, PF/ESI/TDS summary, payslip on screen and PDF in rupees
- [x] Payroll rates (basic %, HRA %, PF %, wage ceiling, ESI threshold, professional tax, TDS switch) and overtime pay (hours beyond 8/day × multiplier) are configurable in Settings
- [x] Bank details and recurring per-employee benefits/deductions (profile → PAY tab); payslips and PDFs include them

### Performance
- [x] Reviews, OKRs, PIPs, skills, review generator (see AI)

### Expenses · Assets · Helpdesk
- [x] Expenses (claims always start Pending; decisions notify the employee), assets, helpdesk (owner/staff rules, status notifications)

### Notifications · Settings
- [x] Live notifications (leave, expense, ticket, training, compliance, onboarding, offboarding) with admin-controlled toggles
- [x] Optional delivery by e-mail (SMTP) and Slack/Teams webhook (`EMAIL_*`, `NOTIFY_WEBHOOK_URL`; switched on in Settings; failures never break the app)
- [x] Organisation settings, payroll rates, notification toggles, company FAQ and required-document list stored in MongoDB (Admin edits)

### Operations & security hardening
- [x] First-admin bootstrap (`create_admin.py`), JSON backup/restore (`backup.py`), Docker files and `docker-compose.yml` (unverified build), CI
- [x] Salted password hashes everywhere (the admin password-reset previously stored an unsalted SHA-256), minimum password length, production refuses a short `SECRET_KEY`
- [x] Document uploads: allow-list of types, 10 MB limit, unique stored names; demo seed refuses to run in production
- [x] Frontend moved from Create React App to **Vite** (build ≈ 12 s, tests ≈ 7 s), code-split routes (main bundle 602 kB → 280 kB gzipped), `npm audit` and `pip-audit` both clean and run in CI
- [x] Layout fix: MUI v7 silently ignored the old `Grid` `xs`/`md` props in 40 files; they now use `GridLegacy`, so pages lay out as designed
- [x] `PyPDF2` replaced by the maintained `pypdf`; PDF and DOCX resume parsing covered by a test

---

## People programmes

| Module | Status | Details |
|---|---|---|
| **Training & development** | [x] | Course catalogue, assign to selected/all employees with due dates, employee progress, completing a course adds its skills to the employee, **skill-gap recommendations** (skills in demand from open jobs and department peers that the employee lacks) |
| **Surveys & engagement** | [x] | Engagement/pulse surveys (rating, text, choice); anonymous mode with hashed one-response-per-person and results hidden below 3 responses; per-question stats, comment sentiment and **complaint-theme detection**; the latest survey feeds the engagement score |
| **Compliance** | [x] | Documents expired or expiring within 60 days, **required documents** missing, mandatory trainings unassigned/overdue, one-click reminders |
| **Onboarding** | [x] | Checklist created automatically for each new employee (and on demand): employee tasks, HR tasks, required documents and mandatory trainings that tick themselves off when satisfied; template editable in Settings |
| **Exit management** | [x] | Resignation request, approval, exit checklist, standing exit-interview survey, completing an exit deactivates the employee and user, attrition analytics (reasons, tenure at exit, exit survey) |
| **Recruitment** | [x] | Job openings, a candidate table, bulk import from a pasted list (AI-read, reviewed before adding), candidates, skill-match %, **candidate fit prediction** (60 % skills, 25 % experience, 15 % similarity to current top performers), job-description generator |
| **Public careers page** | [x] | `/careers` without login: open jobs (whitelisted fields only), apply, candidate chatbot about open roles; per-IP rate limits and a honeypot |
| **Recognition & gamification** | [x] | Peer kudos (5 badges, points, 5 per day limit), public feed, 30-day / all-time leaderboard, automatic achievement badges earned from training, goals, attendance and recognition received |
| **Integration hub** | [x] | HMAC-signed outbound webhooks for 7 HR events with SSRF protection, test button and last-delivery status; employee CSV export and import (dry run, validation, onboarding for imports) |
| **Survey templates** | [x] | Engagement, weekly pulse, manager feedback and onboarding templates; edit before creating |
| **Skill catalogue editor** | [x] | Visual editor (categories, skills, roles with required/recommended skills) for Admins on the Skills Assessment page |
| **Mobile** | [x] | Installable PWA (manifest, shortcuts, service worker that never caches API data); every page checked on a phone-sized screen for errors and horizontal scrolling |

---

## AI & analytics

| Feature | Status | How it works |
|---|---|---|
| LLM providers | [x] | **Gemini and Groq**, either or both; per-task preference, automatic fallback with cooldown on rate limits, status endpoint (`utils/llm.py`) |
| HR chatbot | [x] | LLM with the user's own data (profile, manager, team, leave balance, payslip, trainings, reviews), conversation history and the company FAQ; otherwise rule-based answers + FAQ matching. Logged to `ChatLogs` |
| Job matching | [x] | Skill-overlap ranking against a recruitment-board job |
| Performance review generator | [x] | Built from the employee's reviews, OKRs, attendance, leaves and skills; Gemini only rewrites the summary |
| Talent insights, growth (high potential, rising stars, needs support) | [x] | Computed in `ai_analytics/insights.py` (rules) |
| Attrition risk | [x] | Rules by default; **trained logistic-regression model** automatically once 8+ exits are recorded (shows model type, accuracy, per-employee drivers) |
| Attendance anomalies, payroll pre-run checks | [x] | Missing clock-outs, short/long shifts, late arrivals; missing salaries, outliers, missing payslips |
| Analytics (HR/Admin) | [x] | Seven tabs computed live: overview, workforce and attrition, hiring, attendance and leave, performance and learning, pay and cost, engagement and risk; plain-language findings on each |
| Skills assessment | [x] | Role/skill catalogue stored in MongoDB (`/api/skills/catalog/`; Admins edit it from the page as JSON) with demand from open jobs |
| Resume screening | [x] | PDF/DOCX/text parsed and scored by the LLM (verified live with Gemini); clear 503 when no key is set; results are saved to the database |
| Team review (AI Tools) | [x] | Ratings pre-filled from data; LLM narrative validated against the facts, template fallback |
| Analytics briefing, development plan, survey summary, job-match notes | [x] | LLM output grounded in database facts (`ai_analytics/assistant.py`), JSON-validated, deterministic fallback |
| Team attendance (Attendance > Team) | [x] | Who is in, on leave, late or missing on any day, with clock times in the company timezone; Admin / Manager / HR |
| Talent insights | [x] | Engagement history, attrition by tenure and department, exits by month / reason / department, skills demand, growth pipeline; all computed from your records |
| Demo data and integrity checker | [x] | `seed_data.py --yes` loads a coherent 49-person company; `check_data.py` verifies it (also run by a test) |

---

## Not built
- [ ] A native mobile app (the PWA covers installs) and vendor-specific connectors (Workday / SAP / BambooHR) beyond the webhook and CSV tools
- [ ] More sophisticated models: the attrition model is a small logistic regression and candidate fit is a transparent score
- [ ] Resume file parsing beyond PDF/DOCX/text, e-signature of documents
- [x] Saved AI performance reviews: save as draft, send to the employee or team with a note, search and filter, employees read theirs under Performance > Reviews
- [x] Dashboard (role-aware, real data), notifications page and live notifications, resume upload and AI reading (single and bulk), public application form with shareable link and QR code, deleting job openings
