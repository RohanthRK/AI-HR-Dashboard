# AI-HR-Dashboard

A comprehensive, AI-powered HR Dashboard application built with **Django**, **React**, and **MongoDB**. Designed to modernize every aspect of Human Resources — from employee onboarding and leave management to AI-driven recruitment screening, performance reviews, and talent insights.

---

## 🚀 Features Overview

### Core HR Modules
| Module | Description |
|---|---|
| **Authentication** | JWT-based login, role-based access (Admin, Manager, Employee) |
| **Employee Management** | Full CRUD, profile editing, skills, certifications, document uploads |
| **Team Management** | Create/manage teams with assigned leads and members |
| **Attendance** | Clock-in/out, daily records, calendar view, WFH/half-day support |
| **Leave Management** | Request, approve, balance tracking, half-day leaves |
| **Payroll** | Salary breakdown, payslip PDF, CSV bulk export |
| **Performance & Reviews** | Review scheduling, OKR tracking, PIPs, My Reviews, Team Reviews |
| **Expenses** | Employee expense submission and approval workflow |
| **Assets** | Company asset tracking and employee assignment |
| **Helpdesk** | Support ticket submission, tracking, and HR resolution |
| **Notifications** | In-app alerts with badge counts and mark-as-read |
| **Advanced Analytics** | Headcount charts, attendance trends, payroll analytics |
| **Dashboard** | At-a-glance summary widgets and live KPIs |

### AI Features
| Feature | Status |
|---|---|
| **AI Resume Screening** | ✅ Gemini API-powered, async via Celery |
| **AI Performance Review Generator** | ✅ Draft generation from employee data |
| **Team Performance Review AI** | ✅ AI-generated team-level summaries |
| **HR Chatbot** | ✅ Embedded 24/7 chatbot (Gemini-backed) |
| **Job Matching** | ✅ Skill-alignment scoring for candidates/employees |
| **Skills Assessment** | ✅ AI gap analysis between skills and role requirements |
| **Talent Insights** | ✅ Attrition risk scoring, high performer identification |
| **Recruitment Pipeline UI** | ✅ Kanban-style candidate management |

---

## 🛠 Tech Stack

### Backend
- **Django** (Python web framework, no DRF — manual request/response parsing)
- **PyMongo** (Direct MongoDB connector)
- **PyJWT** (JSON Web Token authentication)
- **Celery + Redis** (Async background task processing)
- **Google Gemini API** (`google-generativeai`) for AI features
- **ReportLab** (PDF payslip generation)
- **PyPDF2 / python-docx** (Resume parsing)

### Frontend
- **React.js** (Single Page Application)
- **Material-UI (MUI)** (Component library)
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
│   ├── ai_analytics/         # AI tools: attrition, insights
│   ├── recruitment/          # Job postings, candidate pipeline
│   ├── expenses/             # Expense submission & approval
│   ├── assets/               # Asset tracking
│   ├── helpdesk/             # Support tickets
│   ├── objectives/           # OKR management
│   ├── notifications/        # In-app notification system
│   ├── chat/                 # AI chatbot backend
│   ├── reports/              # Analytics & report generation
│   ├── seed_data.py          # Database seeding script
│   ├── schemas.py            # MongoDB collection schemas
│   ├── reset_data.py         # Data reset utility
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
│   │   │   ├── expenses/     # Expense management
│   │   │   ├── assets/       # Asset management
│   │   │   ├── helpdesk/     # Support tickets
│   │   │   ├── objectives/   # OKR management
│   │   │   └── analytics/    # Advanced analytics
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
├── ImplementedFeatures.md
└── project-plan.md
```

---

## ⚙️ Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 16+
- MongoDB 6.0+ (local or Atlas)
- Redis (for Celery async tasks)

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
   SECRET_KEY=your_secret_key_here
   DEBUG=True
   MONGODB_URI=mongodb://localhost:27017/
   MONGODB_NAME=hr_dashboard_db
   GEMINI_API_KEY=your_gemini_api_key   # Optional: for AI features
   ```

5. Apply Django migrations (for SQLite session support):
   ```bash
   python manage.py migrate
   ```

6. Seed the database with sample data:
   ```bash
   python seed_data.py
   ```

7. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

   The backend API will be available at `http://localhost:8000`.

8. *(Optional)* Start Celery worker for async AI tasks:
   ```bash
   celery -A hr_backend worker --loglevel=info
   ```

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
| `Users` | Login credentials, roles, employee linkage |
| `Employees` | Core employee profiles and metadata |
| `Departments` | Department definitions |
| `Teams` | Team composition with manager/member mapping |
| `Attendance` | Daily clock-in/out records |
| `Leaves` | Leave requests, approvals, balances |
| `Payroll` | Monthly salary components and payslips |
| `Reviews` | Performance review submissions |
| `ReviewPeriods` | Scheduled review windows |
| `Objectives` | OKRs and key results |
| `Notifications` | In-app alert records |
| `AIInsights` | Attrition predictions, talent scores |
| `ChatLogs` | HR chatbot conversation transcripts |
| `JobDescriptions` | Role skill requirements for gap analysis |
| `EmployeeSkills` | Employee-to-skill proficiency mappings |
| `Candidates` | Recruitment pipeline with AI screening results |
| `expenses` | Employee expense submissions |
| `assets` | Company asset inventory |
| `helpdesk_tickets` | Support ticket records |

---

## 🔌 API Reference

**Base URL:** `http://localhost:8000/api/`

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login/` | Login with username & password |
| POST | `/auth/register/` | Register a new user account |
| GET | `/auth/profile/` | Get current user profile |
| PUT | `/auth/profile/` | Update profile |
| POST | `/auth/change-password/` | Change password |
| GET | `/auth/users/` | List all users (Admin only) |

### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/employees/` | List all employees (search, filter, paginate) |
| POST | `/employees/` | Create a new employee |
| GET | `/employees/{id}/` | Get employee by ID |
| PUT | `/employees/{id}/update/` | Full update |
| PATCH | `/employees/{id}/partial/` | Partial update |
| DELETE | `/employees/{id}/delete/` | Delete employee |
| GET | `/employees/{id}/documents/` | List employee documents |
| POST | `/employees/{id}/documents/upload/` | Upload document |

### Teams
| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams/` | List all teams |
| POST | `/teams/` | Create team |
| GET | `/teams/{id}/` | Get team detail |
| PUT | `/teams/{id}/` | Update team |
| DELETE | `/teams/{id}/` | Delete team |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/attendance/` | List attendance records |
| POST | `/attendance/clock-in/` | Clock in |
| POST | `/attendance/clock-out/` | Clock out |
| GET | `/attendance/me/` | My attendance records |

### Leaves
| Method | Endpoint | Description |
|---|---|---|
| POST | `/leaves/apply/` | Submit a leave request |
| GET | `/leaves/` | List all leaves |
| GET | `/leaves/me/` | My leave requests |
| GET | `/leaves/pending/` | Pending approvals |
| GET | `/leaves/balance/me/` | My leave balance |
| PUT | `/leaves/{id}/approve/` | Approve leave |
| PUT | `/leaves/{id}/reject/` | Reject leave |
| PUT | `/leaves/{id}/cancel/` | Cancel leave |

### Payroll
| Method | Endpoint | Description |
|---|---|---|
| GET | `/payroll/` | List payroll records |
| GET | `/payroll/{employeeId}/{month}/` | Get payslip |
| GET | `/payroll/export/` | Export payroll CSV |

### Reviews & Performance
| Method | Endpoint | Description |
|---|---|---|
| GET | `/reviews/` | List reviews |
| POST | `/reviews/` | Submit review |
| GET | `/reviews/me/` | My reviews |
| GET | `/performance/okrs/` | List OKRs |
| POST | `/performance/okrs/` | Create OKR |

### AI Tools
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/attrition/` | Run attrition prediction |
| POST | `/ai/parse-resume/` | Screen resume via Gemini |
| POST | `/chat/` | Send message to HR chatbot |

---

## 🤖 AI Features Detail

### Resume Screening
Upload a PDF/DOCX resume and let the Gemini API extract and score the candidate against the job's required skills. Results are stored in the `Candidates` collection. Async processing via Celery ensures the UI remains responsive.

### AI Performance Reviews
The AI Tools page includes a **Performance Review** generator powered by Gemini. Provide employee context (tenure, role, department) and receive a structured, professional performance review draft.

### HR Chatbot
A floating chat widget available across all pages, powered by Gemini. Employees can ask natural language questions like:
- *"How many leave days do I have left?"*
- *"Where is my payslip for July?"*
- *"What is the policy for work from home?"*

### Talent Insights
Attrition risk scoring and high-performer identification based on attendance patterns, leave usage, performance reviews, and tenure. Visualized as heatmaps and risk badges on the Talent Insights page.

### Job Matching & Skills Assessment
Skill-alignment scoring between candidate/employee skill profiles and open job requirements, surfaced through the Job Matching and Skills Assessment AI tool pages.

---

## 🔐 Default Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access to all modules, user management, payroll |
| **Manager** | View team leaves, approve/reject, run team reviews |
| **Employee** | View own data, submit leaves, clock in/out, chat with HR bot |

---

## 🗺️ Future Roadmap

- [ ] SSO / OAuth2 (Google, Microsoft) integration
- [ ] Mobile app (React Native)
- [ ] Slack & Microsoft Teams notifications
- [ ] Advanced on-premise AI models
- [ ] Voice-enabled clock-in / HR voice assistant
- [ ] Gamification (badges, leaderboards)
- [ ] Blockchain-backed attendance ledger
- [ ] Integration hub (Workday, SAP, BambooHR)

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.