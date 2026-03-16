"""
URL configuration for hr_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    """
    Simple health check endpoint to verify API availability
    
    Endpoint: GET /api/health/
    
    Response:
        {
            "status": "ok"
        }
    """
    return JsonResponse({'status': 'ok'})

def api_root(request):
    """
    API root with documentation of all available endpoints
    
    Endpoint: GET /api/
    
    Response:
        {
            "status": "ok",
            "message": "HR Dashboard API",
            "version": "1.0",
            "endpoints": {
                "auth": "/api/auth/",
                "employees": "/api/employees/",
                "attendance": "/api/attendance/",
                ...
            }
        }
        
    API Documentation:
    
    # Authentication
    /api/auth/login/                  - POST: Login with username and password
    /api/auth/register/               - POST: Register a new user
    /api/auth/logout/                 - POST: Logout current user
    /api/auth/profile/                - GET: Get current user profile
                                      - PUT: Update current user profile
    /api/auth/change-password/        - POST: Change user password
    
    # Employees
    /api/employees/                   - GET: List all employees with filtering and pagination
    /api/employees/new/               - POST: Create a new employee
    /api/employees/{id}/              - GET: Get employee details
    /api/employees/{id}/update/       - PUT: Update employee (full update)
    /api/employees/{id}/partial/      - PATCH: Update employee (partial update)
    /api/employees/{id}/delete/       - DELETE: Delete an employee
    /api/employees/debug/             - GET: Debug endpoint (returns all employees)
    
    # Employee Documents
    /api/employees/{id}/documents/           - GET: List employee documents
    /api/employees/{id}/documents/upload/    - POST: Upload a document for employee
    /api/employees/{id}/documents/{doc_id}/  - GET: Download employee document
    /api/employees/{id}/documents/{doc_id}/delete/ - DELETE: Delete employee document
    
    # Departments
    /api/employees/departments/              - GET: List all departments
    /api/employees/departments/new/          - POST: Create a new department
    /api/employees/departments/{id}/         - GET: Get department details
    /api/employees/departments/{id}/update/  - PUT: Update department (full update)
    /api/employees/departments/{id}/partial/ - PATCH: Update department (partial update)
    /api/employees/departments/{id}/delete/  - DELETE: Delete a department
    /api/employees/departments/{id}/employees/ - GET: List employees in a department
    
    # Attendance
    /api/attendance/                  - GET: List attendance records with filtering
    /api/attendance/record/           - POST: Record attendance
    /api/attendance/{id}/             - GET: Get attendance record details
    /api/attendance/employee/{id}/    - GET: Get attendance records for an employee
    /api/attendance/report/           - GET: Generate attendance report
    
    # Leaves
    /api/leaves/                      - GET: List leave requests
    /api/leaves/request/              - POST: Submit leave request
    /api/leaves/{id}/                 - GET: Get leave request details
    /api/leaves/{id}/approve/         - POST: Approve leave request
    /api/leaves/{id}/reject/          - POST: Reject leave request
    /api/leaves/{id}/cancel/          - POST: Cancel leave request
    
    # AI Analytics
    /api/ai/dashboard/               - GET: AI dashboard analytics
    /api/ai/engagement/              - GET: Employee engagement metrics
    /api/ai/attrition-risk/          - GET: Attrition risk prediction
    /api/ai/talent-insights/team/    - GET: Team insights analysis
    /api/ai/talent-insights/skills/  - GET: Skills trends analysis
    /api/ai/talent-insights/growth/  - GET: Growth opportunities analysis
    /api/ai/talent-insights/employee/{id}/ - GET: Individual employee insights
    /api/ai/talent-insights/employees/ - GET: All employees with AI-enhanced attributes
    
    # Reports
    /api/reports/                     - GET: List available reports
    /api/reports/attendance/          - GET: Generate attendance report
    /api/reports/employee-stats/      - GET: Employee statistics report
    /api/reports/department-stats/    - GET: Department statistics report
    /api/reports/custom/              - POST: Generate custom report
    """
    return JsonResponse({
        'status': 'ok',
        'message': 'HR Dashboard API',
        'version': '1.0',
        'endpoints': {
            'auth': '/api/auth/',
            'employees': '/api/employees/',
            'attendance': '/api/attendance/',
            'leaves': '/api/leaves/',
            'reviews': '/api/reviews/',
            'payroll': '/api/payroll/',
            'ai': '/api/ai/',
            'notifications': '/api/notifications/',
            'reports': '/api/reports/',
            'chat': '/api/chat/',
            'projects': '/api/projects/',
            'tasks': '/api/tasks/',
            'training': '/api/training/',
            'benefits': '/api/benefits/',
            'performance': '/api/performance/',
            'feedback': '/api/feedback/',
            'jobs': '/api/jobs/',
            'skills': '/api/skills/',
            'recruitment': '/api/recruitment/',
            'teams': '/api/teams/'
        }
    })

urlpatterns = [
    # path('admin/', admin.site.urls),  # Admin site removed to avoid authentication
    path('api/', api_root, name='api_root'),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('auth_app.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/attendance/', include('attendance.urls')),
    
    # App URLs
    path('api/leaves/', include('leaves.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/payroll/', include('payroll.urls')),
    path('api/ai/', include('ai_analytics.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/training/', include('training.urls')),
    path('api/benefits/', include('benefits.urls')),
    path('api/performance/', include('performance.urls')),
    path('api/feedback/', include('feedback.urls')),
    path('api/time-tracking/', include('time_tracking.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/skills/', include('skills.urls')),
    path('api/recruitment/', include('recruitment.urls')),
    path('api/teams/', include('teams.urls')),
    
    # Temporary URL for debugging
    path('api/debug/urls/', include('get_urls.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
