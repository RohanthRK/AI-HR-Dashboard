"""
URL patterns for auth_app
"""
from django.urls import path
from . import views, sso

urlpatterns = [
    path('login/', views.login, name='login'),
    path('sso/providers/', sso.providers, name='sso_providers'),
    path('sso/<str:provider>/login/', sso.sso_login, name='sso_login'),
    path('sso/<str:provider>/callback/', sso.sso_callback, name='sso_callback'),
    path('register/', views.register, name='register'),
    path('refresh/', views.refresh_token, name='refresh_token'),
    path('profile/', views.profile, name='profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('users/', views.get_users, name='get_users'),
    path('users/<str:user_id>/', views.update_user, name='update_user'),
    path('users/<str:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/<str:user_id>/reset-password/', views.reset_password, name='reset_password'),
    path('roles/', views.roles_handler, name='roles_handler'),
    path('roles/<str:role_id>/', views.role_detail_handler, name='role_detail_handler'),
]