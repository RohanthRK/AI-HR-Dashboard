from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_projects, name='list_projects'),
    path('new/', views.create_project, name='create_project'),
    path('<str:project_id>/', views.get_project, name='get_project'),
    path('<str:project_id>/update/', views.update_project, name='update_project'),
    path('<str:project_id>/delete/', views.delete_project, name='delete_project'),
]
