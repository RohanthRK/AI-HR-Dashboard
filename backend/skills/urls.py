from django.urls import path
from . import views
from .catalog import catalog_handler

urlpatterns = [
    path('', views.list_items, name='list_items'),
    path('catalog/', catalog_handler, name='skill_catalog'),
    path('employee/<str:employee_id>/', views.get_employee_skills, name='get_employee_skills'),
    path('employee/<str:employee_id>/update/', views.update_employee_skills, name='update_employee_skills'),
]
