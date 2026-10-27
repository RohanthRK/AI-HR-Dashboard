"""
URL patterns for reports app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('compliance/', views.compliance, name='compliance'),
    path('compliance/notify/', views.compliance_notify, name='compliance_notify'),
]
