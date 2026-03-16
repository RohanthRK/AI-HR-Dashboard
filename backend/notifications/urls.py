"""
URL patterns for notifications app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_notifications, name='list_notifications'),
] 