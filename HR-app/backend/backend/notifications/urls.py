"""
URL patterns for notifications app
"""
from django.urls import path
from . import views

urlpatterns = [
    # notifications CRUD
    path('', views.list_notifications, name='list_notifications'),  # GET
    path('new/', views.create_notification, name='create_notification'),  # POST
    path('<str:notification_id>/', views.get_notification, name='get_notification'),  # GET
    path('<str:notification_id>/update/', views.update_notification, name='update_notification'),  # PUT
    path('<str:notification_id>/partial/', views.partial_update_notification, name='partial_update_notification'),  # PATCH
    path('<str:notification_id>/delete/', views.delete_notification, name='delete_notification'),  # DELETE
]
