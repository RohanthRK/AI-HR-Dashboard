# Implemented Features Tracker

This file tracks the implementation status of all core and AI features across the AI-HR-Dashboard.

---

## Core HR Modules

### Authentication & Authorization
- [x] JWT-based login with username/password
- [x] Role-based access control (Admin, Manager, Employee)
- [x] Custom JWT middleware for protected routes
- [x] User registration / account provisioning
- [x] Profile update & password change
- [x] Dual-mode employee onboarding form (Full Onboarding + Link Existing Employee)
- [x] Auto-generated employee IDs, usernames, and passwords with copy support

### Employee Management
- [x] Full CRUD for employee profiles
- [x] Employee directory with search, filter, and pagination
- [x] Employee profile page with skills, education, certifications
- [x] Employee skills management (add/remove skills)
- [x] Document upload and download per employee
- [x] Department management (CRUD)
- [x] Employee–User account linking
- [x] Profile editing modal with real-time updates

### Team Management
- [x] Create, edit, and delete teams
- [x] Assign manager/team lead per team
- [x] Team member management (add/remove members)
- [x] Team detail view with member cards
- [x] Teams list with department grouping

### Attendance & Time Tracking
- [x] Clock-in / Clock-out with timestamps
- [x] Daily attendance records with status (Present, Absent, Late, WFH, Half-Day)
- [x] Attendance calendar view with color-coded days
- [x] Hours worked calculation
- [x] Admin view of all employee attendance records

### Leave Management
- [x] Employee leave request submission (Earned Leaves, LOP)
- [x] Half-day leave support
- [x] Leave approval / rejection by Manager or Admin
- [x] Leave balance calculation (entitlement, used, pending, remaining)
- [x] Leave cancellation
- [x] Manager pending approvals queue
- [x] Robust employee ID resolution (by ObjectId, business code, email)

### Payroll
- [x] Monthly payroll records per employee
- [x] Salary breakdown (base, allowances, deductions, net pay)
- [x] Payslip PDF generation
- [x] Bulk payroll CSV export
- [x] Admin payroll management view

### Performance & Reviews
- [x] Performance review scheduling (ReviewPeriods)
- [x] Manager-submitted performance reviews
- [x] My Reviews page (employee self-view)
- [x] Team performance review workflow
- [x] OKR (Objectives & Key Results) tab – create, track, and update OKRs
- [x] PIP (Performance Improvement Plans) tab – create and manage PIPs
- [x] Skills tab within performance view
- [x] My Performance Reports page

### Objectives (OKR)
- [x] Create and manage personal and team objectives
- [x] Key result tracking with progress bars
- [x] Status updates (On Track, At Risk, Behind, Completed)

### Expenses
- [x] Employee expense submission
- [x] Expense approval / rejection workflow
- [x] Expense listing with filtering

### Assets
- [x] Company asset tracking
- [x] Asset assignment to employees
- [x] Asset listing and detail view

### Helpdesk / Support Tickets
- [x] Employee ticket submission
- [x] Ticket status tracking (Open, In Progress, Resolved)
- [x] HR/Admin ticket management view

### Notifications
- [x] In-app notification system
- [x] Bell icon badge with unread count
- [x] Leave update notifications
- [x] Notifications panel with mark-as-read

### Dashboard
- [x] Employee headcount widget
- [x] Pending leave approvals widget
- [x] Recent attendance summary
- [x] Quick-stats overview cards
- [x] Interactive charts (Recharts)

### Advanced Analytics
- [x] Department headcount charts
- [x] Attendance rate over time
- [x] Leave utilization analysis
- [x] Payroll trends
- [x] Custom analytics filters by department and date range

---

## AI & Intelligent Features

### 1) Recruitment
- [x] **AI Resume Screening** – Gemini API parses uploaded resumes and scores candidates against job requirements; async via Celery
- [x] **Recruitment Pipeline UI** – Kanban-style candidate status board (Applied → Screening → Interview → Offer → Hired)
- [ ] AI-based job description generation
- [ ] Predict which candidates are likely to succeed

### 2) Onboarding
- [ ] Automate document verification
- [ ] AI-powered onboarding FAQs (chatbot for new hires)

### 3) Attendance & Leave
- [ ] Auto-anomaly detection (flag suspicious clock-ins/outs)
- [ ] Predict absenteeism trends

### 4) Payroll
- [ ] Automate salary calculations based on hours worked
- [ ] AI to predict payroll errors before run

### 5) Performance Reviews
- [x] **AI Performance Review Generator** – Gemini generates structured performance review drafts based on employee data and tenure
- [x] **Team Performance Review AI** – AI-generated team-level review summaries
- [ ] Analyze feedback sentiment
- [ ] Predict top performers early using trends

### 6) Training & Development
- [ ] Recommend personalized training based on skills gap analysis
- [ ] Identify employees who need help before performance drops

### 7) Employee Engagement
- [ ] Sentiment analysis of surveys / feedback
- [ ] AI to detect patterns in complaints/issues before they escalate

### 8) Compliance
- [ ] Monitor documents for expiry (visas, certifications)
- [ ] Alert for missing mandatory trainings

### 9) Exit Management
- [ ] Predict attrition risks early
- [ ] Automate exit surveys and analyze them

### 10) HR Chatbot
- [x] **HR AI Chatbot** – Embedded chat widget (HRChatbot.js) powered by Gemini for 24/7 HR Q&A (leave balances, policies, payslips)
- [x] Chat transcript logging in ChatLogs collection

### AI Tools Page (Additional AI Features)
- [x] **Job Matching** – Match employees or candidates to open positions using skill alignment scoring
- [x] **Skills Assessment** – AI-powered gap analysis between employee skills and role requirements
- [x] **Talent Insights** – Attrition risk scoring, high performer identification, and talent heatmaps
- [x] **Resume Screening** – Upload and screen multiple resumes with instant AI scoring

---

## Upcoming / Backlog
- [ ] SSO / OAuth2 integration
- [ ] Mobile app (React Native / Flutter)
- [ ] Slack / Teams notifications integration
- [ ] Advanced AI: on-premise transformer models
- [ ] Voice-enabled clock-in
- [ ] Gamification (badges, leaderboards)