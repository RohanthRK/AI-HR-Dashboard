"""
URL patterns for attendance app
"""
from django.urls import path
from . import views

urlpatterns = [
    # Attendance CRUD (Admin/HR)
    path('', views.list_attendance, name='list_attendance'),  # GET
    path('new/', views.create_attendance, name='create_attendance'),  # POST
    path('<str:attendance_id>/', views.get_attendance, name='get_attendance'),  # GET
    path('<str:attendance_id>/update/', views.update_attendance, name='update_attendance'),  # PUT
    path('<str:attendance_id>/partial/', views.partial_update_attendance, name='partial_update_attendance'),  # PATCH
    path('<str:attendance_id>/delete/', views.delete_attendance, name='delete_attendance'),  # DELETE
    
    # User-specific endpoints
    path('status/', views.get_user_attendance_status, name='get_user_attendance_status'), # GET - New endpoint for status
    path('clock-in/', views.clock_in, name='clock_in'),  # POST - Removed employee_id from URL
    path('clock-out/', views.clock_out, name='clock_out'), # POST - Removed employee_id from URL
    path('me/', views.get_my_attendance, name='get_my_attendance'), # GET - Added for user's own history
    
    # Admin/HR endpoints for specific employees
    path('employee/<str:employee_id>/', views.employee_attendance, name='employee_attendance'),  # GET
    
    # Summary/Report endpoints
    path('summary/', views.attendance_summary, name='attendance_summary'),  # GET
] 