"""
URL patterns for auth_app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('login', views.login, name='login'),
    path('register', views.register, name='register'),
    path('roles', views.get_roles, name='get_roles'),
    path('roles', views.create_role, name='create_role'),
    path('roles/<str:role_id>', views.update_role, name='update_role'),
    path('roles/<str:role_id>', views.delete_role, name='delete_role'),
] 