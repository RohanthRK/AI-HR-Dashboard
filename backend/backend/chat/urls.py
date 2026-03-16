"""
URL patterns for chat_logs app
"""
from django.urls import path
from . import views

urlpatterns = [
    # chat_logs CRUD
    path('', views.list_chat_logs, name='list_chat_logs'),  # GET
    path('new/', views.create_chat_log, name='create_chat_log'),  # POST
    path('<str:chat_log_id>/', views.get_chat_log, name='get_chat_log'),  # GET
    path('<str:chat_log_id>/update/', views.update_chat_log, name='update_chat_log'),  # PUT
    path('<str:chat_log_id>/partial/', views.partial_update_chat_log, name='partial_update_chat_log'),  # PATCH
    path('<str:chat_log_id>/delete/', views.delete_chat_log, name='delete_chat_log'),  # DELETE
]
