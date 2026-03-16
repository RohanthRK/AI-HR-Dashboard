"""
URL patterns for employees app
"""
from django.urls import path
from . import views

urlpatterns = [
    # Debug endpoint (should come before generic <str:employee_id>)
    path('debug/', views.debug_employees, name='debug_employees'),  # GET
    
    # Employee CRUD
    path('', views.list_employees, name='list_employees'),  # GET
    path('new/', views.create_employee, name='create_employee'),  # POST
    path('<str:employee_id>/', views.get_employee, name='get_employee'),  # GET
    path('<str:employee_id>/update/', views.update_employee, name='update_employee'),  # PUT
    path('<str:employee_id>/partial/', views.partial_update_employee, name='partial_update_employee'),  # PATCH
    path('<str:employee_id>/delete/', views.delete_employee, name='delete_employee'),  # DELETE
    
    # Document management
    path('<str:employee_id>/documents/', views.list_documents, name='list_documents'),  # GET
    path('<str:employee_id>/documents/upload/', views.upload_document, name='upload_document'),  # POST
    path('<str:employee_id>/documents/<str:document_id>/', views.download_document, name='download_document'),  # GET
    path('<str:employee_id>/documents/<str:document_id>/delete/', views.delete_document, name='delete_document'),  # DELETE
    
    # Department CRUD
    path('departments/', views.list_departments, name='list_departments'),  # GET
    path('departments/<str:department_id>/', views.get_department, name='get_department'),  # GET
    path('departments/new/', views.create_department, name='create_department'),  # POST
    path('departments/<str:department_id>/update/', views.update_department, name='update_department'),  # PUT
    path('departments/<str:department_id>/partial/', views.partial_update_department, name='partial_update_department'),  # PATCH
    path('departments/<str:department_id>/delete/', views.delete_department, name='delete_department'),  # DELETE
    path('departments/<str:department_id>/employees/', views.get_department_employees, name='get_department_employees'),  # GET
    path('departments/mongodb/', views.list_departments_mongodb, name='list_departments_mongodb'),
] 