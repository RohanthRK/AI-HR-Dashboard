# AI-HR-Dashboard

A comprehensive, AI-powered HR Dashboard application built with **Django**, **React**, and **MongoDB**. Designed to modernize every aspect of Human Resources — from employee onboarding and leave management to AI-driven recruitment screening, performance reviews, and talent insights.

---

## 🚀 Features Overview

### Core HR Modules
| Module | Description |
|---|---|
| **Authentication** | JWT login with automatic refresh and brute-force lockout; optional **single sign-on with Google / Microsoft**; roles Admin / Manager / Employee |
| **Employee Management** | CRUD, directory, profile (performance, leave balance and documents on live data), skills, documents with expiry dates |
| **Team Management** | Teams with managers and members |
| **Attendance** | Clock-in/out, a one-screen month calendar (full day / short / late / absent / leave / holiday, hours against expected), history. **HR sees everyone** (managers their team): hours worked vs hours expected per person, absent / short / late / no-clock-out days, what needs attention, search, department and status filters, any period, CSV download, and a click-through to each person's calendar. Expected hours default to 8 a day (Settings) and HR can set different hours for a person |
| **Leave Management** | Requests, approvals, balances, half-days; nobody can approve their own leave |
| **Payroll (India)** | Annual CTC → monthly Basic / HRA / special allowance, **PF, ESI, professional tax and TDS (new tax regime)**, loss-of-pay and mid-month joiners, one-off adjustments, salary revisions with history, a Draft → Released → Paid pay run with pre-release checks, bank transfer file and PF/ESI/TDS summary, rupee payslips (on screen and PDF, with amount in words and year-to-date) |
| **Performance & Reviews** | Reviews, OKRs, PIPs, review generator |
| **Training & Development** | Courses, assignments, skill-gap recommendations |
| **Surveys & Engagement** | Anonymous engagement/pulse surveys with sentiment and theme analysis |
| **Compliance** | Expiring/missing documents (Aadhaar, PAN, offer letter, certificates) and overdue mandatory training such as POSH, summary tiles, search and filters, per-employee reminders |
| **Onboarding** | Pick an employee to see their checklist (employee tasks, HR tasks, required documents, mandatory trainings that tick themselves off); search and status filters |
| **Exit Management** | Resignations and HR-recorded exits (termination, retirement, end of contract), notice period, Indian exit checklist (F&F settlement, relieving letter, PF/UAN), attrition tiles, search and filters |
| **Recruitment** (HR Tools) | Job openings (positions, budget in LPA; delete or close them), a candidate table with contact, notice period, CTC, fit score and the resume. **Upload one or many resumes (PDF, DOCX, TXT): the AI reads each and fills in the details, HR checks and adds them.** A **shareable application form** per opening (link, QR code, WhatsApp / e-mail; the channel is tracked) where candidates upload their resume and the form fills itself. Bulk import from any pasted list or CSV |
| **Recognition** | Peer kudos with badges and points, leaderboard, automatic achievement badges (learning, goals, attendance) |
| **Integration hub** | Signed outbound **webhooks** for HR events; employee **CSV export / import** with dry-run |
| **Mobile** | Installable **PWA** (manifest + service worker), responsive layout verified on phone-sized screens |
| **Expenses / Assets / Helpdesk** | Claims, asset assignment, support tickets with status notifications |
| **Dashboard** | One call (`/api/dashboard/`), role-aware and all real: what needs your attention (approvals, compliance, payroll, open tickets, applications, your own tasks), headcount, attendance today, leave balance, upcoming holidays, birthdays, work anniversaries, new joiners, who is out, and a genuine activity feed |
| **Notifications** | Bell with unread badge (polled every 30 s), a toast when something arrives, every item links to its page, a full Notifications page with unread and category filters, remove / mark all read / clear read; HR is told about new applications, expense claims and tickets; optional e-mail (SMTP) and Slack/Teams delivery |
| **Settings** | Organisation, timezone and holidays, payroll rates, FAQ, onboarding tasks, notification switches, integrations |
| **Analytics** (HR/Admin) | Seven tabs of live HR analytics: overview, workforce and attrition, hiring, attendance and leave, performance and learning, pay and cost, engagement and risk, each with plain-language findings |

### AI Features
| Feature | Status |
|---|---|
| **HR Chatbot** | ✅ Gemini when `GEMINI_API_KEY` is set (aware of the user's leave balance), rule-based fallback otherwise; transcripts stored in `ChatLogs` |
| **Resume Screening** | ✅ Gemini (needs API key) |
| **Talent Insights** | ✅ Computed from your data: skills coverage, growth potential, attrition risk |
| **Anomaly detection** | ✅ Attendance anomalies and pre-run payroll checks, rule-based |
| **Job Matching** | ✅ Skill-overlap ranking against recruitment-board jobs |
| **Review generator** | ✅ Drafts from the employee's real reviews, OKRs, attendance and leaves |
| **Resume reading** | ✅ PDF / DOCX / TXT resumes become structured candidates (name, contact, city, current role and company, experience, skills, education, a two-line summary); text patterns still work when no AI key is set |
| **Recruitment** | ✅ Candidate table with skill-match % and a transparent **fit prediction**; resume upload, application form and list import |
| **Saved performance reviews** | ✅ AI reviews can be saved as drafts, sent to the employee (or team) with a note, and found again under *Saved reviews* |
| **Public careers page + candidate chatbot** | ✅ `/careers` (no login): open jobs, apply, chat about roles; rate-limited, honeypot-protected |
| **Skills Assessment** | ✅ Role/skill catalogue stored in MongoDB (Admin-editable) with employee matching |

See [ImplementedFeatures.md](ImplementedFeatures.md) for the full audit and [progression.md](progression.md) for where the project stands.

---

## 🛠 Tech Stack

### Backend
- **Django 6** (mostly hand-written `JsonResponse` views; DRF is used by the AI and Teams endpoints)
- **PyMongo** (Direct MongoDB connector)
- **PyJWT** (JSON Web Token authentication)
- **Google Gemini** (`google-genai`) and **Groq** (OpenAI-compatible REST) for the generative features, with automatic fallback between them
- **ReportLab** (payslip PDFs)
- **PyPDF2 / python-docx** (Resume parsing)

### Frontend
- **React 19** + **Vite** (Single Page Application; `npm start` runs the dev server, `npm run build` writes `frontend/build`)
- **Material-UI (MUI) v7** (Component library; the classic `Grid` API is used through MUI's `GridLegacy`)
- **Framer Motion** (Smooth animations and transitions)
- **Recharts** (Data visualization & charting)
- **Axios** (HTTP client for API calls)
- **React Router** (Client-side routing)

### Database
- **MongoDB** (NoSQL, accessed via PyMongo — no ORM)

---

## 📁 Project Structure

```
AI-HR-Dashboard/
├── backend/                  # Django backend
│   ├── hr_backend/           # Django project settings & URLs
│   ├── auth_app/             # Authentication, JWT, user management
│   ├── employees/            # Employee CRUD, departments, documents
│   ├── attendance/           # Clock-in/out, attendance records
│   ├── leaves/               # Leave requests, balance, approvals
│   ├── payroll/              # Salary, payslips, exports
│   ├── reviews/              # Performance reviews & scheduling
│   ├── performance/          # OKRs, PIPs, skills tracking
│   ├── teams/                # Team management
│   ├── ai_analytics/         # AI endpoints; insights.py holds the data-driven analytics
│   ├── recruitment/          # Job openings, candidates, resume reading (resume.py), public application form (public.py)
│   ├── dashboard/            # The role-aware home page data
│   ├── expenses/             # Expense submission & approval
│   ├── assets/               # Asset tracking
│   ├── helpdesk/             # Support tickets
│   ├── objectives/           # OKR management
│   ├── notifications/        # In-app notification system
│   ├── training/             # Courses, assignments, skill-gap recommendations
│   ├── feedback/             # Engagement / pulse / exit surveys
│   ├── reports/              # Compliance monitoring
│   ├── offboarding/          # Resignations, exit checklist, attrition analytics
│   ├── tests/                # API test-suite (python run_tests.py)
│   ├── utils/                # auth decorators, Gemini helpers, notify()
│   ├── seed_data.py          # Wipes the database and loads one coherent demo company (49 people, 12 teams)
│   ├── check_data.py         # Data-integrity checker (python check_data.py)
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/            # Page-level components
│   │   │   ├── Dashboard.js
│   │   │   ├── auth/         # Login, Signup (user/employee provisioning)
│   │   │   ├── employees/    # Directory, Profile, List
│   │   │   ├── attendance/   # Clock-in/out, calendar
│   │   │   ├── leaves/       # Leave request, balance, approval
│   │   │   ├── payroll/      # Payslips, salary breakdown
│   │   │   ├── reviews/      # Reviews, My Reviews, Team Reviews
│   │   │   ├── performance/  # OKR, PIP, Skills tabs
│   │   │   ├── teams/        # Team list, detail, edit
│   │   │   ├── ai-tools/     # Resume Screening, Job Matching, Talent Insights
│   │   │   ├── recruitment/  # Candidate pipeline
│   │   │   ├── training/ surveys/ offboarding/ compliance/ settings/
│   │   │   ├── expenses/     # Expense management
│   │   │   ├── assets/       # Asset management
│   │   │   ├── helpdesk/     # Support tickets
│   │   │   ├── objectives/   # OKR management
│   │   │   └── analytics/    # HR analytics (seven tabs)
│   │   ├── components/       # Reusable UI components
│   │   │   ├── layout/       # Sidebar, Navbar
│   │   │   ├── employees/    # EmployeeList, ProfileEditModal, ManageSkillsModal
│   │   │   ├── teams/        # TeamForm
│   │   │   └── chat/         # HRChatbot widget
│   │   ├── services/         # API service layer (Axios)
│   │   └── contexts/         # React context (Auth, Notifications)
│   └── package.json
│
├── .gitignore
├── README.md
├── ImplementedFeatures.md   # feature checklist
└── progression.md           # where the project stands, history, limits, next steps
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 16+
- MongoDB 6.0+ (local or Atlas)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in `backend/`:
   ```env
   SECRET_KEY=your_secret_key_here   # required when DEBUG=False
   DEBUG=True
   MONGODB_URI=mongodb://localhost:27017/
   MONGODB_NAME=hr_dashboard_db
   GEMINI_API_KEY=your_gemini_api_key   # Optional: set GEMINI_API_KEY and/or GROQ_API_KEY
   GEMINI_MODEL=gemini-2.5-flash        # Optional override (a model that is retired, slow or overloaded falls through to the next)
   GROQ_API_KEY=your_groq_api_key       # Optional
   GROQ_MODEL=llama-3.3-70b-versatile   # Optional override
   LLM_PROVIDER_ORDER=gemini,groq       # Optional: who is tried first
   ```
   `SECRET_KEY` is required when `DEBUG=False` (it also signs the JWTs). If the configured MongoDB is unreachable the backend falls back to `mongodb://localhost:27017/`.

5. Apply Django migrations (for SQLite session support):
   ```bash
   python manage.py migrate
   ```

6. Load the demo company (**drops every collection in the configured database first**, so it only runs when you pass `--yes`):
   ```bash
   python seed_data.py --yes
   python check_data.py        # verifies teams, managers, leaves, payroll, documents... (prints problems, if any)
   ```
   The seed creates **Kaveri Technologies Pvt. Ltd.** (Bengaluru, Hyderabad, Pune, Chennai): 49 active employees (every one in a team, with a department, manager and login), 8 former employees, 12 teams, 6 months of attendance, leaves, payslips, reviews, OKRs, training, a survey, recruitment, expenses, assets, helpdesk tickets and PDF documents. Everyone signs in as `first.last` with password `Northwind#2026` — e.g. `alexandra.reed` (Admin/CEO), `priya.nair` (Admin/HR), `sarah.kim` (Manager), `diego.alvarez` (Employee). It refuses a cloud (`mongodb+srv`) database unless `--allow-remote` is given.

   Money is in **rupees** (Indian digit grouping, lakh/crore), dates are day-first, the timezone is IST and the default holiday list is Indian (national holidays plus the main festivals; festival dates move every year, so HR confirms them in Settings > General > Holidays). Employee salaries are annual CTC.

7. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

   The backend API will be available at `http://localhost:8000`.

8. Run the backend tests (they create and drop a throw-away database on local MongoDB — never your real data):
   ```bash
   python run_tests.py
   ```
   Frontend unit tests: `cd frontend && npm test`. Browser tests: see [e2e/README.md](e2e/README.md). All three run in GitHub Actions (`.github/workflows/ci.yml`).

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`.

---

## 🗄️ MongoDB Collections

The application uses the following MongoDB collections in `hr_dashboard_db`:

| Collection | Purpose |
|---|---|
| `Users`, `Roles` | Login credentials, roles, employee linkage |
| `LoginAttempts` | Failed-login counters for lockout |
| `Employees`, `Departments`, `Teams`, `Documents` | People, structure and uploaded document metadata |
| `Attendance`, `Leaves`, `Payroll` | Time, leave and payslips |
| `Reviews`, `TeamReviews`, `ReviewPeriods`, `objectives`, `pips`, `Skills`, `SkillCatalog` | Performance and skills |
| `Courses`, `TrainingAssignments` | Training |
| `Surveys`, `SurveyResponses` | Surveys (anonymous responses carry no employee id) |
| `Offboarding` | Resignations and exit checklists |
| `jobs`, `candidates`, `ScreeningResults` | Recruitment board and saved resume screenings |
| `expenses`, `assets`, `helpdesk_tickets` | Operations |
| `Notifications`, `Settings`, `ChatLogs` | Alerts, organisation settings, chatbot transcripts |

---

## 🔌 API Reference

**Base URL:** `http://localhost:8000/api/` — every route needs `Authorization: Bearer <token>` except `auth/login/` and `health/`. `GET /api/` returns the list of mounted modules.

### Authentication (`/auth/`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login/` | Login with username & password → JWT |
| POST | `/auth/register/` | Create a user (Admin) |
| POST | `/auth/refresh/` | Exchange a valid token for a fresh one |
| GET/PUT | `/auth/profile/` | Own account |
| POST | `/auth/change-password/` | `{current_password, new_password}` |
| GET | `/auth/users/` | List users |
| PUT/PATCH · DELETE | `/auth/users/{id}/` · `/auth/users/{id}/delete/` | Update / delete user |
| POST | `/auth/users/{id}/reset-password/` | Reset a password |
| GET/POST · PUT/DELETE | `/auth/roles/` · `/auth/roles/{id}/` | Role management |

### Employees (`/employees/`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/employees/` | List (search, filter, paginate) |
| POST | `/employees/new/` | Create |
| GET | `/employees/{id}/` | Detail |
| PUT · PATCH · DELETE | `/employees/{id}/update/` · `/partial/` · `/delete/` | Update / delete |
| GET · POST | `/employees/{id}/documents/` · `/documents/upload/` | List / upload documents |
| GET · DELETE | `/employees/{id}/documents/{doc}/` · `/delete/` | Download / delete |
| GET/POST … | `/employees/departments/`, `/new/`, `/{id}/`, `/{id}/update/`, `/{id}/delete/`, `/{id}/employees/` | Departments |

### Attendance · Leaves · Payroll
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attendance/clock-in/` · `/attendance/clock-out/` | Clock in / out |
| GET | `/attendance/` · `/attendance/me/` · `/attendance/status/` · `/attendance/summary/` · `/attendance/daily/?date=` | Records |
| GET | `/attendance/month/?month=2026-10[&employee_id=]` | One person's month day by day with hours vs expected (own by default; HR anyone, managers their reports) |
| GET | `/attendance/overview/?from=&to=` | Everyone's (managers: the team's) hours worked vs expected, absent / short / late days and flags for a period (Admin/Manager) |
| PUT | `/attendance/expected-hours/{employee}/` | HR: hours per working day expected from one person (`{"hours": 6}`; `null` = company default) |
| POST | `/leaves/apply/` | Request leave |
| GET | `/leaves/` · `/leaves/me/` · `/leaves/pending/` · `/leaves/types/` · `/leaves/balance/{employee_id}/` | Lists and balance |
| PUT/POST | `/leaves/{id}/approve/` · `/reject/` · `/cancel/` | Decide / cancel |
| GET | `/payroll/me/` · `/payroll/summary/` | My payslips / monthly breakdown |
| GET | `/payroll/?period=September 2026` · `/payroll/run/?period=` | All payslips / status, totals and pre-release checks of a pay run (Admin) |
| POST | `/payroll/generate/` · `/payroll/release/` · `/payroll/mark-paid/` | Draft payslips / release to employees / mark paid and lock (Admin) |
| GET | `/payroll/export/?period=&kind=register\|bank\|statutory` | Payroll register, bank transfer file, PF/ESI/PT/TDS summary (Admin) |
| GET/POST | `/payroll/adjustments/` · `DELETE /payroll/adjustments/{id}/` | One-off earnings and deductions for a month (Admin) |
| GET/POST | `/payroll/salary/{employee}/` | CTC breakup and revision history; revise the CTC (Admin) |
| GET | `/payroll/payslip/{id}/` · `/payroll/payslip/{id}/pdf/` | Payslip on screen / PDF (owner once released, or Admin) |

### Performance, Teams, Operations
| Module | Endpoints |
|---|---|
| Reviews | `/reviews/`, `/reviews/me/`, `/reviews/assigned/me/`, `/reviews/{id}/`, `/reviews/{id}/submit/` |
| Performance | `/performance/pips/`, `/performance/pips/new/`, `/performance/pips/{id}/` |
| Objectives (OKRs) | `/objectives/`, `/objectives/new/`, `/objectives/{id}/`, `/objectives/{id}/progress/` |
| Skills | `/skills/`, `/skills/employee/{id}/`, `/skills/employee/{id}/update/` |
| Teams | `/teams/mongodb_list/`, `/teams/teams/mongodb_create/`, `/teams/teams/{id}/mongodb_update/` (+ DRF router) |
| Expenses · Assets · Helpdesk | `/expenses/`, `/assets/`, `/helpdesk/` and `/{id}/` (+ `/{id}/comment/` for expenses, helpdesk) |
| Recognition | `GET/POST /recognition/`, `GET /recognition/leaderboard/?period=month\|all`, `GET /recognition/me/` |
| Integrations (Admin) | `GET/POST /integrations/webhooks/`, `PUT/DELETE /integrations/webhooks/{id}/`, `POST .../{id}/test/`, `GET /integrations/employees/export/`, `POST /integrations/employees/import/?dry_run=true` |
| SSO (public) | `GET /auth/sso/providers/`, `GET /auth/sso/{google\|microsoft}/login/`, `GET /auth/sso/{provider}/callback/` |
| Survey templates | `GET /feedback/templates/` |
| Onboarding | `GET /onboarding/`, `POST /onboarding/start/`, `PUT /onboarding/{id}/tasks/{task}/` |
| Public (no login) | `GET /public/jobs/`, `POST /public/apply/`, `POST /public/chat/` |
| Payroll extras | `GET/PUT /payroll/bank/{employee}/` (bank, IFSC, PAN, UAN), `GET/POST /payroll/items/{employee}/`, `DELETE /payroll/items/{employee}/{item}/` |
| Training | `GET/POST /training/courses/`, `PUT/DELETE /training/courses/{id}/`, `POST /training/assign/`, `GET /training/mine/`, `GET /training/assignments/`, `PUT /training/assignments/{id}/`, `GET /training/recommendations/` |
| Surveys | `GET/POST /feedback/surveys/`, `GET /feedback/surveys/{id}/`, `POST .../respond/`, `PUT .../close/`, `GET .../results/` |
| Compliance | `GET /reports/compliance/`, `POST /reports/compliance/notify/` |
| Exit management | `GET/POST /offboarding/`, `PUT /offboarding/{id}/`, `PUT /offboarding/{id}/checklist/{item}/`, `GET /offboarding/analytics/` |
| Skill catalogue | `GET/PUT /skills/catalog/` |
| Notifications | `GET /notifications/`, `PUT /notifications/read-all/`, `PUT /notifications/{id}/read/`, `DELETE /notifications/{id}/` |
| Dashboard | `GET /dashboard/` (everything on the home page, scoped to the signed-in user) |
| Notifications | `GET /notifications/` (`?unread=true&category=&before=&limit=`), `GET /notifications/count/`, `PUT /notifications/read-all/`, `PUT /notifications/{id}/read/`, `DELETE /notifications/{id}/`, `DELETE /notifications/clear/` |
| Recruitment (Admin/Manager/HR) | `GET/POST /recruitment/jobs/`, `PUT/DELETE /recruitment/jobs/{id}/` (`DELETE ?with_candidates=1` removes its candidates and resumes too), `POST /recruitment/jobs/{id}/resumes/` (read up to 25 resumes), `GET/POST /recruitment/candidates/{id}/resume/` (download / attach), `GET/POST /recruitment/jobs/{id}/candidates/`, `POST /recruitment/jobs/{id}/candidates/parse/` (read a pasted list) and `/bulk/` (add the reviewed candidates), `PUT/DELETE /recruitment/candidates/{id}/`, `PUT /recruitment/candidates/{id}/stage/` |
| Settings | `GET /settings/` (any user), `PUT /settings/` (Admin) |

### AI (`/ai/`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/chatbot/` | HR chatbot `{message}` → `{reply, source}` |
| POST | `/ai/resume-screening/` | Gemini resume scoring |
| POST | `/ai/job-matching/` | `{job_id}` → ranked employees (skill overlap) |
| POST | `/ai/generate-job-description/` | `{title, department, skills, experience}` → description |
| GET/POST/DELETE | `/ai/resume-screening/history/` | Saved screening results |
| POST | `/ai/generate-review/` | `{employee_id}` → data-driven review draft |
| GET | `/ai/hr-analytics/` | The full HR analytics report (Admin) |
| GET/POST | `/ai/saved-reviews/` · `GET/PUT/DELETE /ai/saved-reviews/{id}/` · `GET /ai/my-reviews/` | Save, send and read AI performance reviews |
| GET | `/ai/providers/` | Configured AI providers, cooldowns, last error (staff) |
| GET | `/ai/dashboard/` · `/ai/engagement/` · `/ai/attrition-risk/` | KPIs, engagement proxy, attrition overview |
| GET | `/ai/talent-insights/{team,skills,growth,employees}/` · `/ai/talent-insights/employee/{id}/` | Talent insights |
| GET | `/ai/attendance-anomalies/` · `/ai/payroll-anomalies/` · `/ai/advanced-analytics/` | Anomalies and flight-risk / sentiment |
| POST | `/ai/find-employees-by-skills/` | `{skills: []}` → ranked employees |
| GET/POST | `/ai/team-stats/` · `/ai/team-reviews/` · `/ai/team-reviews/{team_id}/` | Team views |

---

## 🚀 Deploying

**Docker (one command):** create a `.env` next to `docker-compose.yml` with at least `SECRET_KEY` (32+ random characters), then

```bash
docker compose up --build
docker compose exec backend python create_admin.py --username admin --email you@company.com   # asks for a password
```

The app is on http://localhost:3000 and the API on http://localhost:8000. Set `PUBLIC_API_URL`, `FRONTEND_URL`, `SSO_BACKEND_URL` and `ALLOWED_HOSTS` when serving from a real domain; the AI, SSO and SMTP variables are optional (see `backend/.env.example`). *The Docker files are provided but could not be built in the environment they were written in, so treat the first build as a test.*

**Render + Vercel:** `backend/render.yaml` and `frontend/vercel.json` are ready; set the secrets listed in `.env.example`.

**First administrator:** on any fresh database run `python create_admin.py --username admin --email you@company.com` (creates the roles and an Admin with a linked employee profile; never overwrites existing users). `seed_data.py` creates *demo* data with weak demo passwords and refuses to run when `DEBUG=False` unless `--force` is given.

**Backups:** `python backup.py dump backups/2026-10-25` writes one JSON file per collection; `python backup.py restore backups/2026-10-25 --yes` replaces those collections. Copy the `media/` folder (uploaded documents) separately.

## 🛡️ Security notes

- Production needs `DEBUG=False` and a `SECRET_KEY` of at least 32 characters (the app refuses to start otherwise); the key also signs the login tokens.
- Passwords are stored only as salted PBKDF2 hashes (legacy unsalted hashes are upgraded at the next login); minimum length 8; 5 failed logins lock an account/IP pair for 15 minutes.
- Uploaded documents are limited to 10 MB and to document/image types, are stored under unique names and are only readable by the employee and HR.
- Webhook targets must be public addresses (SSRF guard); public careers endpoints are rate limited and trust `X-Forwarded-For`, so run behind a proxy that sets it.
- Dependencies are audited in CI (`npm audit`, `pip-audit`); both reported **no known vulnerabilities** at the time of writing. The front end builds with Vite (it replaced the unmaintained Create React App, which carried dozens of findings).

## 🔐 Single sign-on (Google / Microsoft)

Optional. People sign in with the identity provider, but **only if an account with the same verified e-mail already exists**
(nothing is auto-created, so SSO never grants access an admin hasn't given).

1. Create an OAuth client with Google (Cloud Console → Credentials) and/or an app registration with Microsoft (Entra ID).
2. Register this redirect URI: `<SSO_BACKEND_URL>/api/auth/sso/google/callback/` (or `.../microsoft/callback/`).
3. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and/or `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` (`MICROSOFT_TENANT`, default `common`), plus `SSO_BACKEND_URL` (public API URL) and `FRONTEND_URL`.
4. The login page shows a "Continue with …" button for every configured provider. The OAuth `state` is a short-lived signed token (CSRF protection).

## 🔌 Integrations

- **Webhooks** (Settings → Integrations, Admin): events `employee.created`, `employee.terminated`, `leave.requested`, `leave.approved`, `leave.rejected`, `payroll.generated`, `candidate.applied`. Each delivery is JSON `{id, event, timestamp, data}` with `X-HR-Signature: sha256=<HMAC-SHA256(body, secret)>`; the secret is shown once when the webhook is created. Targets must be public http(s) addresses (private, loopback and link-local hosts are rejected to prevent SSRF). Delivery is best-effort and the last result is shown per webhook.
- **Employee CSV**: export everyone (Admin) or import from a Workday / BambooHR / spreadsheet export. Required columns `first_name,last_name,email,employee_id`; optional `phone,position,department,hire_date,salary`. Existing employees are skipped, `dry_run` validates without writing, and imported people get an onboarding checklist.

## 📱 Mobile

The web app is installable (PWA): open it on a phone and choose "Add to home screen" / "Install". It has shortcuts for clock-in, leave and payslips and keeps the app shell available offline; **API data is never cached**.
## 🤖 Choosing an AI provider (Gemini, Groq or both)

Both are supported at the same time and you can configure either one or both:

| | Gemini | Groq |
|---|---|---|
| Strength | Very large context window (long resumes / documents), good structured output | Very fast, good for short chat replies |
| Models used | `GEMINI_MODEL` (default `gemini-2.5-flash`; if a model is retired, slow or overloaded the app tries `gemini-2.5-flash-lite` and `gemini-flash-lite-latest`, and remembers for five minutes which ones failed) | `GROQ_MODEL` (default `llama-3.3-70b-versatile`; `llama-3.1-8b-instant` has higher free limits) |
| Free-tier limits | Per-minute and per-day request caps | Per-minute request and token caps |

How the app uses them (`backend/utils/llm.py`):

- The order comes from `LLM_PROVIDER_ORDER` (default `gemini,groq`). Unconfigured providers are skipped.
- **Per task preference:** resume screening prefers Gemini (long documents); the HR chatbot and the public careers chatbot prefer Groq (speed).
- **Automatic fallback on limits:** when a provider answers HTTP 429 / quota exhausted it is put on a cooldown (using `Retry-After` when given) and the next provider answers the same request. Any other error also falls through to the next provider.
- If neither key is set, the features that can work without AI use templates/rules; resume screening returns a clear 503.
- `GET /api/ai/providers/` (staff) shows what is configured, the model names, cooldowns and the last error.

**Recommendation:** set both keys. Use Gemini first for document-heavy work and Groq first for chat if you want speed; with both configured a daily or per-minute limit on one never stops the app.

## 🤖 AI Features Detail

### Resume Screening
Upload a PDF/DOCX resume on the AI Tools page and let Gemini extract and score the candidate against the job's required skills (requires `GEMINI_API_KEY`).

### AI Performance Reviews
The AI Tools page includes a **Performance Review** generator. It gathers the employee's review scores, OKR progress, attendance, leave and skills and drafts strengths, improvement areas and ratings; when an LLM key is set the model writes the narrative from those facts (and a validator rejects anything that contradicts the data).

### Other AI features (all grounded in database facts, with a rule-based fallback)
- **Team review** — AI Tools › Performance Review › Team: ratings are pre-filled from real scores, the model writes the review (`POST /api/ai/generate-team-review/`).
- **Analytics briefing** — a short executive summary of headcount, attrition, attendance and payroll on the Analytics page (`POST /api/ai/insights-summary/`).
- **Development plan** — employee profile › Performance › *AI development plan*, with a 90-day plan and relevant courses (`POST /api/ai/development-plan/`).
- **Survey summary** — Surveys › Results › *Summarise with AI* (`POST /api/feedback/surveys/<id>/summary/`).
- **Job-match notes** — one-line explanations for each candidate/employee match.
- Every AI answer shows its source (provider name or *rule-based*), and employees can only ever ask about their own data.

### HR Chatbot
A floating chat widget available across all pages. With an LLM key it answers in natural language using the user's own data (profile, manager, team, leave balance, latest payslip, trainings, reviews) plus the company FAQ, and keeps the conversation history; without one it answers a fixed set of questions from data. Examples:
- *"How many leave days do I have left?"*
- *"Where is my payslip for July?"*
- *"What is the policy for work from home?"*

### Talent Insights
Computed in `ai_analytics/insights.py`. Attrition risk starts as a transparent rule set (tenure, review/OKR performance, active PIPs, leave days, hours worked, salary vs department median) and **switches to a trained logistic-regression model automatically** once 8+ exits are recorded in Exit Management (features as above; the page shows which model is active, its training accuracy and each employee's main risk drivers). High-potential employees come from performance and skill breadth.

### Job Matching & Skills Assessment
Job Matching ranks employees against a recruitment-board job by required-skill overlap. The Skills Assessment page uses a static role/skill catalogue and the real employee skill search.

---

## 🔐 Default Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access to all modules, user management, payroll |
| **Manager** | Team leaves, reviews, recruitment, payroll export, expenses/helpdesk resolution |
| **Employee** | View own data, submit leaves, clock in/out, chat with HR bot |

---

## 🗺️ Future Roadmap

- [ ] Better models once there is more history (the attrition model is a small logistic regression; candidate fit is a transparent score)
- [ ] A native mobile app (the PWA covers installs for now), deeper vendor-specific connectors (Workday, SAP, BambooHR) on top of the webhooks and CSV tools

---

## 📜 License

No license file has been added yet.