# AI-HR-Dashboard — Project Plan

---

> **Status as of September 2026:** Core HR platform is feature-complete and deployed. AI integration is active. The focus going forward is on expanding AI capabilities, mobile readiness, and third-party integrations.

---

## 1. Project Vision

Build an end-to-end, AI-powered HR Dashboard that:
- Replaces manual HR workflows with smart, automated processes.
- Provides a **Django** backend exposing clean REST endpoints (no DRF — manual request/response parsing with `JsonResponse`).
- Provides a **ReactJS** SPA frontend with a modern, minimalist dark/light theme, glassmorphism UI, and Framer Motion animations.
- Uses **MongoDB** via **PyMongo** — no ORM, direct collection queries.
- Uses **Google Gemini API** for all AI features.
- Supports **role-based access control** (Admin, Manager, Employee) enforced at API and UI level.

---

## 2. Feature Areas & Implementation Status

### 2.1 Authentication & Authorization ✅
- JWT issuance on login, custom Django middleware for token verification.
- Role management (Admin, Manager, Employee) enforced at both backend and frontend.
- User provisioning portal (Signup.js) with dual-mode:
  - **Mode 1:** Full employee onboarding — creates Employee + User account simultaneously.
  - **Mode 2:** Link an existing unlinked employee to a new user account.
- Auto-generated employee IDs, usernames, and passwords with copy-to-clipboard support.
- Password change and profile update endpoints.

### 2.2 Employee Management ✅
- Full CRUD for employee profiles via `/api/employees/`.
- Department CRUD via `/api/employees/departments/`.
- Employee directory with search, sort, pagination.
- Employee profile page: personal info, work details, skills, education, certifications, documents.
- ManageSkillsModal for adding/removing skills from employee profiles.
- Document upload and download via multipart/form-data.
- ProfileEditModal for inline editing from the profile page.

### 2.3 Team Management ✅
- Create, edit, and delete teams.
- Assign team manager/lead (stored as `manager_id` on team document).
- Add/remove team members with live directory search.
- Team detail page with member cards and manager highlight.
- Teams list page with department grouping.

### 2.4 Attendance & Time Tracking ✅
- Clock-in / Clock-out with server-side timestamps.
- Daily status: Present, Absent, Late, Work From Home, Half-Day.
- Calendar view with color-coded attendance per day.
- Admin view of all attendance records across employees.
- Hours-worked calculation per record.

### 2.5 Leave Management ✅
- Employee submits leave request (type, dates, reason, half-day flag).
- Leave types: Earned Leaves (18/year), Loss of Pay (LOP).
- Manager and Admin can approve, reject, or cancel leaves.
- Leave balance computed on-the-fly from `Leaves` collection.
- Flexible employee ID resolution — handles ObjectId hex strings, business codes (EMP-XXXX), email, and user_id for matching.
- Pending approvals view for managers and admins.
- Leave cancellation by the employee.
- Notification inserted to `Notifications` collection on status change.

### 2.6 Payroll ✅
- Monthly payroll records per employee (base, HRA, allowances, deductions, net pay).
- Payslip PDF generation via ReportLab.
- Bulk payroll export to CSV.
- Admin payroll overview and per-employee payslip download.

### 2.7 Performance & Reviews ✅
- Review scheduling via ReviewPeriods collection.
- Manager-submitted performance reviews per employee per period.
- My Reviews page — employees see their own review history.
- Team Performance Review workflow.
- Employee Performance Review — deep drill-down per employee.
- My Performance Reports — employee self-service performance summary.

### 2.8 OKRs & PIPs ✅ (Performance module sub-tabs)
- **OKR Tab:** Create objectives, add key results, track progress with percentage updates, update status (On Track, At Risk, Behind, Completed).
- **PIP Tab:** Create PIPs for underperforming employees, set improvement goals and timelines, track acknowledgment.
- **Skills Tab:** View and manage employee skills within the performance context.

### 2.9 Expenses ✅
- Employee expense submission with category, amount, receipt description.
- Manager/Admin approval and rejection workflow.
- Expense list with status filtering.

### 2.10 Assets ✅
- Company asset catalog.
- Assign assets to employees.
- Asset listing with filter by type and assignment status.

### 2.11 Helpdesk / Support Tickets ✅
- Employees submit tickets with category and priority.
- HR/Admin resolves tickets with status updates (Open → In Progress → Resolved).
- Ticket listing with filters.

### 2.12 Notifications ✅
- In-app notification system with bell icon badge.
- Notifications inserted on leave status changes, ticket updates, etc.
- Mark-as-read and notification panel.
- NotificationContext for global state management.

### 2.13 Dashboard ✅
- Summary widgets: headcount, pending leaves, today's attendance, active teams.
- Recharts-powered visual analytics (bar charts, line charts).
- Role-aware content — employees see personal stats, admins see company-wide KPIs.

### 2.14 Advanced Analytics ✅
- Department-wise headcount distribution.
- Attendance rate trends over time.
- Leave utilization by department and type.
- Payroll trends (monthly net pay comparison).
- Custom filters by department and date range.

---

## 3. AI Features

### 3.1 AI Resume Screening ✅
- Upload PDF or DOCX resume in the Recruitment page.
- Gemini API extracts candidate profile and scores against job requirements.
- Async processing via Celery; status polling from frontend.
- Results (score, summary, matched skills) stored in `Candidates` collection.

### 3.2 AI Performance Review Generator ✅
- AI Tools → Performance Review page.
- User provides employee context (name, role, tenure, department, goals).
- Gemini generates a full structured performance review draft.
- Draft can be edited and submitted as an official review.

### 3.3 Team Performance Review AI ✅
- AI generates team-level performance summary from individual review data.
- Available to Managers and Admins.

### 3.4 HR Chatbot ✅
- Floating chat widget (`HRChatbot.js`) embedded globally across all pages.
- Powered by Gemini API via `/api/chat/`.
- Answers HR questions in natural language (leave balances, policies, payslips).
- Conversation transcripts stored in `ChatLogs` collection.

### 3.5 Job Matching ✅
- AI Tools → Job Matching page.
- Compares employee or candidate skill profiles to open job requirements.
- Returns match percentage and missing skills.

### 3.6 Skills Assessment ✅
- AI Tools → Skills Assessment page.
- Gap analysis between current employee skills and target role requirements.
- Generates a ranked list of skills to develop.

### 3.7 Talent Insights ✅
- AI Tools → Talent Insights page.
- Attrition risk scoring based on tenure, leave patterns, and attendance.
- High performer identification.
- Visual talent heatmaps.

---

## 4. MongoDB Collections

| Collection | Purpose |
|---|---|
| `Users` | Auth credentials, role, employee link |
| `Employees` | Core employee profiles |
| `Departments` | Department metadata |
| `Teams` | Team composition (manager, members) |
| `Attendance` | Daily clock-in/out records |
| `Leaves` | Leave requests and statuses |
| `Payroll` | Monthly salary components |
| `ReviewPeriods` | Scheduled review windows |
| `Reviews` | Individual review submissions |
| `Objectives` | OKRs and key results |
| `Notifications` | In-app alert records |
| `AIInsights` | AI model outputs (attrition scores, etc.) |
| `ChatLogs` | HR chatbot transcripts |
| `JobDescriptions` | Role skill requirements |
| `EmployeeSkills` | Employee-to-skill mappings |
| `Candidates` | Recruitment pipeline with AI screening |
| `expenses` | Expense records |
| `assets` | Asset inventory |
| `helpdesk_tickets` | Support ticket records |

---

## 5. Frontend Architecture

- **Framework:** React.js SPA, bootstrapped with Create React App.
- **Routing:** React Router v6 — role-aware route guards.
- **State:** React Context (AuthContext, NotificationContext) for global state; component-level `useState`/`useEffect` for local state.
- **Design System:** Material-UI (MUI) v5 with custom theme overrides for dark mode aesthetics.
- **Animations:** Framer Motion for sidebar toggle, page transitions, and micro-interactions.
- **Charts:** Recharts for all data visualizations.
- **HTTP:** Axios with interceptors for automatic JWT injection.

---

## 6. Backend Architecture

- **Framework:** Django 6.x (no DRF, no ORM for MongoDB).
- **Database:** PyMongo direct queries on MongoDB `hr_dashboard_db`.
- **Auth:** Custom `JWTAuthMiddleware` that decodes JWT on every request and attaches `request.user_id`, `request.role`, `request.employee_id`.
- **AI:** `google-generativeai` Python SDK for all Gemini calls.
- **Async:** Celery with Redis broker for long-running AI tasks (resume screening).
- **File Uploads:** Django's `FileResponse` + MEDIA_ROOT storage.
- **CORS:** `django-cors-headers` configured for `localhost:3000`.

---

## 7. Future Roadmap

| Priority | Feature |
|---|---|
| 🔴 High | SSO / OAuth2 (Google, Microsoft) |
| 🔴 High | Sentiment analysis on reviews and surveys |
| 🟡 Medium | Predictive attrition model (fine-tuned) |
| 🟡 Medium | Mobile app (React Native) |
| 🟡 Medium | Slack / Microsoft Teams notifications |
| 🟢 Low | Blockchain-backed attendance ledger |
| 🟢 Low | Gamification (badges, leaderboards) |
| 🟢 Low | Voice-enabled clock-in |
| 🟢 Low | Integration hub (Workday, SAP, BambooHR) |

---

*Last updated: September 2026*
