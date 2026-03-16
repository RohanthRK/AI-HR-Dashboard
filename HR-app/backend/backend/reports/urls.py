"""
URL patterns for reports app
"""
from django.urls import path
from . import views

urlpatterns = [
    # reports CRUD
    path('', views.list_reports, name='list_reports'),  # GET
    path('new/', views.create_report, name='create_report'),  # POST
    path('<str:report_id>/', views.get_report, name='get_report'),  # GET
    path('<str:report_id>/update/', views.update_report, name='update_report'),  # PUT
    path('<str:report_id>/partial/', views.partial_update_report, name='partial_update_report'),  # PATCH
    path('<str:report_id>/delete/', views.delete_report, name='delete_report'),  # DELETE
]
