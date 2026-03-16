# AI-HR-Dashboard

A comprehensive HR dashboard application with AI-powered analytics, built with Django, React, and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Employee Management**: Complete CRUD operations for employee profiles
- **Attendance & Time Tracking**: Clock-in/out functionality with location verification
- **Leave Management**: Request, approve, and track employee leave
- **Performance Reviews**: Schedule and manage employee performance reviews
- **Payroll Overview**: View salary components and generate payslips
- **AI & Analytics**: Attrition prediction, sentiment analysis, and skill-gap analysis
- **Notifications & Alerts**: In-app notifications for important events
- **Reports & Dashboards**: Custom charts and data visualization
- **AI Chat Assistant**: Intelligent chat support for HR questions
- **Project & Task Management**: Track projects and tasks across teams

## Recent Updates

- **Employee Management Enhancements**:
  - Added employee creation functionality with a comprehensive form
  - Implemented employee profile editing with real-time data updates
  - Improved employee directory with pagination for better performance
  - Ensured employee profiles display correct data based on employee ID
  
- **UI Improvements**:
  - Added direct editing of employee profiles from the employee detail page
  - Implemented employee skills display with chip components
  - Added document upload placeholders in employee profiles

- **Backend Enhancements**:
  - Standardized CRUD API for all MongoDB collections
  - Improved data validation for all collections
  - Enhanced query capabilities with search, filtering, and pagination
  - Better MongoDB integration with proper ObjectId handling
  - Added comprehensive test data for all collections
  - Added detailed API documentation with request/response formats

## Tech Stack

### Backend
- Django (Python web framework)
- PyMongo (MongoDB connector)
- JWT for authentication
- Celery for asynchronous tasks
- ReportLab for PDF generation

### Frontend
- React.js
- Material-UI for component library
- React Router for navigation
- Axios for API requests
- Recharts for data visualization
- Framer Motion for animations

### Database
- MongoDB (NoSQL database)

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- MongoDB

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start MongoDB (if not running):
   ```
   # Start MongoDB locally or use a cloud service
   ```

5. Create a `.env` file with the following variables (for development):
   ```
   SECRET_KEY=your_secret_key
   DEBUG=True
   MONGODB_URI=mongodb://localhost:27017/
   MONGODB_NAME=hr_dashboard_db
   ```

6. Initialize the database with sample data:
   ```
   # Make sure you're in the root directory
   cd ..
   python init_db.py
   ```

7. Apply Django migrations:
   ```
   cd backend
   python manage.py migrate
   ```

8. Start the Django server:
   ```
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Access the application at `http://localhost:3000`

## Database Collections

The MongoDB database consists of the following collections:

### employees
Stores employee information.
```json
{
  "_id": "ObjectId",
  "employee_id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "city": "string", 
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "emergency_contact": {
    "name": "string",
    "relationship": "string",
    "phone": "string"
  },
  "department_id": "ObjectId", 
  "position": "string",
  "status": "string", // "active", "on_leave", "terminated"
  "hire_date": "date",
  "employment_type": "string", // "full_time", "part_time", "contractor", "intern"
  "manager_id": "ObjectId",
  "salary": "number",
  "bank_info": {
    "account_number": "string",
    "routing_number": "string",
    "bank_name": "string"
  },
  "documents": [{
    "doc_id": "ObjectId",
    "name": "string",
    "path": "string",
    "category": "string",
    "upload_date": "date",
    "description": "string",
    "is_confidential": "boolean",
    "tags": ["string"]
  }],
  "skills": ["string"],
  "education": [{
    "degree": "string",
    "institution": "string",
    "field_of_study": "string",
    "start_date": "date",
    "end_date": "date",
    "gpa": "number"
  }],
  "certifications": [{
    "name": "string",
    "issuing_organization": "string",
    "issue_date": "date",
    "expiration_date": "date"
  }],
  "created_at": "date",
  "updated_at": "date",
  "created_by": "string",
  "updated_by": "string"
}
```

### departments
Stores department information.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "manager_id": "ObjectId",
  "parent_department_id": "ObjectId",
  "budget": "number",
  "location": "string",
  "created_at": "date",
  "updated_at": "date"
}
```

### attendance
Tracks employee attendance.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "date": "date",
  "check_in": "datetime",
  "check_out": "datetime",
  "status": "string", // "present", "absent", "late", "half_day", "work_from_home"
  "hours_worked": "number",
  "location": {
    "latitude": "number",
    "longitude": "number",
    "address": "string"
  },
  "notes": "string",
  "created_at": "date",
  "updated_at": "date"
}
```

### leaves
Stores leave request information.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "start_date": "date",
  "end_date": "date",
  "return_date": "date",
  "total_days": "number",
  "leave_type": "string", // "annual", "sick", "family", "unpaid", "maternity", "paternity"
  "status": "string", // "pending", "approved", "rejected", "cancelled"
  "reason": "string",
  "approver_id": "ObjectId",
  "approval_date": "date",
  "rejection_reason": "string",
  "attachments": [{
    "name": "string",
    "path": "string",
    "upload_date": "date"
  }],
  "created_at": "date",
  "updated_at": "date"
}
```

### reviews
Stores performance review information.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "reviewer_id": "ObjectId",
  "review_period": "string", // "2023-Q1", "2023-H1"
  "review_date": "date",
  "status": "string", // "draft", "submitted", "reviewed", "acknowledged"
  "ratings": {
    "performance": "number", // 1-5
    "communication": "number",
    "teamwork": "number",
    "leadership": "number",
    "technical_skills": "number",
    "overall": "number"
  },
  "comments": {
    "achievements": "string",
    "areas_for_improvement": "string",
    "goals": "string",
    "reviewer_comments": "string",
    "employee_comments": "string"
  },
  "next_review_date": "date",
  "created_at": "date",
  "updated_at": "date"
}
```

### projects
Stores project information.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "manager_id": "ObjectId",
  "start_date": "date",
  "end_date": "date",
  "status": "string", // "planning", "in_progress", "on_hold", "completed", "cancelled"
  "priority": "string", // "low", "medium", "high", "critical"
  "budget": "number",
  "budget_spent": "number",
  "client": {
    "name": "string",
    "contact_person": "string",
    "email": "string",
    "phone": "string"
  },
  "team_members": ["ObjectId"], // employee IDs
  "created_at": "date",
  "updated_at": "date"
}
```

### tasks
Stores task information.
```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string",
  "project_id": "ObjectId",
  "assigned_to": "ObjectId", // employee ID
  "assigned_by": "ObjectId", // employee ID
  "start_date": "date",
  "due_date": "date",
  "completion_date": "date",
  "status": "string", // "todo", "in_progress", "review", "done", "blocked"
  "priority": "string", // "low", "medium", "high", "urgent"
  "estimated_hours": "number",
  "actual_hours": "number",
  "dependencies": ["ObjectId"], // task IDs
  "attachments": [{
    "name": "string",
    "path": "string",
    "upload_date": "date"
  }],
  "comments": [{
    "user_id": "ObjectId",
    "text": "string",
    "timestamp": "datetime"
  }],
  "created_at": "date",
  "updated_at": "date"
}
```

### time_entries
Stores time tracking information.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "project_id": "ObjectId",
  "task_id": "ObjectId",
  "date": "date",
  "hours": "number",
  "description": "string",
  "billable": "boolean",
  "approved": "boolean",
  "approver_id": "ObjectId",
  "created_at": "date",
  "updated_at": "date"
}
```

### users
Stores user authentication information.
```json
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "password": "string (hashed)",
  "role": "string", // "admin", "hr", "manager", "employee"
  "employee_id": "ObjectId",
  "last_login": "datetime",
  "status": "string", // "active", "inactive", "locked"
  "permissions": ["string"],
  "created_at": "date",
  "updated_at": "date"
}
```

### recruitment
Stores recruitment information.
```json
{
  "_id": "ObjectId",
  "job_title": "string",
  "department_id": "ObjectId",
  "description": "string",
  "requirements": "string",
  "status": "string", // "open", "closed", "on_hold"
  "posting_date": "date",
  "closing_date": "date",
  "salary_range": {
    "min": "number",
    "max": "number"
  },
  "location": "string",
  "employment_type": "string", // "full_time", "part_time", "contract"
  "candidates": [{
    "candidate_id": "ObjectId",
    "name": "string",
    "email": "string",
    "phone": "string",
    "resume_url": "string",
    "application_date": "date",
    "status": "string", // "applied", "screening", "interview", "offer", "rejected", "hired"
    "interview_notes": "string",
    "rating": "number", // 1-5
    "ai_screening_status": "string", // Optional: "pending", "queued", "screening", "screened", "error"
    "ai_screening_score": "number",  // Optional: Score from AI screening (e.g., 1-10)
    "ai_screening_summary": "string" // Optional: Brief summary/justification from AI
  }],
  "created_at": "date",
  "updated_at": "date"
}
```

### training
Stores training course information.
```json
{
  "_id": "ObjectId",
  "title": "string",
  "description": "string",
  "category": "string",
  "provider": "string",
  "duration": "number", // in hours
  "cost": "number",
  "format": "string", // "online", "in_person", "hybrid"
  "location": "string",
  "start_date": "date",
  "end_date": "date",
  "status": "string", // "upcoming", "in_progress", "completed", "cancelled"
  "max_participants": "number",
  "current_participants": "number",
  "materials": [{
    "name": "string",
    "path": "string"
  }],
  "created_at": "date",
  "updated_at": "date"
}
```

### training_enrollments
Tracks employee training enrollments.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "course_id": "ObjectId",
  "enrollment_date": "date",
  "status": "string", // "enrolled", "in_progress", "completed", "dropped"
  "completion_date": "date",
  "certificate_url": "string",
  "score": "number",
  "feedback": "string",
  "created_at": "date",
  "updated_at": "date"
}
```

### notifications
Stores user notifications.
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "title": "string",
  "message": "string",
  "type": "string", // "info", "warning", "alert", "success"
  "related_to": "string", // "leave", "attendance", "review", etc.
  "related_id": "ObjectId",
  "link": "string",
  "read": "boolean",
  "read_at": "datetime",
  "priority": "string", // "low", "medium", "high"
  "created_at": "date"
}
```

### skills
Stores skill information.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "category": "string", // "technical", "soft", "language", etc.
  "description": "string",
  "created_at": "date",
  "updated_at": "date"
}
```

### employee_skills
Stores employee skill mappings.
```json
{
  "_id": "ObjectId",
  "employee_id": "ObjectId",
  "skill_id": "ObjectId",
  "proficiency_level": "number", // 1-5
  "years_experience": "number",
  "endorsed_by": ["ObjectId"], // employee IDs who endorsed
  "verified": "boolean",
  "verified_by": "ObjectId",
  "verification_date": "date",
  "created_at": "date",
  "updated_at": "date"
}
```

## API Reference

The API is organized around RESTful resources with standard HTTP methods. All responses are in JSON format. The following is a comprehensive reference of all available endpoints:

### Health Check
- **GET /api/health/**
  - Simple health check endpoint to verify API availability
  - Response: `{"status": "ok"}`

### API Root
- **GET /api/**
  - API root with documentation of all available endpoints
  - Returns a list of all API endpoints with their paths and detailed documentation

### Authentication
- **POST /api/auth/login/**
  - Login with username and password
  - Request Body: `{"username": string, "password": string}`
  - Response: `{"token": string, "user": {user_data}}`

- **POST /api/auth/register/**
  - Register a new user
  - Request Body: `{"username": string, "email": string, "password": string, ...}`
  - Response: `{"message": "User registered successfully", "user_id": string}`

- **POST /api/auth/logout/**
  - Logout current user
  - Requires Authentication: Yes
  - Response: `{"message": "Logged out successfully"}`

- **GET /api/auth/profile/**
  - Get current user profile
  - Requires Authentication: Yes
  - Response: `{user_profile_data}`

- **PUT /api/auth/profile/**
  - Update current user profile
  - Requires Authentication: Yes
  - Request Body: `{updated_profile_data}`
  - Response: `{"message": "Profile updated successfully", ...updated_data}`

- **POST /api/auth/change-password/**
  - Change user password
  - Requires Authentication: Yes
  - Request Body: `{"current_password": string, "new_password": string}`
  - Response: `{"message": "Password changed successfully"}`

### Employees
- **GET /api/employees/**
  - Lists all employees with optional filtering, sorting, and pagination
  - Query Parameters:
    - `search`: Text search across employee fields (name, email, ID)
    - `page`: Page number (default: 1)
    - `limit`: Results per page (default: 100)
    - `sort`: Field to sort by (default: '_id')
    - `order`: Sort direction ('asc' or 'desc')
    - Any field name can be used as a filter parameter
  - Response: `{"results": [...], "count": number, "page": number, "limit": number, "pages": number, "has_next": boolean, "has_prev": boolean}`
  - Notes: 
    - If no employees exist, creates sample employee data
    - Automatically adds department names based on department_id

- **GET /api/employees/{employee_id}/**
  - Retrieves a single employee by ID
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Response: `{employee_data}`
  - Error Responses:
    - 404: Employee not found
    - 500: Server error

- **POST /api/employees/**
  - Creates a new employee record
  - Request Body: 
    ```
    {
      "first_name": string (required),
      "last_name": string (required),
      "email": string (required),
      "employee_id": string (required),
      "department_id": string (optional),
      "position": string (optional),
      "phone": string (optional),
      "address": string (optional),
      "hire_date": string (optional),
      "employment_status": string (optional, default: "Active"),
      ... additional fields
    }
    ```
  - Response: `{"message": "Employee created successfully", "id": string, "_id": string, ...employee_data}`
  - Error Responses:
    - 400: Invalid request (missing required fields or invalid JSON)
    - 500: Server error
  - Notes:
    - Automatically adds timestamps (created_at, updated_at)
    - Converts department_id to ObjectId for MongoDB
    - Ensures status/employment_status field consistency

- **PUT /api/employees/{employee_id}/update/**
  - Updates an employee record (full update)
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Request Body: Complete employee object with all fields
  - Response: `{"message": "Employee updated successfully", ...updated_data}`
  - Error Responses:
    - 404: Employee not found
    - 400: Invalid request data
    - 500: Server error
  - Notes:
    - Requires all fields to be provided (full replacement)
    - Updates 'updated_at' timestamp automatically

- **PATCH /api/employees/{employee_id}/partial/**
  - Updates an employee record (partial update)
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Request Body: Partial employee object with only fields to update
  - Response: `{"message": "Employee updated successfully", ...updated_data}`
  - Error Responses:
    - 404: Employee not found
    - 400: Invalid request data
    - 500: Server error
  - Notes:
    - Only updates the fields provided in the request
    - Updates 'updated_at' timestamp automatically

- **DELETE /api/employees/{employee_id}/delete/**
  - Deletes an employee record
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Response: `{"message": "Employee deleted successfully"}`
  - Error Responses:
    - 404: Employee not found
    - 500: Server error
  - Notes:
    - Does not perform a soft delete; completely removes the record
    - Associated documents are not automatically deleted

- **GET /api/employees/debug/**
  - Debug endpoint to directly return all employees
  - Query Parameters: `direct_access` - Set to 'true' to attempt direct database access (optional)
  - Response: `{"count": number, "employees": [...], "debug_info": {...}}`
  - Notes:
    - This is a diagnostic endpoint intended for troubleshooting only
    - Returns all employee records without pagination
    - If no employees exist, creates sample employee data
    - Includes detailed debug logging

### Employee Documents
- **GET /api/employees/{employee_id}/documents/**
  - Lists documents for an employee
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Query Parameters: `category` - Filter by document category (optional)
  - Response: `{"count": number, "documents": [...]}`
  - Error Responses:
    - 404: Employee not found
    - 500: Server error

- **POST /api/employees/{employee_id}/documents/upload/**
  - Uploads a document for an employee
  - Path Parameters: `employee_id` - Employee's unique identifier
  - Form Data:
    - `file`: Document file (required)
    - `name`: Document name (optional, defaults to file name)
    - `description`: Document description (optional)
    - `category`: Document category (optional, default: "general")
    - `is_confidential`: Boolean flag (optional, default: false)
    - `tags`: Comma-separated list of tags (optional)
  - Response: `{"message": "Document uploaded successfully", "document_id": string}`
  - Error Responses:
    - 404: Employee not found
    - 400: No file uploaded
    - 500: Server error
  - Notes:
    - Files are stored in: {MEDIA_ROOT}/documents/{employee_id}/
    - Document metadata is stored in the documents collection

- **GET /api/employees/{employee_id}/documents/{document_id}/**
  - Downloads a document for an employee
  - Path Parameters: 
    - `employee_id`: Employee's unique identifier
    - `document_id`: Document's unique identifier
  - Response: File content with appropriate content-type header
  - Error Responses:
    - 404: Employee or document not found
    - 500: Server error
  - Notes:
    - Returns the file content directly with the appropriate MIME type
    - Content-Disposition header is set for browser download

- **DELETE /api/employees/{employee_id}/documents/{document_id}/delete/**
  - Deletes a document for an employee
  - Path Parameters:
    - `employee_id`: Employee's unique identifier
    - `document_id`: Document's unique identifier
  - Response: `{"message": "Document deleted successfully", "document_id": string}`
  - Error Responses:
    - 404: Employee or document not found
    - 500: Server error
  - Notes:
    - Deletes both the document file from the filesystem and the metadata record

### Departments
- **GET /api/employees/departments/**
  - Lists all departments
  - Query Parameters:
    - `search`: Text search across department fields (optional)
    - `page`: Page number for pagination (default: 1)
    - `limit`: Number of results per page (default: 100)
  - Response: `{"results": [...], "count": number, "page": number, "limit": number, "pages": number, "has_next": boolean, "has_prev": boolean}`

- **GET /api/employees/departments/{department_id}/**
  - Retrieves a single department by ID
  - Path Parameters: `department_id` - Department's unique identifier
  - Response: `{department_data}`
  - Error Responses:
    - 404: Department not found
    - 500: Server error

- **POST /api/employees/departments/new/**
  - Creates a new department
  - Request Body: `{"name": string (required), "description": string (optional), ...}`
  - Response: `{"message": "Department created successfully", "id": string, "_id": string, ...department_data}`
  - Error Responses:
    - 400: Invalid request (missing required fields or invalid JSON)
    - 500: Server error
  - Notes:
    - Automatically adds timestamps (created_at)

- **PUT /api/employees/departments/{department_id}/update/**
  - Updates a department (full update)
  - Path Parameters: `department_id` - Department's unique identifier
  - Request Body: Complete department object with all fields
  - Response: `{"message": "Department updated successfully", ...updated_data}`
  - Error Responses:
    - 404: Department not found
    - 400: Invalid request data
    - 500: Server error

- **PATCH /api/employees/departments/{department_id}/partial/**
  - Updates a department (partial update)
  - Path Parameters: `department_id` - Department's unique identifier
  - Request Body: Partial department object with only fields to update
  - Response: `{"message": "Department updated successfully", ...updated_data}`
  - Error Responses:
    - 404: Department not found
    - 400: Invalid request data
    - 500: Server error

- **DELETE /api/employees/departments/{department_id}/delete/**
  - Deletes a department
  - Path Parameters: `department_id` - Department's unique identifier
  - Response: `{"message": "Department deleted successfully"}`
  - Error Responses:
    - 404: Department not found
    - 500: Server error
  - Notes:
    - Does not check for or update employees in this department
    - Use with caution as it may leave employees with invalid department references

- **GET /api/employees/departments/{department_id}/employees/**
  - Retrieves all employees in a specific department
  - Path Parameters: `department_id` - Department's unique identifier
  - Response: `{"count": number, "employees": [...]}`
  - Error Responses:
    - 404: Department not found
    - 500: Server error

### Attendance
- **GET /api/attendance/**
  - Lists attendance records with filtering
  - Query Parameters: `employee_id`, `date`, `status`, etc.
  - Response: `{"results": [...], "count": number, ...}`

- **POST /api/attendance/record/**
  - Records attendance (check-in or check-out)
  - Request Body: `{"employee_id": string, "type": "check_in|check_out", "location": {location_data}}`
  - Response: `{"message": "Attendance recorded successfully", "attendance_id": string}`

- **GET /api/attendance/{id}/**
  - Gets attendance record details
  - Path Parameters: `id` - Attendance record ID
  - Response: `{attendance_data}`

- **GET /api/attendance/employee/{id}/**
  - Gets attendance records for an employee
  - Path Parameters: `id` - Employee ID
  - Query Parameters: `start_date`, `end_date`, `status`
  - Response: `{"count": number, "records": [...]}`

- **GET /api/attendance/report/**
  - Generates attendance report
  - Query Parameters: `department_id`, `start_date`, `end_date`
  - Response: `{"report_data": {...}, "summary": {...}}`

### Leaves
- **GET /api/leaves/**
  - Lists leave requests with filtering
  - Query Parameters: `employee_id`, `status`, `start_date`, `end_date`
  - Response: `{"count": number, "leaves": [...]}`

- **POST /api/leaves/request/**
  - Submits leave request
  - Request Body: `{"employee_id": string, "start_date": string, "end_date": string, "leave_type": string, "reason": string}`
  - Response: `{"message": "Leave request submitted successfully", "leave_id": string, "days": number, "status": string}`
  - Error Responses:
    - 400: Missing data, invalid dates, or invalid JSON
    - 404: Employee not found
    - 403: Permission denied
    - 409: Overlapping leave
    - 500: Server error
  - Notes:
    - Automatically creates notifications for managers
    - Calculates number of days including both start and end dates
    - Checks for overlapping leave requests

- **GET /api/leaves/{leave_id}/**
  - Gets leave request details
  - Path Parameters: `leave_id` - Leave request ID
  - Response: `{leave_request_data}`
  - Error Responses:
    - 404: Leave request not found
    - 403: Permission denied (for non-owners)
    - 500: Server error
  - Notes:
    - Includes employee details with the leave request

- **PUT /api/leaves/{leave_id}/**
  - Updates leave request status (approve/reject)
  - Path Parameters: `leave_id` - Leave request ID
  - Request Body: `{"status": "Approved"|"Rejected", "comments": string (optional)}`
  - Response: `{"message": "Leave request {status}", "leave_id": string}`
  - Error Responses:
    - 403: Permission denied (requires Admin/Manager role)
    - 404: Leave request not found
    - 400: Invalid status
    - 500: Server error
  - Notes:
    - Creates notifications for the employee

- **GET /api/leaves/balance/{employee_id}/**
  - Gets leave balance for an employee
  - Path Parameters: `employee_id` - Employee ID
  - Response: `{"balances": {"Annual": number, "Sick": number, ...}}`

- **GET /api/leaves/types/**
  - Gets available leave types
  - Response: `{"leave_types": ["Annual", "Sick", ...]}`

- **DELETE /api/leaves/{leave_id}/cancel/**
  - Cancels leave request
  - Path Parameters: `leave_id` - Leave request ID
  - Response: `{"message": "Leave request cancelled", "leave_id": string}`
  - Error Responses:
    - 404: Leave request not found
    - 403: Permission denied
    - 400: Already approved/taken leaves cannot be cancelled
    - 500: Server error

### Performance Reviews
- **GET /api/reviews/**
  - Lists all performance reviews with filtering
  - Query Parameters: `employee_id`, `reviewer_id`, `status`
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/reviews/{id}/**
  - Gets performance review details
  - Path Parameters: `id` - Review ID
  - Response: `{review_data}`

- **POST /api/reviews/new/**
  - Creates a new performance review
  - Request Body: `{"employee_id": string, "reviewer_id": string, "review_period": string, ...}`
  - Response: `{"message": "Review created successfully", "review_id": string}`

- **PUT /api/reviews/{id}/update/**
  - Updates a performance review (full update)
  - Path Parameters: `id` - Review ID
  - Response: `{"message": "Review updated successfully", ...}`

- **PATCH /api/reviews/{id}/partial/**
  - Updates a performance review (partial update)
  - Path Parameters: `id` - Review ID
  - Response: `{"message": "Review updated successfully", ...}`

- **DELETE /api/reviews/{id}/delete/**
  - Deletes a performance review
  - Path Parameters: `id` - Review ID
  - Response: `{"message": "Review deleted successfully"}`

### Projects
- **GET /api/projects/**
  - Lists all projects with filtering options
  - Query Parameters: `status`, `manager_id`, `search`, etc.
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/projects/{id}/**
  - Gets project details
  - Path Parameters: `id` - Project ID
  - Response: `{project_data}`

- **POST /api/projects/new/**
  - Creates a new project
  - Request Body: Project data with name, description, etc.
  - Response: `{"message": "Project created successfully", "project_id": string}`

- **GET /api/projects/{id}/tasks/**
  - Lists all tasks for a specific project
  - Path Parameters: `id` - Project ID
  - Response: `{"count": number, "tasks": [...]}`

### Tasks
- **GET /api/tasks/**
  - Lists all tasks with filtering
  - Query Parameters: `project_id`, `assigned_to`, `status`, etc.
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/tasks/{id}/**
  - Gets task details
  - Path Parameters: `id` - Task ID
  - Response: `{task_data}`

- **POST /api/tasks/new/**
  - Creates a new task
  - Request Body: Task data with title, description, etc.
  - Response: `{"message": "Task created successfully", "task_id": string}`

- **PATCH /api/tasks/{id}/status/**
  - Updates task status
  - Path Parameters: `id` - Task ID
  - Request Body: `{"status": string}`
  - Response: `{"message": "Task status updated", ...}`

### Reports
- **GET /api/reports/**
  - Lists available reports
  - Response: `{"available_reports": [...]}`

- **GET /api/reports/attendance/**
  - Generates attendance report
  - Query Parameters: `department_id`, `start_date`, `end_date`
  - Response: Report data

- **GET /api/reports/employee-stats/**
  - Employee statistics report
  - Query Parameters: `department_id` (optional)
  - Response: Employee statistics data

- **GET /api/reports/department-stats/**
  - Department statistics report
  - Response: Department statistics data

- **POST /api/reports/custom/**
  - Generates custom report
  - Request Body: `{"report_type": string, "parameters": {...}}`
  - Response: Custom report data

### AI and Analytics
- **GET /api/ai/attrition/**
  - Gets attrition prediction data
  - Query Parameters: `department_id` (optional)
  - Response: `{"predictions": [...], "risk_factors": [...]}`

- **GET /api/ai/sentiment/**
  - Gets employee sentiment analysis
  - Query Parameters: `department_id`, `period`
  - Response: `{"sentiment_score": number, "trends": [...], "factors": [...]}`

- **GET /api/ai/skill-gap/**
  - Gets skill gap analysis data
  - Query Parameters: `department_id` (optional)
  - Response: `{"gaps": [...], "recommendations": [...]}`

### Notifications
- **GET /api/notifications/**
  - Lists notifications for the current user
  - Query Parameters: `read` (boolean), `priority`
  - Response: `{"count": number, "notifications": [...]}`

- **POST /api/notifications/mark-read/**
  - Marks notifications as read
  - Request Body: `{"notification_ids": [string]}`
  - Response: `{"message": "Notifications marked as read"}`

### Chat Assistant
- **POST /api/chat/message/**
  - Sends a message to the AI chat assistant
  - Request Body: `{"message": string, "context": object (optional)}`
  - Response: `{"response": string, "suggestions": [...], "links": [...]}`

### Recruitment
- **GET /api/recruitment/jobs/**
  - Lists all job openings
  - Query Parameters: `status`, `department_id`, `search`
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/recruitment/candidates/**
  - Lists all candidates
  - Query Parameters: `job_id`, `status`, `search`
  - Response: `{"results": [...], "count": number, ...}`

- **POST /api/recruitment/candidates/new/**
  - Creates a new candidate record
  - Request Body: Candidate data with name, email, etc.
  - Response: `{"message": "Candidate created successfully", "candidate_id": string}`

### Skills Management
- **GET /api/skills/**
  - Lists all skills in the system
  - Query Parameters: `category`, `search`
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/skills/employee/{id}/**
  - Gets skills for a specific employee
  - Path Parameters: `id` - Employee ID
  - Response: `{"count": number, "skills": [...]}`

- **POST /api/skills/employee/{id}/add/**
  - Adds skills to an employee
  - Path Parameters: `id` - Employee ID
  - Request Body: `{"skills": [string]}`
  - Response: `{"message": "Skills added successfully", ...}`

### Time Tracking
- **GET /api/time-tracking/**
  - Lists time tracking entries
  - Query Parameters: `employee_id`, `project_id`, `start_date`, `end_date`
  - Response: `{"results": [...], "count": number, ...}`

- **POST /api/time-tracking/entry/**
  - Creates a time tracking entry
  - Request Body: `{"employee_id": string, "project_id": string, "task_id": string, "hours": number, "date": string, "description": string}`
  - Response: `{"message": "Time entry recorded", "entry_id": string}`

### Training
- **GET /api/training/courses/**
  - Lists all training courses
  - Query Parameters: `category`, `status`, `search`
  - Response: `{"results": [...], "count": number, ...}`

- **GET /api/training/employee/{id}/**
  - Gets training records for an employee
  - Path Parameters: `id` - Employee ID
  - Response: `{"completed": [...], "enrolled": [...], "recommended": [...]}`

- **POST /api/training/enroll/**
  - Enrolls employee in a training course
  - Request Body: `{"employee_id": string, "course_id": string}`
  - Response: `{"message": "Enrollment successful", "enrollment_id": string}`

## Project Structure

### Backend

```
backend/
├── auth_app/          # Authentication and authorization
├── employees/         # Employee management
├── attendance/        # Attendance and time tracking
├── leaves/            # Leave management
├── reviews/           # Performance reviews
├── payroll/           # Payroll management
├── ai_analytics/      # AI and analytics
├── notifications/     # Notifications system
├── reports/           # Reports and exports
├── chat/              # AI chat assistant
├── projects/          # Project management
├── tasks/             # Task management
├── training/          # Training management
├── benefits/          # Employee benefits
├── performance/       # Performance tracking
├── feedback/          # Employee feedback
├── jobs/              # Job descriptions
├── skills/            # Employee skills
├── recruitment/       # Recruitment process
├── time_tracking/     # Time tracking
├── hr_backend/        # Core project settings
└── manage.py          # Django management script
```

### Frontend

```
frontend/
├── public/            # Static files
└── src/
    ├── components/    # Reusable UI components
    ├── contexts/      # React context providers
    ├── pages/         # Page components
    │   ├── analytics/   # Analytics dashboard
    │   ├── attendance/  # Attendance tracking
    │   ├── auth/        # Authentication pages
    │   ├── dashboard/   # Main dashboard
    │   ├── employees/   # Employee management
    │   ├── leave/       # Leave management
    │   ├── payroll/     # Payroll overview
    │   ├── reviews/     # Performance reviews
    │   └── settings/    # System settings
    ├── services/      # API service functions
    ├── utils/         # Utility functions
    ├── App.js         # Main application component
    └── index.js       # Entry point
```

## Default Login Credentials

- **Admin**:
  - Username: admin
  - Password: admin123

- **HR Manager**:
  - Username: hrmanager
  - Password: manager123

- **Employee**:
  - Username: employee1
  - Password: employee1

## Troubleshooting

### MongoDB Errors

- **Duplicate Key Errors**: When running the server, if you encounter a duplicate key error (like "E11000 duplicate key error"), it means there are duplicate values in a field with a unique index. The application now automatically handles this by removing duplicates while preserving one record.

- **Connection Issues**: If you cannot connect to MongoDB, ensure the service is running. You can check the status with:
  ```
  # On Windows
  net start MongoDB
  
  # On macOS
  brew services list
  
  # On Linux
  sudo systemctl status mongod
  ```

- **Database Initialization**: If you need to reset the database, delete all existing collections and run the initialization script again:
  ```
  cd backend
  python manage.py shell
  ```
  Inside the shell:
  ```python
  from pymongo import MongoClient
  client = MongoClient('mongodb://localhost:27017/')
  client.drop_database('hr_dashboard_db')
  exit()
  ```
  Then run the initialization script:
  ```
  cd ..
  python init_db.py
  ```

### Django Errors

- **Missing Dependencies**: If you get import errors, ensure all dependencies are installed:
  ```
  pip install -r requirements.txt
  ```

- **Migration Issues**: If you encounter migration problems, try resetting migrations:
  ```
  python manage.py migrate --fake-initial
  ```

### React Errors

- **Node Module Issues**: If you encounter problems with Node modules, try:
  ```
  rm -rf node_modules
  npm cache clean --force
  npm install
  ```

## Future Enhancements

- Mobile application with React Native
- Single Sign-On (SSO) integration
- Advanced AI capabilities with custom models
- Integration with third-party services (Slack, Teams, etc.)
- Voice interface and voice-bot
- Blockchain records for immutable data
- Gamification features for employee engagement