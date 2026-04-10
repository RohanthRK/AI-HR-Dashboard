"""
URL patterns for payroll app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.get_my_payroll, name='my_payroll'),
    path('summary/', views.payroll_summary, name='payroll_summary'),
]