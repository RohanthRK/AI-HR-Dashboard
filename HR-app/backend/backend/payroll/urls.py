"""
URL patterns for payroll app
"""
from django.urls import path
from . import views

urlpatterns = [
    # payroll CRUD
    path('', views.list_payroll, name='list_payroll'),  # GET
    path('new/', views.create_payroll, name='create_payroll'),  # POST
    path('<str:payroll_id>/', views.get_payroll, name='get_payroll'),  # GET
    path('<str:payroll_id>/update/', views.update_payroll, name='update_payroll'),  # PUT
    path('<str:payroll_id>/partial/', views.partial_update_payroll, name='partial_update_payroll'),  # PATCH
    path('<str:payroll_id>/delete/', views.delete_payroll, name='delete_payroll'),  # DELETE
]
