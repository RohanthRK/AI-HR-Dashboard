"""
URL patterns for auth_app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('users/', views.get_users, name='get_users'),
    path('users/<str:user_id>/', views.update_user, name='update_user'),
    path('users/<str:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/<str:user_id>/reset-password/', views.reset_password, name='reset_password'),
    path('roles/', views.roles_handler, name='roles_handler'),
    path('roles/<str:role_id>/', views.role_detail_handler, name='role_detail_handler'),
]