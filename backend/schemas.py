"""
MongoDB schema definitions for the HR Dashboard application.

This file defines the structure and validation rules for all collections.
"""

# User schema
user_schema = {
    "username": str,  # Unique username for login
    "email": str,     # Unique email address
    "password_hash": str,  # Hashed password
    "first_name": str,
    "last_name": str,
    "role_id": str,  # ObjectId as string
    "profile_image": str,  # URL to profile image
    "last_login": str,  # ISO format datetime
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
    "is_active": bool,
    "reset_token": str,  # Password reset token
    "reset_token_expiry": str,  # ISO format datetime
}

# Role schema
role_schema = {
    "name": str,  # Role name (e.g. Admin, HR Manager, Employee)
    "description": str,
    "permissions": list,  # List of permission strings
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Department schema
department_schema = {
    "name": str,
    "description": str,
    "manager_id": str,  # ObjectId as string
    "parent_department_id": str,  # ObjectId as string for hierarchical structure
    "created_at": str,
    "updated_at": str,
    "is_active": bool,
}

# Team schema
team_schema = {
    "name": str,
    "description": str,
    "department_id": str,  # ObjectId as string
    "department": str,     # Department name
    "manager_id": str,     # ObjectId as string (Team Lead)
    "created_at": str,
    "updated_at": str,
    "is_active": bool,
}

# Employee schema
employee_schema = {
    "employee_id": str,  # Unique employee ID (e.g. EMP0001)
    "user_id": str,  # ObjectId as string, link to Users collection
    "first_name": str,
    "last_name": str,
    "email": str,
    "phone": str,
    "address": str,
    "emergency_contact": {
        "name": str,
        "phone": str,
        "relationship": str,
    },
    "date_of_birth": str,  # ISO format date
    "gender": str,
    "marital_status": str,
    "department_id": str,  # ObjectId as string
    "position": str,
    "manager_id": str,  # ObjectId as string
    "hire_date": str,  # ISO format date
    "termination_date": str,  # ISO format date
    "salary": float,
    "employment_type": str,  # Full-time, Part-time, Contract
    "employment_status": str,  # Active, On Leave, Terminated
    "skills": list,  # List of skill IDs
    "documents": list,  # List of document IDs
    "profile_image": str,  # URL to profile image
    "leave_balance": {
        "annual": int,
        "sick": int,
        "personal": int,
    },
    "created_at": str,
    "updated_at": str,
}

# Document schema
document_schema = {
    "employee_id": str,  # ObjectId as string
    "name": str,
    "description": str,
    "file_path": str,
    "file_type": str,
    "file_size": int,
    "upload_date": str,  # ISO format datetime
    "uploaded_by": str,  # ObjectId as string (user_id)
    "is_confidential": bool,
    "tags": list,  # List of tag strings
    "category": str,
}

# Attendance schema
attendance_schema = {
    "employee_id": str,  # ObjectId as string
    "date": str,  # ISO format date
    "clock_in": str,  # ISO format datetime
    "clock_out": str,  # ISO format datetime
    "total_hours": float,
    "status": str,  # Present, Absent, Late, Half-day
    "location": str,
    "ip_address": str,
    "notes": str,
    "is_approved": bool,
    "approved_by": str,  # ObjectId as string (user_id)
    "approval_date": str,  # ISO format datetime
}

# Leave schema
leave_schema = {
    "employee_id": str,  # ObjectId as string
    "leave_type": str,  # Annual, Sick, Personal, Maternity, etc
    "start_date": str,  # ISO format date
    "end_date": str,  # ISO format date
    "total_days": float,
    "reason": str,
    "status": str,  # Pending, Approved, Rejected, Cancelled
    "requested_on": str,  # ISO format datetime
    "reviewed_by": str,  # ObjectId as string (user_id)
    "reviewed_on": str,  # ISO format datetime
    "review_notes": str,
    "attachments": list,  # List of documents
}

# Review Period schema
review_period_schema = {
    "name": str,
    "start_date": str,  # ISO format date
    "end_date": str,  # ISO format date
    "status": str,  # Active, Completed, Cancelled
    "created_by": str,  # ObjectId as string (user_id)
    "created_at": str,  # ISO format datetime
    "departments": list,  # List of department IDs or empty for all departments
    "template": dict,  # Review template with questions and scoring criteria
}

# Review schema
review_schema = {
    "review_period_id": str,  # ObjectId as string
    "employee_id": str,  # ObjectId as string
    "reviewer_id": str,  # ObjectId as string
    "relationship": str,  # Self, Manager, Peer, Direct Report
    "scores": dict,  # Key-value pairs for different evaluation criteria
    "average_score": float,
    "comments": str,
    "strengths": list,
    "areas_for_improvement": list,
    "goals": list,
    "status": str,  # Draft, Submitted, Acknowledged
    "submission_date": str,  # ISO format datetime
    "acknowledgment_date": str,  # ISO format datetime
    "last_updated": str,  # ISO format datetime
}

# Payroll schema
payroll_schema = {
    "employee_id": str,  # ObjectId as string
    "year": int,
    "month": int,
    "basic_salary": float,
    "allowances": dict,  # Key-value pairs for different allowances
    "deductions": dict,  # Key-value pairs for different deductions
    "tax": float,
    "net_pay": float,
    "payment_date": str,  # ISO format date
    "payment_method": str,
    "payment_status": str,  # Pending, Processed, Failed
    "notes": str,
    "created_by": str,  # ObjectId as string (user_id)
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Export schema
export_schema = {
    "name": str,
    "description": str,
    "file_path": str,
    "file_type": str,  # CSV, PDF, etc
    "file_size": int,
    "generated_by": str,  # ObjectId as string (user_id)
    "generated_at": str,  # ISO format datetime
    "parameters": dict,  # Search/filter parameters used for this report
    "status": str,  # Processing, Completed, Failed
    "download_count": int,
    "expires_at": str,  # ISO format datetime
}

# Notification schema
notification_schema = {
    "user_id": str,  # ObjectId as string
    "title": str,
    "message": str,
    "type": str,  # Info, Warning, Alert, etc
    "related_to": str,  # The module this notification relates to
    "related_id": str,  # ObjectId as string (e.g. leave_id, review_id)
    "read": bool,
    "read_at": str,  # ISO format datetime
    "created_at": str,  # ISO format datetime
}

# AI Insights schema
ai_insight_schema = {
    "title": str,
    "description": str,
    "module": str,  # Attendance, Performance, etc
    "data": dict,  # The analysis data (will vary by insight type)
    "created_at": str,  # ISO format datetime
    "expires_at": str,  # ISO format datetime - when this insight is no longer relevant
    "visible_to": list,  # List of role IDs or user IDs
}

# Chat Log schema
chat_log_schema = {
    "user_id": str,  # ObjectId as string
    "session_id": str,
    "query": str,  # The user's question
    "response": str,  # The AI's response
    "feedback": str,  # User feedback (helpful, not helpful)
    "timestamp": str,  # ISO format datetime
}

# Job Description schema
job_description_schema = {
    "title": str,
    "department_id": str,  # ObjectId as string
    "description": str,
    "requirements": list,
    "responsibilities": list,
    "salary_range": {
        "min": float,
        "max": float,
    },
    "employment_type": str,  # Full-time, Part-time, Contract
    "location": str,
    "is_remote": bool,
    "is_active": bool,
    "created_by": str,  # ObjectId as string (user_id)
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Employee Skills schema
employee_skill_schema = {
    "name": str,
    "category": str,  # Technical, Soft, Language, etc
    "description": str,
    "created_at": str,  # ISO format datetime
}

# Candidate schema
candidate_schema = {
    "first_name": str,
    "last_name": str,
    "email": str,
    "phone": str,
    "resume_url": str,
    "position_applied": str,
    "department_id": str,  # ObjectId as string
    "application_date": str,  # ISO format date
    "status": str,  # Applied, Screening, Interview, Offer, Rejected, Hired
    "source": str,  # Where the candidate came from
    "notes": str,
    "skills": list,  # List of skill IDs
    "education": list,  # List of education entries
    "experience": list,  # List of experience entries
    "interview_schedule": list,  # List of interview schedules
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Settings schema
settings_schema = {
    "key": str,  # Unique setting key
    "value": object,  # Any value
    "description": str,
    "category": str,  # System, Email, etc
    "updated_by": str,  # ObjectId as string (user_id)
    "updated_at": str,  # ISO format datetime
}

# Projects schema
project_schema = {
    "name": str,
    "description": str,
    "manager_id": str,  # ObjectId as string (employee_id)
    "team_members": list,  # List of employee IDs
    "start_date": str,  # ISO format date
    "end_date": str,  # ISO format date
    "status": str,  # Not Started, In Progress, On Hold, Completed
    "priority": str,  # Low, Medium, High
    "budget": float,
    "actual_cost": float,
    "progress": int,  # Percentage complete
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Tasks schema
task_schema = {
    "title": str,
    "description": str,
    "project_id": str,  # ObjectId as string
    "assigned_to": str,  # ObjectId as string (employee_id)
    "assigned_by": str,  # ObjectId as string (employee_id)
    "start_date": str,  # ISO format date
    "due_date": str,  # ISO format date
    "completed_date": str,  # ISO format date
    "status": str,  # To Do, In Progress, Under Review, Completed
    "priority": str,  # Low, Medium, High
    "estimated_hours": float,
    "actual_hours": float,
    "progress": int,  # Percentage complete
    "comments": list,  # List of comment objects
    "attachments": list,  # List of document IDs
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Time Tracking schema
time_tracking_schema = {
    "employee_id": str,  # ObjectId as string
    "task_id": str,  # ObjectId as string
    "project_id": str,  # ObjectId as string
    "date": str,  # ISO format date
    "start_time": str,  # ISO format datetime
    "end_time": str,  # ISO format datetime
    "duration": float,  # Hours
    "description": str,
    "billable": bool,
    "status": str,  # Pending, Approved, Rejected
    "approved_by": str,  # ObjectId as string (employee_id)
    "approved_at": str,  # ISO format datetime
    "created_at": str,  # ISO format datetime
}

# Benefits schema
benefit_schema = {
    "employee_id": str,  # ObjectId as string
    "benefit_type": str,  # Health Insurance, Dental, Vision, 401k, etc
    "provider": str,
    "policy_number": str,
    "coverage_amount": float,
    "premium": float,
    "start_date": str,  # ISO format date
    "end_date": str,  # ISO format date
    "dependents": list,  # List of dependent objects
    "documents": list,  # List of document IDs
    "status": str,  # Active, Inactive
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Training schema
training_schema = {
    "title": str,
    "description": str,
    "type": str,  # Online, Classroom, Workshop
    "provider": str,
    "cost": float,
    "start_date": str,  # ISO format date
    "end_date": str,  # ISO format date
    "location": str,
    "participants": list,  # List of employee IDs
    "status": str,  # Scheduled, In Progress, Completed, Cancelled
    "capacity": int,
    "prerequisites": list,
    "certificates": bool,
    "created_by": str,  # ObjectId as string (user_id)
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Performance schema
performance_schema = {
    "employee_id": str,  # ObjectId as string
    "review_period_id": str,  # ObjectId as string
    "goals": list,  # List of goal objects
    "kpis": list,  # List of KPI objects
    "achievements": list,
    "challenges": list,
    "overall_rating": float,
    "manager_comments": str,
    "employee_comments": str,
    "status": str,  # Draft, In Progress, Completed
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Feedback schema
feedback_schema = {
    "sender_id": str,  # ObjectId as string (employee_id)
    "recipient_id": str,  # ObjectId as string (employee_id)
    "type": str,  # Praise, Criticism, Suggestion
    "title": str,
    "message": str,
    "is_anonymous": bool,
    "category": str,  # Work Quality, Communication, etc
    "rating": int,  # 1-5 rating
    "date": str,  # ISO format date
    "is_read": bool,
    "read_at": str,  # ISO format datetime
    "created_at": str,  # ISO format datetime
}

# Expense schema
expense_schema = {
    "employee_id": str,  # ObjectId as string
    "amount": float,
    "date": str,  # ISO format date
    "category": str,
    "description": str,
    "status": str,  # Pending, Approved, Rejected
    "submittedAt": str,  # ISO format datetime
    "updatedAt": str,  # ISO format datetime
}

# Asset schema
asset_schema = {
    "name": str,
    "type": str,
    "employee_id": str,  # ObjectId as string
    "status": str,  # Available, Assigned, Maintenance
    "createdAt": str,  # ISO format datetime
    "updatedAt": str,  # ISO format datetime
}

# Helpdesk Ticket schema
helpdesk_ticket_schema = {
    "title": str,
    "description": str,
    "employee_id": str,  # ObjectId as string
    "status": str,  # Open, In Progress, Resolved, Closed
    "priority": str,
    "createdAt": str,  # ISO format datetime
    "updatedAt": str,  # ISO format datetime
    "comments": list,  # List of comment objects
}

# Objective schema
objective_schema = {
    "title": str,
    "description": str,
    "employee_id": str,  # ObjectId as string
    "target_date": str,  # ISO format date
    "progress": int,
    "status": str,  # On Track, At Risk, Behind, Completed
    "key_results": list,
    "created_at": str,  # ISO format datetime
    "updated_at": str,  # ISO format datetime
}

# Collection schemas mapping
schemas = {
    "users": user_schema,
    "roles": role_schema,
    "departments": department_schema,
    "teams": team_schema,
    "employees": employee_schema,
    "documents": document_schema,
    "attendance": attendance_schema,
    "leaves": leave_schema,
    "review_periods": review_period_schema,
    "reviews": review_schema,
    "payroll": payroll_schema,
    "exports": export_schema,
    "notifications": notification_schema,
    "ai_insights": ai_insight_schema,
    "chat_logs": chat_log_schema,
    "job_descriptions": job_description_schema,
    "employee_skills": employee_skill_schema,
    "candidates": candidate_schema,
    "settings": settings_schema,
    "projects": project_schema,
    "tasks": task_schema,
    "time_tracking": time_tracking_schema,
    "benefits": benefit_schema,
    "training": training_schema,
    "performance": performance_schema,
    "feedback": feedback_schema,
    "expenses": expense_schema,
    "assets": asset_schema,
    "helpdesk_tickets": helpdesk_ticket_schema,
    "objectives": objective_schema
} 