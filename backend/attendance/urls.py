"""
URL patterns for attendance app
"""
from django.urls import path
from . import views

urlpatterns = [
    # Attendance CRUD (Admin/HR)
    path('', views.list_attendance, name='list_attendance'),  # GET
    # User-specific endpoints
    path('status/', views.get_user_attendance_status, name='get_user_attendance_status'),
    path('clock-in/', views.clock_in, name='clock_in'),
    path('clock-out/', views.clock_out, name='clock_out'),
    path('me/', views.get_my_attendance, name='get_my_attendance'),
    
    # Summary/Report endpoints
    path('summary/', views.attendance_summary, name='attendance_summary'),
    
    # Attendance CRUD (Admin/HR) and specific endpoints
    path('new/', views.create_attendance, name='create_attendance'),
    path('employee/<str:employee_id>/', views.employee_attendance, name='employee_attendance'),
    
    # Generic ID endpoints must come last to prevent eclipsing specific keywords
    path('<str:attendance_id>/', views.get_attendance, name='get_attendance'),
    path('<str:attendance_id>/update/', views.update_attendance, name='update_attendance'),
    path('<str:attendance_id>/partial/', views.partial_update_attendance, name='partial_update_attendance'),
    path('<str:attendance_id>/delete/', views.delete_attendance, name='delete_attendance'),
] 