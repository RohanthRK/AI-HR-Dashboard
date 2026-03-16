**AI-HR-Dashboard Project Plan for Cursor AI**

---

This document serves as a detailed blueprint for **Cursor AI** to generate an end‑to‑end AI‑powered HR Dashboard. It describes each feature, database collection, and frontend design in depth—with modern, minimalist aesthetics and maximum functionality.

## 1. Project Vision & Input to Cursor

Provide this plan verbatim to Cursor AI. It should build:
- A **Django** backend exposing clean REST endpoints (no DRF serializers; implement manual request/response parsing and validation).
- A **ReactJS** frontend as a Single‑Page Application (SPA) with a modern, minimalist look: ample white space, intuitive iconography, and feature‑rich, modular components.
- A **MongoDB** database accessed via **PyMongo**, with dedicated collections for every distinct domain object.


## 2. Detailed Feature Descriptions

### 2.1 Authentication & Authorization
- **Login / JWT Issuance:** Endpoint `POST /api/auth/login` accepts JSON with username/password, validates credentials, returns JWT.
- **Role Management:** Endpoints for assigning roles (Admin, Manager, Employee) under `/api/auth/roles`. No serializers—use manual `json.loads` and `JsonResponse`.
- **Token Middleware:** Custom Django middleware to verify JWT on protected routes.

### 2.2 Employee Management
- **Employee CRUD:** Endpoints `/api/employees`: GET (list/filter), POST (create), PUT (full update), PATCH (partial update), DELETE.
- **Profile Document Uploads:** Handle multipart/form-data at `/api/employees/{id}/documents`. Store file metadata in a dedicated **Documents** collection.
- **Role & Department Assignment:** Drop‑down selectors on frontend populated via `/api/departments` and `/api/roles`.

### 2.3 Attendance & Time Tracking
- **Clock-In/Clock-Out:** Two buttons triggering `POST /api/attendance/clock-in` and `/clock-out`, recording timestamps.
- **Location Verification:** Optional geolocation on frontend; store `latitude`, `longitude`, `ip_address` in **Attendance** collection.
- **Calendar View:** React calendar grid component showing days with colored dots (green present, red absent).

### 2.4 Leave Management
- **Request Flow:** Employee calls `POST /api/leaves/request`, supplying type, dates, reason. Manager views `/api/leaves/pending` and approves/rejects via `PUT /api/leaves/{id}`.
- **Balance Calculation:** Compute leave balances on the fly by aggregating approved leaves from **Leaves** collection.
- **Notification:** Insert notifications into a **Notifications** collection; frontend displays a bell icon badge.

### 2.5 Performance Reviews
- **Review Scheduling:** Admin creates review windows via `POST /api/reviews/schedule`. Stored in **ReviewPeriods** collection.
- **Feedback Submission:** Managers and peers submit feedback to `/api/reviews/{periodId}/feedback`, storing documents in **Reviews**.
- **Score Aggregation:** Compute average scores in an **Analytics** collection for quick dashboard display.

### 2.6 Payroll Overview
- **Salary Data:** Store components in **Payroll** collection. Endpoint `/api/payroll/{employeeId}/{month}` returns JSON breakdown.
- **Payslip Generation:** Backend uses a PDF library (ReportLab) to render payslip; stores `pdf_url` in **Documents**.
- **Bulk Export:** Endpoint `/api/payroll/export?month=YYYY-MM` generates a CSV and places metadata in **Exports** collection.

### 2.7 AI & Analytics Module
- **Attrition Prediction:** Trigger `POST /api/ai/attrition` to run the model, storing results in **AIInsights**.
- **Sentiment Analysis:** Pipeline ingests feedback text from **Reviews**, runs NLP, writes results back.
- **Skill-Gap Analysis:** Compare required vs. existing skills from **JobDescriptions** and **EmployeeSkills** collections.
- **Resume Parsing:** Endpoint `/api/ai/parse-resume` accepts a PDF, extracts structured fields into **Candidates**.

### 2.8 Notifications & Alerts
- **In-App Alerts:** Store each alert in **Notifications** with fields: `userId`, `type`, `message`, `read`.
- **Email Integration:** Django SMTP tasks send mails asynchronously (Celery) when key events occur.

### 2.9 Reports & Dashboards
- **Custom Charts:** Frontend uses a chart library (Recharts) to display data from `/api/reports/*`.
- **Export Options:** Buttons to download PNG/PDF via canvas capture or backend image rendering.

### 2.10 AI Chat Assistant
- **Chat Widget:** Floating React component that opens a chat UI.
- **Backend Proxy:** `/api/chat` forwards queries to an NLP model (e.g., OpenAI/Gemini) and logs transcripts in **ChatLogs**.


## 3. MongoDB Collections (Expanded)

1. **Users**: Authentication credentials and role link.
2. **Roles**: Role definitions with permissions matrix.
3. **Departments**: Department metadata.
4. **Employees**: Core employee profiles.
5. **Documents**: File metadata (type, URL, uploadDate, ownerRef).
6. **Attendance**: Clock-in/out records with location.
7. **Leaves**: Leave requests and statuses.
8. **ReviewPeriods**: Scheduled performance review windows.
9. **Reviews**: Individual feedback entries.
10. **Payroll**: Monthly salary components and net pay.
11. **Exports**: Tracking CSV/Excel export jobs.
12. **Notifications**: In-app alert records.
13. **AIInsights**: Results of attrition, sentiment, training models.
14. **ChatLogs**: Transcripts of AI assistant conversations.
15. **JobDescriptions**: Role requirements for skill analysis.
16. **EmployeeSkills**: Mappings of employee to skills level.
17. **Candidates**: Parsed resume data for onboarding.
18. **Settings**: System‑wide configuration (leave types, review criteria).


## 4. Frontend Page & Component Design

- **Global Layout:** 
  - Top nav bar with brand logo, user avatar dropdown, notifications icon.
  - Left sidebar collapsible menu (icons + labels).
  - Content area with card‑based modules.

- **Color & Typography:** 
  - Neutral base (white/light gray), accent color for CTAs.
  - Sans‑serif font, clear hierarchy: H1 (xl), H2 (lg), body (base).

- **Key Pages:**
  1. **Login**: Centered card, only essential fields.
  2. **Dashboard**: Grid of widgets (headcount, attrition gauge, pending leaves).
  3. **Directory**: Table with search, inline filters, profile drawer slide‑out.
  4. **Attendance**: Calendar Component + Live clock status.
  5. **Leaves**: Request form modal, approval queue list view.
  6. **Reviews**: Timeline view of periods, expandable feedback panels.
  7. **Payroll**: Month selector, salary breakdown cards.
  8. **Analytics**: Filter toolbar + chart panels (line, bar, radar).
  9. **Chat Assistant**: Persisted conversation sidebar.
  10. **Settings**: Tabbed interface for system config.

- **Interactions:** 
  - Hover states on buttons/cards.
  - Transitions for sidebar toggle (Framer Motion).
  - Lazy‑load heavy charts.


## 5. Future Scope

1. **Mobile App:** React Native or Flutter client using same APIs.
2. **Single Sign‑On (SSO):** OAuth2 / SAML integration.
3. **Advanced AI:** Custom transformer models on‑premise.
4. **Integration Hub:** Connect to Slack, Teams, Workday, SAP.
5. **Voice Interface:** Voice‑enabled clock‑in and voice‑bot.
6. **Blockchain Records:** Immutable attendance ledger.
7. **Gamification:** Employee engagement badges and leaderboards.

---

*Cursor AI, please consume this plan to scaffold files, API endpoints, React components, and MongoDB collection definitions. Ready to generate code!*

