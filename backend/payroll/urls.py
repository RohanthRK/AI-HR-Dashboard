"""
URL patterns for payroll app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_payroll, name='list_payroll'),
    path('me/', views.get_my_payroll, name='my_payroll'),
    path('summary/', views.payroll_summary, name='payroll_summary'),
    path('run/', views.run_summary, name='run_summary'),
    path('generate/', views.generate_payroll, name='generate_payroll'),
    path('release/', views.release_payroll, name='release_payroll'),
    path('mark-paid/', views.mark_paid, name='mark_paid'),
    path('export/', views.export_payroll, name='export_payroll'),
    path('adjustments/', views.adjustments, name='payroll_adjustments'),
    path('adjustments/<str:adjustment_id>/', views.delete_adjustment, name='delete_adjustment'),
    path('payslip/<str:payslip_id>/', views.payslip_detail, name='payslip_detail'),
    path('payslip/<str:payslip_id>/pdf/', views.payslip_pdf, name='payslip_pdf'),
    path('bank/<str:employee_id>/', views.bank_details, name='bank_details'),
    path('salary/<str:employee_id>/', views.salary, name='salary'),
    path('items/<str:employee_id>/', views.pay_items, name='pay_items'),
    path('items/<str:employee_id>/<str:item_id>/', views.delete_pay_item, name='delete_pay_item'),
]
