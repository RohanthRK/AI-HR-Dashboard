"""
URL patterns for notifications app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_notifications, name='list_notifications'),
    path('count/', views.unread_count, name='unread_count'),
    path('read-all/', views.mark_all_read, name='mark_all_read'),
    path('clear/', views.clear_read, name='clear_read_notifications'),
    path('<str:notification_id>/read/', views.mark_read, name='mark_notification_read'),
    path('<str:notification_id>/', views.delete_notification, name='delete_notification'),
]
