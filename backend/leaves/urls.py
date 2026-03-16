"""
URL patterns for leaves app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('request', views.request_leave, name='request_leave'),
    path('', views.get_leave_requests, name='get_leave_requests'),
    path('pending', views.get_leave_requests, {'status': 'Pending'}, name='get_pending_leaves'),
    path('types', views.get_leave_types, name='get_leave_types'),
    path('balance/<str:employee_id>', views.get_leave_balance, name='get_leave_balance'),
    path('<str:leave_id>', views.get_leave, name='get_leave'),
    path('<str:leave_id>', views.update_leave_status, name='update_leave_status'),
    path('<str:leave_id>', views.cancel_leave, name='cancel_leave'),
] 