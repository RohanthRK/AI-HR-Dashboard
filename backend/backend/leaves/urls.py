"""
URL patterns for leaves app
"""
from django.urls import path
from . import views

urlpatterns = [
    # leaves CRUD
    path('', views.list_leaves, name='list_leaves'),  # GET
    path('new/', views.create_leave, name='create_leave'),  # POST
    path('<str:leave_id>/', views.get_leave, name='get_leave'),  # GET
    path('<str:leave_id>/update/', views.update_leave, name='update_leave'),  # PUT
    path('<str:leave_id>/partial/', views.partial_update_leave, name='partial_update_leave'),  # PATCH
    path('<str:leave_id>/delete/', views.delete_leave, name='delete_leave'),  # DELETE
]
