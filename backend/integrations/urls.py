from django.urls import path
from . import views

urlpatterns = [
    path('webhooks/', views.webhooks_handler, name='webhooks'),
    path('webhooks/<str:webhook_id>/', views.webhook_detail, name='webhook_detail'),
    path('webhooks/<str:webhook_id>/test/', views.webhook_test, name='webhook_test'),
    path('employees/export/', views.export_employees, name='employees_export'),
    path('employees/import/', views.import_employees, name='employees_import'),
]
