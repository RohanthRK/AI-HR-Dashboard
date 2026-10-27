from django.urls import path

from .views import mongodb_create, mongodb_update, mongodb_list

urlpatterns = [
    path('mongodb_list/', mongodb_list, name='mongodb_list_teams'),
    path('teams/mongodb_create/', mongodb_create, name='mongodb_create_team'),
    path('teams/<str:pk>/mongodb_update/', mongodb_update, name='mongodb_update_team'),
]
