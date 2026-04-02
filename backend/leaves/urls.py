"""
URL patterns for leaves app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('request/', views.request_leave, name='request_leave'),
    path('apply/', views.request_leave, name='apply_leave'), # Alias for frontend service
    path('', views.get_leave_requests, name='get_leave_requests'),
    path('me/', views.get_leave_requests, name='get_my_leaves'),
    path('pending/', views.get_leave_requests, {'status': 'Pending'}, name='get_pending_leaves'),
    path('types/', views.get_leave_types, name='get_leave_types'),
    path('balance/<str:employee_id>/', views.get_leave_balance, name='get_leave_balance'),
    path('<str:leave_id>/details/', views.get_leave, name='get_leave'),
    path('<str:leave_id>/approve/', views.update_leave_status, {'status': 'Approved'}, name='approve_leave'),
    path('<str:leave_id>/reject/', views.update_leave_status, {'status': 'Rejected'}, name='reject_leave'),
    path('<str:leave_id>/cancel/', views.cancel_leave, name='cancel_leave'),
    path('<str:leave_id>/', views.get_leave, name='get_leave_short'),
] 